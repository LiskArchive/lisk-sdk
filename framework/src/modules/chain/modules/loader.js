/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const async = require('async');
const jobsQueue = require('../helpers/jobs_queue.js');
const slots = require('../helpers/slots.js');

require('colors');

// Private fields
let components;
let modules;
let definitions;
let library;
let self;
const { ACTIVE_DELEGATES, MAX_PEERS } = global.constants;
const __private = {};

__private.loaded = false;
__private.isActive = false;
__private.lastBlock = null;
__private.genesisBlock = null;
__private.total = 0;
__private.blocksToSync = 0;
__private.syncIntervalId = null;
__private.syncInterval = 10000;
__private.retries = 5;

/**
 * Main loader methods. Initializes library with scope content.
 * Calls private function initialize.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires helpers/jobs_queue
 * @requires helpers/slots
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Loader {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
			storage: scope.storage,
			network: scope.network,
			schema: scope.schema,
			sequence: scope.sequence,
			bus: scope.bus,
			genesisBlock: scope.genesisBlock,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
				account: scope.logic.account,
				peers: scope.logic.peers,
			},
			config: {
				loading: {
					loadPerIteration: scope.config.loading.loadPerIteration,
					snapshotRound: scope.config.loading.snapshotRound,
				},
				syncing: {
					active: scope.config.syncing.active,
				},
			},
		};
		self = this;

		__private.initialize();
		__private.lastBlock = library.genesisBlock;
		__private.genesisBlock = library.genesisBlock;

		setImmediate(cb, null, self);
	}
}

// Private methods
/**
 * Sets private network object with height 0 and peers empty array.
 *
 * @private
 */
__private.initialize = function() {
	__private.network = {
		height: 0, // Network height
		peers: [], // "Good" peers and with height close to network height
	};
};

/**
 * Cancels timers based on input parameter and private constiable syncIntervalId
 * or Sync trigger by sending a socket signal with 'loader/sync' and setting
 * next sync with 1000 milliseconds.
 *
 * @private
 * @param {boolean} turnOn
 * @emits loader/sync
 * @todo Add description for the params
 */
__private.syncTrigger = function(turnOn) {
	if (turnOn === false && __private.syncIntervalId) {
		library.logger.trace('Clearing sync interval');
		clearTimeout(__private.syncIntervalId);
		__private.syncIntervalId = null;
	}
	if (turnOn === true && !__private.syncIntervalId) {
		library.logger.trace('Setting sync interval');
		setImmediate(function nextSyncTrigger() {
			library.logger.trace('Sync trigger');
			library.network.io.sockets.emit('loader/sync', {
				blocks: __private.blocksToSync,
				height: modules.blocks.lastBlock.get().height,
			});
			__private.syncIntervalId = setTimeout(nextSyncTrigger, 1000);
		});
	}
};

/**
 * Syncs timer trigger.
 *
 * @private
 * @todo Add @returns tag
 */
