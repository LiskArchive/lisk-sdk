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
const { promisify } = require('util');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const { convertErrorsToString } = require('../helpers/error_handlers');
const jobsQueue = require('../helpers/jobs_queue');
const slots = require('../helpers/slots');
const definitions = require('../schema/definitions');
require('colors');

// Private fields
let components;
let modules;
let library;
let self;
const { ACTIVE_DELEGATES } = global.constants;
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
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			network: scope.network,
			schema: scope.schema,
			sequence: scope.sequence,
			bus: scope.bus,
			genesisBlock: scope.genesisBlock,
			balancesSequence: scope.balancesSequence,
			logic: {
				account: scope.logic.account,
				peers: scope.logic.peers,
				initTransaction: scope.logic.initTransaction,
			},
			config: {
				loading: {
					loadPerIteration: scope.config.loading.loadPerIteration,
					rebuildUpToRound: scope.config.loading.rebuildUpToRound,
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

		// On App Ready
		library.channel.once('network:bootstrap', () => {
			self.onNetworkReady();
		});

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
 * Cancels timers based on input parameter and private constant syncIntervalId
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
			library.channel.publish('chain:loader:sync', {
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
 * Loads signatures from network.
 * Processes each signature from the network.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.getSignaturesFromNetwork = async function() {
	library.logger.info('Loading signatures from the network');

	// TODO: Add target module to procedure name. E.g. chain:getSignatures
	const { data: result } = await library.channel.invoke('network:request', {
		procedure: 'getSignatures',
	});

	const validate = promisify(library.schema.validate.bind(library.schema));
	await validate(result, definitions.WSSignaturesResponse);

	const { signatures } = result;
	const sequenceAdd = promisify(library.sequence.add.bind(library.sequence));

	await sequenceAdd(async addSequenceCb => {
		const signatureCount = signatures.length;
		for (let i = 0; i < signatureCount; i++) {
			const signaturePacket = signatures[i];
			const subSignatureCount = signaturePacket.signatures.length;
			for (let j = 0; j < subSignatureCount; j++) {
				const signature = signaturePacket.signatures[j];

				const processSignature = promisify(
					modules.multisignatures.getTransactionAndProcessSignature.bind(
						modules.multisignatures
					)
				);
				// eslint-disable-next-line no-await-in-loop
				await processSignature({
					signature,
					transactionId: signature.transactionId,
				});
			}
		}
		addSequenceCb();
	});
};

/**
 * Loads transactions from the network:
 * - Validates each transaction from the network and applies a penalty if invalid.
 * - Calls processUnconfirmedTransaction for each transaction.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 * @todo Missing error propagation when calling balancesSequence.add
 */
__private.getTransactionsFromNetwork = async function() {
	library.logger.info('Loading transactions from the network');

	// TODO: Add target module to procedure name. E.g. chain:getTransactions
	const { data: result } = await library.channel.invoke('network:request', {
		procedure: 'getTransactions',
	});

	const validate = promisify(library.schema.validate.bind(library.schema));
	await validate(result, definitions.WSTransactionsResponse);

	const transactions = result.transactions.map(tx =>
		library.logic.initTransaction.fromJson(tx)
	);

	try {
		const {
			transactionsResponses,
		} = modules.processTransactions.validateTransactions(transactions);
		const invalidTransactionResponse = transactionsResponses.find(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);
		if (invalidTransactionResponse) {
			throw invalidTransactionResponse.errors;
		}
	} catch (errors) {
		const error =
			Array.isArray(errors) && errors.length > 0 ? errors[0] : errors;
		library.logger.debug('Transaction normalization failed', {
			id: error.id,
			err: error.toString(),
			module: 'loader',
		});
		throw error;
	}

	const transactionCount = transactions.length;
	for (let i = 0; i < transactionCount; i++) {
		const transaction = transactions[i];

		const balancesSequenceAdd = promisify(
			library.balancesSequence.add.bind(library.balancesSequence)
		);
		try {
			/* eslint-disable-next-line */
			await balancesSequenceAdd(addSequenceCb => {
				transaction.bundled = true;
				modules.transactions.processUnconfirmedTransaction(
					transaction,
					false,
					addSequenceCb
				);
			});
		} catch (error) {
			library.logger.error(error);
			throw error;
		}
	}
};

/**
 * Loads blockchain upon application start:
 * 1. Checks mem tables:
 * - count blocks from `blocks` table
 * - get genesis block from `blocks` table
 * - count accounts from `mem_accounts` table by block id
 * - get rounds from `mem_round`
 * 2. Matches genesis block with database.
 * 3. Verifies rebuild mode.
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
					library.logger.error(convertErrorsToString(err));
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
				throw new Error('Failed to match genesis block with database');
			}
		}
	}

	library.storage.entities.Block.begin('loader:checkMemTables', checkMemTables)
		.then(async result => {
			const [blocksCount, getGenesisBlock, getMemRounds] = result;

			library.logger.info(`Blocks ${blocksCount}`);

			const round = slots.calcRound(blocksCount);

			if (blocksCount === 1) {
				return reload(blocksCount);
			}

			matchGenesisBlock(getGenesisBlock);

			if (library.config.loading.rebuildUpToRound !== null) {
				return __private.rebuildAccounts(blocksCount);
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
								'Your block chain is invalid. Please rebuild using rebuilding mode.'
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
							"Your block chain can't be recovered. Please rebuild using rebuilding mode."
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
 * Rebuilding mode - performs rebuild of accounts states from blockchain data
 *
 * @private
 * @emits rebuildFinished
 * @throws {Error} When blockchain is shorter than one round of blocks
 */
__private.rebuildAccounts = height => {
	library.logger.info('Rebuild mode enabled');

	// Single round contains amount of blocks equal to number of active delegates
	if (height < ACTIVE_DELEGATES) {
		throw new Error(
			'Unable to rebuild, blockchain should contain at least one round of blocks'
		);
	}

	const rebuildUpToRound = library.config.loading.rebuildUpToRound;
	// Negative number not possible as `commander` does not recognize this as valid flag (throws error)
	if (
		Number.isNaN(parseInt(rebuildUpToRound)) ||
		parseInt(rebuildUpToRound) < 0
	) {
		throw new Error(
			'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
		);
	}

	const totalRounds = Math.floor(height / ACTIVE_DELEGATES);
	const targetRound =
		parseInt(rebuildUpToRound) === 0
			? totalRounds
			: Math.min(totalRounds, parseInt(rebuildUpToRound));
	const targetHeight = targetRound * ACTIVE_DELEGATES;

	library.logger.info(
		`Rebuilding to end of round: ${targetRound}, height: ${targetHeight}`
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
		__private.rebuildFinished
	);
};

/**
 * Executed when rebuild process is complete.
 *
 * @private
 * @param {err} Error if any
 * @emits cleanup
 */
__private.rebuildFinished = err => {
	if (err) {
		library.logger.error('Rebuilding failed', err);
	} else {
		library.logger.info('Rebuilding finished');
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
	// Number of failed attempts to load from the network.
	let failedAttemptsToLoad = 0;
	// If True, own node's db contains all the blocks from the last block request.
	let loaded = false;

	async.whilst(
		() => !loaded && failedAttemptsToLoad < 5,
		whilstCb => {
			async.waterfall(
				[
					function loadBlocksFromNetwork(waterCb) {
						const lastBlock = modules.blocks.lastBlock.get();
						modules.blocks.process.loadBlocksFromNetwork(
							(loadBlocksFromNetworkErr, lastValidBlock) => {
								if (loadBlocksFromNetworkErr) {
									// If comparison failed and current consensus is low - perform chain recovery
									if (modules.peers.isPoorConsensus()) {
										library.logger.debug(
											'Perform chain recovery due to poor consensus'
										);
										return modules.blocks.chain.recoverChain(recoveryError => {
											if (recoveryError) {
												waterCb(
													`Failed chain recovery after failing to load blocks while network consensus was low. ${recoveryError}`
												);
											}
											waterCb(
												`Failed chain recovery after failing to load blocks. ${loadBlocksFromNetworkErr}`
											);
										});
									}
									library.logger.error(
										'Failed to process block from network',
										loadBlocksFromNetworkErr
									);
									return waterCb(
										`Failed to load blocks from the network. ${loadBlocksFromNetworkErr}`
									);
								}
								__private.blocksToSync = lastValidBlock.height;
								loaded = lastValidBlock.id === lastBlock.id;
								// Reset counter after a batch of blocks was successfully loaded from the network
								failedAttemptsToLoad = 0;
								return waterCb();
							}
						);
					},
				],
				waterErr => {
					if (waterErr) {
						failedAttemptsToLoad += 1;
						library.logger.error(convertErrorsToString(waterErr));
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
	if (components.cache.options.enabled) {
		components.cache.disable();
	}

	__private.isActive = true;
	__private.syncTrigger(true);

	async.series(
		{
			async calculateConsensusBefore() {
				const consensus = await modules.peers.calculateConsensus();
				return library.logger.debug(
					`Establishing broadhash consensus before sync: ${consensus} %`
				);
			},
			loadBlocksFromNetwork(seriesCb) {
				return __private.loadBlocksFromNetwork(seriesCb);
			},
			updateApplicationState(seriesCb) {
				return modules.blocks
					.calculateNewBroadhash()
					.then(({ broadhash, height }) => {
						// Listen for the update of step to move to next step
						library.channel.once('app:state:updated', () => {
							seriesCb();
						});

						// Update our application state: broadhash and height
						return library.channel.invoke('app:updateApplicationState', {
							broadhash,
							height,
						});
					})
					.catch(seriesCb);
			},
			async calculateConsensusAfter() {
				const consensus = await modules.peers.calculateConsensus();
				return library.logger.debug(
					`Establishing broadhash consensus after sync: ${consensus} %`
				);
			},
		},
		err => {
			__private.isActive = false;
			__private.syncTrigger(false);
			__private.blocksToSync = 0;

			library.logger.info('Finished sync');
			if (components.cache.options.enabled) {
				components.cache.enable();
			}
			return setImmediate(cb, err);
		}
	);
};

// Public methods

/**
 * Checks if private constant syncIntervalId has value.
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
 * Checks private constant loaded.
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
Loader.prototype.onNetworkReady = function() {
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
							__private.getTransactionsFromNetwork,
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
							__private.getSignaturesFromNetwork,
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
 * It assigns components & modules from scope to private constants.
 *
 * @param {components, modules} scope modules & components
 * @returns {function} Calling __private.loadBlockChain
 * @todo Add description for the params
 */
Loader.prototype.onBind = function(scope) {
	components = {
		cache: scope.components ? scope.components.cache : undefined,
	};

	modules = {
		transactions: scope.modules.transactions,
		blocks: scope.modules.blocks,
		peers: scope.modules.peers,
		rounds: scope.modules.rounds,
		multisignatures: scope.modules.multisignatures,
		processTransactions: scope.modules.processTransactions,
	};

	__private.loadBlockChain();
};

/**
 * Sets private constant loaded to true.
 */
Loader.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Sets private constant loaded to false.
 *
 * @param {function} cb
 * @todo Add description for the params
 */
Loader.prototype.cleanup = function() {
	__private.loaded = false;
};

// Export
module.exports = Loader;