__private.syncTimer = function() {
	library.logger.trace('Setting sync timer');

	/**
	 * Description of nextSync.
	 *
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	function nextSync(cb) {
		library.logger.trace('Sync timer trigger', {
			loaded: __private.loaded,
			syncing: self.syncing(),
			last_receipt: modules.blocks.lastReceipt.get(),
		});

		if (
			__private.loaded &&
			!self.syncing() &&
			modules.blocks.lastReceipt.isStale()
		) {
			return library.sequence.add(
				sequenceCb => {
					__private.sync(sequenceCb);
				},
				err => {
					if (err) {
						library.logger.error('Sync timer', err);
					}
					return setImmediate(cb);
				}
			);
		}
		return setImmediate(cb);
	}

	return jobsQueue.register(
		'loaderSyncTimer',
		nextSync,
		__private.syncInterval
	);
};

/**
 * Gets a random peer and loads signatures from network.
 * Processes each signature from peer.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.loadSignatures = function(cb) {
	async.waterfall(
		[
			function(waterCb) {
				self.getRandomPeerFromNetwork((getRandomPeerFromNetworkErr, peer) => {
					if (getRandomPeerFromNetworkErr) {
						return setImmediate(waterCb, getRandomPeerFromNetworkErr);
					}
					return setImmediate(waterCb, null, peer);
				});
			},
			function(peer, waterCb) {
				library.logger.info(`Loading signatures from: ${peer.string}`);
				peer.rpc.getSignatures((err, res) => {
					if (err) {
						modules.peers.remove(peer);
						return setImmediate(waterCb, err);
					}
					return library.schema.validate(
						res,
						definitions.WSSignaturesResponse,
						validateErr => setImmediate(waterCb, validateErr, res.signatures)
					);
				});
			},
			function(signatures, waterCb) {
				library.sequence.add(addSequenceCb => {
					async.eachSeries(
						signatures,
						(signature, eachSeriesCb) => {
							async.eachSeries(
								signature.signatures,
								(s, secondEachSeriesCb) => {
									modules.multisignatures.processSignature(
										{
											signature: s,
											transactionId: signature.transactionId,
										},
										err => setImmediate(secondEachSeriesCb, err)
									);
								},
								eachSeriesCb
							);
						},
						addSequenceCb
					);
				}, waterCb);
			},
		],
		err => setImmediate(cb, err)
	);
};

/**
 * Gets a random peer and loads transactions from network:
 * - Validates each transaction from peer and remove peer if invalid.
 * - Calls processUnconfirmedTransaction for each transaction.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 * @todo Missing error propagation when calling balancesSequence.add
 */
__private.loadTransactions = function(cb) {
	async.waterfall(
		[
			function(waterCb) {
				self.getRandomPeerFromNetwork((getRandomPeerFromNetworkErr, peer) => {
					if (getRandomPeerFromNetworkErr) {
						return setImmediate(waterCb, getRandomPeerFromNetworkErr);
					}
					return setImmediate(waterCb, null, peer);
				});
			},
			function(peer, waterCb) {
				library.logger.info(`Loading transactions from: ${peer.string}`);
				peer.rpc.getTransactions((err, res) => {
					if (err) {
						modules.peers.remove(peer);
						return setImmediate(waterCb, err);
					}
					return library.schema.validate(
						res,
						definitions.WSTransactionsResponse,
						validateErr => {
							if (validateErr) {
								return setImmediate(waterCb, validateErr[0].message);
							}
							return setImmediate(waterCb, null, peer, res.transactions);
						}
					);
				});
			},
			function(peer, transactions, waterCb) {
				async.eachSeries(
					transactions,
					(transaction, eachSeriesCb) => {
						const id = transaction ? transactions.id : 'null';

						try {
							transaction = library.logic.transaction.objectNormalize(
								transaction
							);
						} catch (e) {
							library.logger.debug('Transaction normalization failed', {
								id,
								err: e.toString(),
								module: 'loader',
								transaction,
							});

							library.logger.warn(
								['Transaction', id, 'is not valid, peer removed'].join(' '),
								peer.string
							);
							modules.peers.remove(peer);

							return setImmediate(eachSeriesCb, e);
						}

						return setImmediate(eachSeriesCb);
					},
					err => setImmediate(waterCb, err, transactions)
				);
			},
			function(transactions, waterCb) {
				async.eachSeries(
					transactions,
					(transaction, eachSeriesCb) => {
						library.balancesSequence.add(
							addSequenceCb => {
								transaction.bundled = true;
								modules.transactions.processUnconfirmedTransaction(
									transaction,
									false,
									addSequenceCb
								);
							},
							err => {
								if (err) {
									// TODO: Validate if error propagation required
									library.logger.debug(err);
								}
								return setImmediate(eachSeriesCb);
							}
						);
					},
					waterCb
				);
			},
		],
		err => setImmediate(cb, err)
	);
};

/**
 * Loads blockchain upon application start:
 * 1. Checks mem tables:
 * - count blocks from `blocks` table
 * - get genesis block from `blocks` table
 * - count accounts from `mem_accounts` table by block id
 * - get rounds from `mem_round`
 * 2. Matches genesis block with database.
 * 3. Verifies snapshot mode.
 * 4. Recreates memory tables when neccesary:
 *  - Calls logic.account to resetMemTables
 *  - Calls block to load block. When blockchain ready emits a bus message.
 * 5. Detects orphaned blocks in `mem_accounts` and gets delegates.
 * 6. Loads last block and emits a bus message blockchain is ready.
 *
 * @private
 * @emits exit
 * @throws {string} On failure to match genesis block with database.
 * @todo Add @returns tag
 */
__private.loadBlockChain = function() {
	let offset = 0;
	const limit = Number(library.config.loading.loadPerIteration) || 1000;

	/**
	 * Description of load.
	 *
	 * @todo Add @param tags
	 * @todo Add description for the function
	 */
	function load(count) {
		__private.total = count;
		async.series(
			{
				resetMemTables(seriesCb) {
					library.logic.account.resetMemTables(err => {
						if (err) {
							throw err;
						} else {
							return setImmediate(seriesCb);
						}
					});
				},
				loadBlocksOffset(seriesCb) {
					async.until(
						() => count < offset,
						cb => {
							if (count > 1) {
								library.logger.info(
									`Rebuilding blockchain, current block height: ${offset + 1}`
								);
							}
							modules.blocks.process.loadBlocksOffset(
								limit,
								offset,
								(err, lastBlock) => {
									if (err) {
										return setImmediate(cb, err);
									}

									offset += limit;
									__private.lastBlock = lastBlock;

									return setImmediate(cb);
								}
							);
						},
						err => setImmediate(seriesCb, err)
					);
				},
			},
			err => {
				if (err) {
					library.logger.error(err);
					if (err.block) {
						library.logger.error(`Blockchain failed at: ${err.block.height}`);
						modules.blocks.chain.deleteFromBlockId(err.block.id, () => {
							library.logger.error('Blockchain clipped');
							library.bus.message('blockchainReady');
						});
					}
				} else {
					library.logger.info('Blockchain ready');
					library.bus.message('blockchainReady');
				}
			}
		);
	}

	/**
	 * Description of reload.
	 *
	 * @todo Add @returns and @param tags
	 * @todo Add description for the function
	 */
	function reload(count, message) {
		if (message) {
			library.logger.warn(message);
			library.logger.warn('Recreating memory tables');
		}

		return load(count);
	}

	/**
	 * Description of checkMemTables.
	 *
	 * @todo Add @returns and @param tags
	 * @todo Add description for the function
	 */
	function checkMemTables(t) {
		const promises = [
			library.storage.entities.Block.count({}, {}, t),
			library.storage.entities.Block.getOne({ height: 1 }, {}, t),
			library.storage.entities.Round.getUniqueRounds(t),
			library.storage.entities.Account.countDuplicatedDelegates(t),
		];

		return t.batch(promises);
	}

	/**
	 * Description of matchGenesisBlock.
	 *
	 * @todo Add @throws and @param tags
	 * @todo Add description for the function
	 */
	function matchGenesisBlock(row) {
		if (row) {
			const matched =
				row.id === __private.genesisBlock.block.id &&
				row.payloadHash.toString('hex') ===
					__private.genesisBlock.block.payloadHash &&
				row.blockSignature.toString('hex') ===
					__private.genesisBlock.block.blockSignature;
			if (matched) {
				library.logger.info('Genesis block matched with database');
			} else {
				throw 'Failed to match genesis block with database';
			}
		}
	}

	library.storage.entities.Block.begin('loader:checkMemTables', checkMemTables)
		.then(async result => {
			const [
				blocksCount,
				getGenesisBlock,
				getMemRounds,
				duplicatedDelegatesCount,
			] = result;

			library.logger.info(`Blocks ${blocksCount}`);

			const round = slots.calcRound(blocksCount);

			if (blocksCount === 1) {
				return reload(blocksCount);
			}

			matchGenesisBlock(getGenesisBlock);

			if (library.config.loading.snapshotRound) {
				return __private.createSnapshot(blocksCount);
			}

			const unapplied = getMemRounds.filter(row => row.round !== round);

			if (unapplied.length > 0) {
				library.logger.error('Detected unapplied rounds in mem_round', {
					currentHeight: blocksCount,
					currentRound: round,
					unappliedRounds: unapplied,
				});

				return reload(blocksCount, 'Detected unapplied rounds in mem_round');
			}

			if (duplicatedDelegatesCount > 0) {
				library.logger.error(
					'Delegates table corrupted with duplicated entries'
				);
				return process.emit('exit');
			}

			await library.storage.entities.Account.resetUnconfirmedState();
			const delegatesPublicKeys = await library.storage.entities.Account.get(
				{ isDelegate: true },
				{ limit: null }
			).then(accounts => accounts.map(account => account.publicKey));

			if (delegatesPublicKeys.length === 0) {
				return reload(blocksCount, 'No delegates found');
			}

			return modules.blocks.utils.loadLastBlock((err, block) => {
				if (err) {
					return reload(blocksCount, err || 'Failed to load last block');
				}

				__private.lastBlock = block;

				return __private.validateOwnChain(validateOwnChainError => {
					if (validateOwnChainError) {
						throw validateOwnChainError;
					}

					library.logger.info('Blockchain ready');
					library.bus.message('blockchainReady');
				});
			});
		})
		.catch(err => {
			library.logger.error(err.stack || err);
			return process.emit('exit');
		});
};

/**
 * Validate given block
 *
 * @param {object} block
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 */
__private.validateBlock = (blockToVerify, cb) => {
	library.logger.info(
		`Loader->validateBlock Validating block ${blockToVerify.id} at height ${
			blockToVerify.height
		}`
	);
	library.logger.debug(JSON.stringify(blockToVerify));

	const lastBlock = modules.blocks.lastBlock.get();

	modules.blocks.utils.loadBlockByHeight(
		blockToVerify.height - 1,
		(secondLastBlockError, secondLastBlockToVerify) => {
			if (secondLastBlockError) {
				return setImmediate(cb, secondLastBlockError);
			}

			// Set the block temporarily for block verification
			modules.blocks.lastBlock.set(secondLastBlockToVerify);
			library.logger.debug(
				`Loader->validateBlock Setting temporarily last block to height ${
					secondLastBlockToVerify.height
				}.`
			);
			const result = modules.blocks.verify.verifyBlock(blockToVerify);

			// Revert last block changes
			modules.blocks.lastBlock.set(lastBlock);
			library.logger.debug(
				`Loader->validateBlock Reverting last block to height ${
					lastBlock.height
				}.`
			);

			if (result.verified) {
				library.logger.info(
					`Loader->validateBlock Validating block succeed for ${
						blockToVerify.id
					} at height ${blockToVerify.height}.`
				);
				return setImmediate(cb, null);
			}
			library.logger.error(
				`Loader->validateBlock Validating block failed for ${
					blockToVerify.id
				} at height ${blockToVerify.height}.`,
				result.errors
			);
			return setImmediate(cb, result.errors);
		}
	);
};

/**
 * Validate own block chain before startup
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 */
__private.validateOwnChain = cb => {
	// Validation should be done backward starting from higher height to the lower height
	const currentBlock = modules.blocks.lastBlock.get();
	const currentHeight = currentBlock.height;
	const currentRound = slots.calcRound(currentHeight);
	const secondLastRound = currentRound - 2;

	// Validate till the end height of second last round
	let validateTillHeight;

	if (secondLastRound < 1) {
		// Skip the genesis block validation
		validateTillHeight = 2;
	} else {
		// Till last block of second last round
		validateTillHeight = slots.calcRoundEndHeight(secondLastRound);
	}

	// Validate the top most block
	const validateCurrentBlock = validateCurrentBlockCb => {
		library.logger.info(
			`Validating current block with height ${currentHeight}`
		);

		__private.validateBlock(currentBlock, validateBlockErr => {
			if (!validateBlockErr) {
				library.logger.info(
					`Finished validating the chain. You are at height ${
						modules.blocks.lastBlock.get().height
					}.`
				);
			}
			return setImmediate(validateCurrentBlockCb, validateBlockErr);
		});
	};

	const validateStartBlock = validateStartBlockCb => {
		library.logger.info(
			`Validating last block of second last round with height ${validateTillHeight}`
		);

		modules.blocks.utils.loadBlockByHeight(
			validateTillHeight,
			(_lastBlockError, startBlock) => {
				__private.validateBlock(startBlock, validateBlockErr => {
					if (validateBlockErr) {
						library.logger.error(
							`There are more than ${currentHeight -
								validateTillHeight} invalid blocks. Can't delete those to recover the chain.`
						);
						return setImmediate(
							validateStartBlockCb,
							new Error(
								'Your block chain is invalid. Please rebuild from snapshot.'
							)
						);
					}

					return setImmediate(validateStartBlockCb, null);
				});
			}
		);
	};

	const deleteInvalidBlocks = deleteInvalidBlocksCb => {
		async.doDuring(
			// Iterator
			doDuringCb => {
				modules.blocks.chain.deleteLastBlock(doDuringCb);
			},
			// Test condition
			(_deleteLastBlockStatus, testCb) => {
				__private.validateBlock(
					modules.blocks.lastBlock.get(),
					validateError => setImmediate(testCb, null, !!validateError) // Continue deleting if there is an error
				);
			},
			doDuringErr => {
				if (doDuringErr) {
					library.logger.error(
						'Error occurred during deleting invalid blocks',
						doDuringErr
					);
					return setImmediate(
						deleteInvalidBlocksCb,
						new Error(
							"Your block chain can't be recovered. Please rebuild from snapshot."
						)
					);
				}

				library.logger.info(
					`Finished validating the chain. You are at height ${
						modules.blocks.lastBlock.get().height
					}.`
				);
				return setImmediate(deleteInvalidBlocksCb, null);
			}
		);
	};

	validateCurrentBlock(currentBlockError => {
		// If current block is valid no need to check further
		if (!currentBlockError) {
			return setImmediate(cb, null);
		}

		return validateStartBlock(startBlockError => {
			// If start block is invalid can't proceed further
			if (startBlockError) {
				return setImmediate(cb, startBlockError);
			}

			return deleteInvalidBlocks(cb);
		});
	});
};

/**
 * Snapshot creation - performs rebuild of accounts states from blockchain data
 *
 * @private
 * @emits snapshotFinished
 * @throws {Error} When blockchain is shorter than one round of blocks
 */
__private.createSnapshot = height => {
	library.logger.info('Snapshot mode enabled');

	// Single round contains amount of blocks equal to number of active delegates
	if (height < ACTIVE_DELEGATES) {
		throw new Error(
			'Unable to create snapshot, blockchain should contain at least one round of blocks'
		);
	}

	const snapshotRound = library.config.loading.snapshotRound;
	const totalRounds = Math.floor(height / ACTIVE_DELEGATES);
	const targetRound = Number.isNaN(snapshotRound)
		? totalRounds
		: Math.min(totalRounds, snapshotRound);
	const targetHeight = targetRound * ACTIVE_DELEGATES;

	library.logger.info(
		`Snapshotting to end of round: ${targetRound}, height: ${targetHeight}`
	);

	let currentHeight = 1;
	async.series(
		{
			resetMemTables(seriesCb) {
				library.logic.account.resetMemTables(seriesCb);
			},
			loadBlocksOffset(seriesCb) {
				async.until(
					() => targetHeight < currentHeight,
					untilCb => {
						library.logger.info(
							`Rebuilding accounts states, current round: ${slots.calcRound(
								currentHeight
							)}, height: ${currentHeight}`
						);
						modules.blocks.process.loadBlocksOffset(
							ACTIVE_DELEGATES,
							currentHeight,
							loadBlocksOffsetErr => {
								currentHeight += ACTIVE_DELEGATES;
								return setImmediate(untilCb, loadBlocksOffsetErr);
							}
						);
					},
					seriesCb
				);
			},
			truncateBlocks(seriesCb) {
				library.storage.entities.Block.delete({ height_gt: targetHeight })
					.then(() => setImmediate(seriesCb))
					.catch(err => setImmediate(seriesCb, err));
			},
		},
		__private.snapshotFinished
	);
};

/**
 * Executed when snapshot creation is complete.
 *
 * @private
 * @param {err} Error if any
 * @emits cleanup
 */
__private.snapshotFinished = err => {
	if (err) {
		library.logger.error('Snapshot creation failed', err);
	} else {
		library.logger.info('Snapshot creation finished');
	}
	process.emit('cleanup', err);
};

/**
 * Loads blocks from network.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.loadBlocksFromNetwork = function(cb) {
	// Number of failed attempts to load from peers.
	let failedAttemptsToLoad = 0;
	// If True, own node's db contains same number of blocks than the asked peer.
	let loaded = false;

	async.whilst(
		() => !loaded && failedAttemptsToLoad < 5,
		whilstCb => {
			async.waterfall(
				[
					function getRandomPeerFromNetwork(waterCb) {
						self.getRandomPeerFromNetwork(
							(getRandomPeerFromNetworkErr, peer) => {
								if (getRandomPeerFromNetworkErr) {
									return waterCb('Failed to get random peer from network');
								}
								__private.blocksToSync = peer.height;
								const lastBlock = modules.blocks.lastBlock.get();
								return waterCb(null, peer, lastBlock);
							}
						);
					},
					function getCommonBlock(peer, lastBlock, waterCb) {
						// No need to call getCommonBlock if height is Genesis block
						if (lastBlock.height === 1) {
							return waterCb(null, peer, lastBlock);
						}

						library.logger.info(
							`Looking for common block with: ${peer.string}`
						);
						return modules.blocks.process.getCommonBlock(
							peer,
							lastBlock.height,
							(getCommonBlockErr, commonBlock) => {
								if (getCommonBlockErr) {
									return waterCb(getCommonBlockErr.toString());
								}
								if (!commonBlock) {
									return waterCb(
										`Failed to find common block with: ${peer.string}`
									);
								}
								library.logger.info(
									`Found common block: ${commonBlock.id} with: ${peer.string}`
								);
								return waterCb(null, peer, lastBlock);
							}
						);
					},
					function loadBlocksFromPeer(peer, lastBlock, waterCb) {
						modules.blocks.process.loadBlocksFromPeer(
							peer,
							(loadBlocksFromPeerErr, lastValidBlock) => {
								if (loadBlocksFromPeerErr) {
									return waterCb(`Failed to load blocks from: ${peer.string}`);
								}
								loaded = lastValidBlock.id === lastBlock.id;
								// Reset counter after a batch of blocks was successfully loaded from a peer
								failedAttemptsToLoad = 0;
								return waterCb();
							}
						);
					},
				],
				waterErr => {
					if (waterErr) {
						failedAttemptsToLoad += 1;
						library.logger.error(waterErr);
					}
					whilstCb();
				}
			);
		},
		() => setImmediate(cb)
	);
};

/**
 * Performs sync operation:
 * - Undoes unconfirmed transactions.
 * - Establishes broadhash consensus before sync.
 * - Performs sync operation: loads blocks from network.
 * - Update headers: broadhash and height
 * - Notify remote peers about our new headers
 * - Establishes broadhash consensus after sync.
 * - Applies unconfirmed transactions.
 *
 * @private
 * @param {function} cb
 * @todo Check err actions
 * @todo Add description for the params
 */
__private.sync = function(cb) {
	library.logger.info('Starting sync');
	if (components.cache) {
		components.cache.disable();
	}

	__private.isActive = true;
	__private.syncTrigger(true);

	async.series(
		{
			calculateConsensusBefore(seriesCb) {
				library.logger.debug(
					`Establishing broadhash consensus before sync: ${modules.peers.calculateConsensus()} %`
				);
				return seriesCb();
			},
			loadBlocksFromNetwork(seriesCb) {
				return __private.loadBlocksFromNetwork(seriesCb);
			},
			updateSystemHeaders(seriesCb) {
				// Update our own headers: broadhash and height
				components.system.update(seriesCb);
			},
			broadcastHeaders(seriesCb) {
				// Notify all remote peers about our new headers
				modules.transport.broadcastHeaders(seriesCb);
			},
			calculateConsensusAfter(seriesCb) {
				library.logger.debug(
					`Establishing broadhash consensus after sync: ${modules.peers.calculateConsensus()} %`
				);
				return seriesCb();
			},
		},
		err => {
			__private.isActive = false;
			__private.syncTrigger(false);
			__private.blocksToSync = 0;

			library.logger.info('Finished sync');
			if (components.cache) {
				components.cache.enable();
			}
			return setImmediate(cb, err);
		}
	);
};

/**
 * Establishes a list of "good" peers.
 *
 * @private
 * @param {array<Peer>} peers
 * @returns {Object} height number, peers array
 * @todo Add description for the params
 */
Loader.prototype.findGoodPeers = function(peers) {
	const lastBlockHeight = modules.blocks.lastBlock.get().height;
	library.logger.trace('Good peers - received', { count: peers.length });

	peers = peers.filter(
		item =>
			// Remove unreachable peers or heights below last block height
			item && item.height >= lastBlockHeight
	);

	library.logger.trace('Good peers - filtered', { count: peers.length });

	// No peers found
	if (peers.length === 0) {
		return { height: 0, peers: [] };
	}
	// Order peers by descending height
	peers = peers.sort((a, b) => b.height - a.height);

	const histogram = {};
	let max = 0;
	let height;

	// Aggregate height by 2. TODO: To be changed if node latency increases?
	const aggregation = 2;

	// Perform histogram calculation, together with histogram maximum
	Object.keys(peers).forEach(key => {
		const val = parseInt(peers[key].height / aggregation) * aggregation;
		histogram[val] = (histogram[val] ? histogram[val] : 0) + 1;

		if (histogram[val] > max) {
			max = histogram[val];
			height = val;
		}
	});

	// Perform histogram cut of peers too far from histogram maximum
	peers = peers
		.filter(item => item && Math.abs(height - item.height) < aggregation + 1)
		.map(item => library.logic.peers.create(item));

	library.logger.trace('Good peers - accepted', { count: peers.length });
	library.logger.debug(
		'Good peers',
		peers.map(peer => `${peer.ip}.${peer.wsPort}`)
	);

	return { height, peers };
};

// Public methods
/**
 * Gets a "good" randomPeer from network.
 *
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err, good randomPeer
 * @todo Add description for the params
 */
Loader.prototype.getRandomPeerFromNetwork = function(cb) {
	const peers = library.logic.peers.listRandomConnected({
		limit: MAX_PEERS,
	});
	__private.network = self.findGoodPeers(peers);

	if (!__private.network.peers.length) {
		return setImmediate(cb, 'Failed to find enough good peers');
	}

	const randomPeer =
		__private.network.peers[
			Math.floor(Math.random() * __private.network.peers.length)
		];

	return setImmediate(cb, null, randomPeer);
};

/**
 * Checks if private constiable syncIntervalId has value.
 *
 * @returns {boolean} True if syncIntervalId has value
 */
Loader.prototype.syncing = function() {
	return !!__private.syncIntervalId;
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Loader.prototype.isLoaded = function() {
	return !!modules;
};

/**
 * Checks private constiable loaded.
 *
 * @returns {boolean} False if not loaded
 */
Loader.prototype.loaded = function() {
	return !!__private.loaded;
};

// Events
/**
 * Pulls Transactions and signatures.
 *
 * @returns {function} Calling __private.syncTimer()
 */
Loader.prototype.onPeersReady = function() {
	library.logger.trace('Peers ready', { module: 'loader' });
	// Enforce sync early
	if (library.config.syncing.active) {
		__private.syncTimer();
	}

	setImmediate(() => {
		async.series(
			{
				loadTransactions(seriesCb) {
					if (__private.loaded) {
						return async.retry(
							__private.retries,
							__private.loadTransactions,
							err => {
								if (err) {
									library.logger.error('Unconfirmed transactions loader', err);
								}

								return setImmediate(seriesCb);
							}
						);
					}
					return setImmediate(seriesCb);
				},
				loadSignatures(seriesCb) {
					if (__private.loaded) {
						return async.retry(
							__private.retries,
							__private.loadSignatures,
							err => {
								if (err) {
									library.logger.error('Signatures loader', err);
								}

								return setImmediate(seriesCb);
							}
						);
					}
					return setImmediate(seriesCb);
				},
			},
			err => {
				library.logger.trace('Transactions and signatures pulled', err);
			}
		);
	});
};

/**
 * Assigns needed modules from scope to private modules constiable.
 *
 * @param {modules} scope
 * @returns {function} Calling __private.loadBlockChain
 * @todo Add description for the params
 */
Loader.prototype.onBind = function(scope) {
	components = {
		cache: scope.components ? scope.components.cache : undefined,
		system: scope.components.system,
	};

	modules = {
		transactions: scope.modules.transactions,
		blocks: scope.modules.blocks,
		peers: scope.modules.peers,
		rounds: scope.modules.rounds,
		transport: scope.modules.transport,
		multisignatures: scope.modules.multisignatures,
	};

	definitions = scope.swagger.definitions;

	__private.loadBlockChain();
};

/**
 * Sets private constiable loaded to true.
 */
Loader.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Sets private constiable loaded to false.
 *
 * @param {function} cb
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params
 */
Loader.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Export
module.exports = Loader;
