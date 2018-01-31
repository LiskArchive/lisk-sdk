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

var async = require('async');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobs_queue.js');
var Peer = require('../logic/peer.js');
var slots = require('../helpers/slots.js');

require('colors');

// Private fields
var modules;
var definitions;
var library;
var self;
var __private = {};

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
 * Initializes library with scope content.
 * Calls private function initialize.
 * @memberof module:loader
 * @class
 * @classdesc Main Loader methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Loader(cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		network: scope.network,
		schema: scope.schema,
		sequence: scope.sequence,
		bus: scope.bus,
		genesisblock: scope.genesisblock,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction,
			account: scope.logic.account,
			peers: scope.logic.peers,
		},
		config: {
			loading: {
				verifyOnLoading: scope.config.loading.verifyOnLoading,
				snapshot: scope.config.loading.snapshot,
			},
		},
	};
	self = this;

	__private.initialize();
	__private.genesisBlock = __private.lastBlock = library.genesisblock;

	setImmediate(cb, null, self);
}

// Private methods
/**
 * Sets private network object with height 0 and peers empty array.
 * @private
 */
__private.initialize = function() {
	__private.network = {
		height: 0, // Network height
		peers: [], // "Good" peers and with height close to network height
	};
};

/**
 * Cancels timers based on input parameter and private variable syncIntervalId
 * or Sync trigger by sending a socket signal with 'loader/sync' and setting
 * next sync with 1000 milliseconds.
 * @private
 * @implements {library.network.io.sockets.emit}
 * @implements {modules.blocks.lastBlock.get}
 * @param {boolean} turnOn
 * @emits loader/sync
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
 * @private
 * @implements {modules.blocks.lastReceipt.get}
 * @implements {modules.blocks.lastReceipt.isStale}
 * @implements {Loader.syncing}
 * @implements {library.sequence.add}
 * @implements {async.retry}
 * @implements {__private.initialize}
 */
__private.syncTimer = function() {
	library.logger.trace('Setting sync timer');

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
			library.sequence.add(
				function(sequenceCb) {
					__private.sync(sequenceCb);
				},
				function(err) {
					if (err) {
						library.logger.error('Sync timer', err);
					}
					return setImmediate(cb);
				}
			);
		} else {
			return setImmediate(cb);
		}
	}

	jobsQueue.register('loaderSyncTimer', nextSync, __private.syncInterval);
};

/**
 * Gets a random peer and loads signatures from network.
 * Processes each signature from peer.
 * @private
 * @implements {Loader.getNetwork}
 * @implements {library.schema.validate}
 * @implements {library.sequence.add}
 * @implements {async.eachSeries}
 * @implements {modules.multisignatures.processSignature}
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 */
__private.loadSignatures = function(cb) {
	async.waterfall(
		[
			function(waterCb) {
				self.getNetwork(function(err, network) {
					if (err) {
						return setImmediate(waterCb, err);
					} else {
						var peer =
							network.peers[Math.floor(Math.random() * network.peers.length)];
						return setImmediate(waterCb, null, peer);
					}
				});
			},
			function(peer, waterCb) {
				library.logger.log(`Loading signatures from: ${peer.string}`);
				peer.rpc.getSignatures(function(err, res) {
					if (err) {
						peer.applyHeaders({ state: Peer.STATE.DISCONNECTED });
						return setImmediate(waterCb, err);
					} else {
						library.schema.validate(
							res,
							definitions.WSSignaturesResponse,
							function(err) {
								return setImmediate(waterCb, err, res.signatures);
							}
						);
					}
				});
			},
			function(signatures, waterCb) {
				library.sequence.add(function(cb) {
					async.eachSeries(
						signatures,
						function(signature, eachSeriesCb) {
							async.eachSeries(
								signature.signatures,
								function(s, eachSeriesCb) {
									modules.multisignatures.processSignature(
										{
											signature: s,
											transactionId: signature.transactionId,
										},
										function(err) {
											return setImmediate(eachSeriesCb, err);
										}
									);
								},
								eachSeriesCb
							);
						},
						cb
					);
				}, waterCb);
			},
		],
		function(err) {
			return setImmediate(cb, err);
		}
	);
};

/**
 * Gets a random peer and loads transactions from network:
 * - Validates each transaction from peer and remove peer if invalid.
 * - Calls processUnconfirmedTransaction for each transaction.
 * @private
 * @implements {Loader.getNetwork}
 * @implements {library.schema.validate}
 * @implements {async.eachSeries}
 * @implements {library.logic.transaction.objectNormalize}
 * @implements {modules.peers.remove}
 * @implements {library.balancesSequence.add}
 * @implements {modules.transactions.processUnconfirmedTransaction}
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 * @todo Missing error propagation when calling balancesSequence.add
 */
__private.loadTransactions = function(cb) {
	async.waterfall(
		[
			function(waterCb) {
				self.getNetwork(function(err, network) {
					if (err) {
						return setImmediate(waterCb, err);
					} else {
						var peer =
							network.peers[Math.floor(Math.random() * network.peers.length)];
						return setImmediate(waterCb, null, peer);
					}
				});
			},
			function(peer, waterCb) {
				library.logger.log(`Loading transactions from: ${peer.string}`);
				peer.rpc.getTransactions(function(err, res) {
					if (err) {
						peer.applyHeaders({ state: Peer.STATE.DISCONNECTED });
						return setImmediate(waterCb, err);
					}
					library.schema.validate(
						res,
						definitions.WSTransactionsResponse,
						function(err) {
							if (err) {
								return setImmediate(waterCb, err[0].message);
							} else {
								return setImmediate(waterCb, null, peer, res.transactions);
							}
						}
					);
				});
			},
			function(peer, transactions, waterCb) {
				async.eachSeries(
					transactions,
					function(transaction, eachSeriesCb) {
						var id = transaction ? transactions.id : 'null';

						try {
							transaction = library.logic.transaction.objectNormalize(
								transaction
							);
						} catch (e) {
							library.logger.debug('Transaction normalization failed', {
								id: id,
								err: e.toString(),
								module: 'loader',
								transaction: transaction,
							});

							library.logger.warn(
								['Transaction', id, 'is not valid, peer removed'].join(' '),
								peer.string
							);
							modules.peers.remove(peer.ip, peer.wsPort);

							return setImmediate(eachSeriesCb, e);
						}

						return setImmediate(eachSeriesCb);
					},
					function(err) {
						return setImmediate(waterCb, err, transactions);
					}
				);
			},
			function(transactions, waterCb) {
				async.eachSeries(
					transactions,
					function(transaction, eachSeriesCb) {
						library.balancesSequence.add(
							function(cb) {
								transaction.bundled = true;
								modules.transactions.processUnconfirmedTransaction(
									transaction,
									false,
									cb
								);
							},
							function(err) {
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
		function(err) {
			return setImmediate(cb, err);
		}
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
 * @private
 * @implements {library.db.task}
 * @implements {slots.calcRound}
 * @implements {library.bus.message}
 * @implements {library.logic.account.resetMemTables}
 * @implements {async.until}
 * @implements {modules.blocks.loadBlocksOffset}
 * @implements {modules.blocks.deleteAfterBlock}
 * @implements {modules.blocks.loadLastBlock}
 * @emits exit
 * @throws {string} On failure to match genesis block with database.
 */
__private.loadBlockChain = function() {
	var offset = 0;
	var limit = Number(library.config.loading.loadPerIteration) || 1000;
	var verify = Boolean(library.config.loading.verifyOnLoading);

	function load(count) {
		verify = true;
		__private.total = count;
		async.series(
			{
				resetMemTables: function(seriesCb) {
					library.logic.account.resetMemTables(function(err) {
						if (err) {
							throw err;
						} else {
							return setImmediate(seriesCb);
						}
					});
				},
				loadBlocksOffset: function(seriesCb) {
					async.until(
						function() {
							return count < offset;
						},
						function(cb) {
							if (count > 1) {
								library.logger.info(
									`Rebuilding blockchain, current block height: ${offset + 1}`
								);
							}
							modules.blocks.process.loadBlocksOffset(
								limit,
								offset,
								verify,
								function(err, lastBlock) {
									if (err) {
										return setImmediate(cb, err);
									}

									offset += limit;
									__private.lastBlock = lastBlock;

									return setImmediate(cb);
								}
							);
						},
						function(err) {
							return setImmediate(seriesCb, err);
						}
					);
				},
			},
			function(err) {
				if (err) {
					library.logger.error(err);
					if (err.block) {
						library.logger.error(`Blockchain failed at: ${err.block.height}`);
						modules.blocks.chain.deleteAfterBlock(err.block.id, function() {
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

	function reload(count, message) {
		if (message) {
			library.logger.warn(message);
			library.logger.warn('Recreating memory tables');
		}

		return load(count);
	}

	function checkMemTables(t) {
		var promises = [
			t.blocks.count(),
			t.blocks.getGenesisBlock(),
			t.accounts.countMemAccounts(),
			t.rounds.getMemRounds(),
			t.delegates.countDuplicatedDelegates(),
		];

		return t.batch(promises);
	}

	function matchGenesisBlock(row) {
		if (row) {
			var matched =
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

	function verifySnapshot(count, round) {
		if (
			library.config.loading.snapshot !== undefined ||
			library.config.loading.snapshot > 0
		) {
			library.logger.info('Snapshot mode enabled');

			if (
				isNaN(library.config.loading.snapshot) ||
				library.config.loading.snapshot >= round
			) {
				library.config.loading.snapshot = round;

				if (count === 1 || count % constants.activeDelegates > 0) {
					library.config.loading.snapshot = round > 1 ? round - 1 : 1;
				}

				modules.rounds.setSnapshotRound(library.config.loading.snapshot);
			}

			library.logger.info(
				`Snapshotting to end of round: ${library.config.loading.snapshot}`
			);
			return true;
		} else {
			return false;
		}
	}

	library.db
		.task(checkMemTables)
		.spread(function(
			blocksCount,
			getGenesisBlock,
			memAccountsCount,
			getMemRounds,
			duplicatedDelegatesCount
		) {
			library.logger.info(`Blocks ${blocksCount}`);

			var round = slots.calcRound(blocksCount);

			if (blocksCount === 1) {
				return reload(blocksCount);
			}

			matchGenesisBlock(getGenesisBlock[0]);

			verify = verifySnapshot(blocksCount, round);

			if (verify) {
				return reload(blocksCount, 'Blocks verification enabled');
			}

			var missed = !memAccountsCount;

			if (missed) {
				return reload(blocksCount, 'Detected missed blocks in mem_accounts');
			}

			var unapplied = getMemRounds.filter(function(row) {
				return row.round !== String(round);
			});

			if (unapplied.length > 0) {
				return reload(blocksCount, 'Detected unapplied rounds in mem_round');
			}

			if (duplicatedDelegatesCount > 0) {
				library.logger.error(
					'Delegates table corrupted with duplicated entries'
				);
				return process.emit('exit');
			}

			function updateMemAccounts(t) {
				var promises = [
					t.accounts.updateMemAccounts(),
					t.accounts.getOrphanedMemAccounts(),
					t.accounts.getDelegates(),
				];
				return t.batch(promises);
			}

			// TODO: Missing .catch handler, see #1446
			library.db
				.task(updateMemAccounts)
				.spread(function(
					updateMemAccounts,
					getOrphanedMemAccounts,
					getDelegates
				) {
					if (getOrphanedMemAccounts.length > 0) {
						return reload(
							blocksCount,
							'Detected orphaned blocks in mem_accounts'
						);
					}

					if (getDelegates.length === 0) {
						return reload(blocksCount, 'No delegates found');
					}

					modules.blocks.utils.loadLastBlock(function(err, block) {
						if (err) {
							return reload(blocksCount, err || 'Failed to load last block');
						} else {
							__private.lastBlock = block;
							library.logger.info('Blockchain ready');
							library.bus.message('blockchainReady');
						}
					});
				});
		})
		.catch(function(err) {
			library.logger.error(err.stack || err);
			return process.emit('exit');
		});
};

/**
 * Loads blocks from network.
 * @private
 * @implements {Loader.getNetwork}
 * @implements {async.whilst}
 * @implements {modules.blocks.lastBlock.get}
 * @implements {modules.blocks.loadBlocksFromPeer}
 * @implements {modules.blocks.getCommonBlock}
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 */
__private.loadBlocksFromNetwork = function(cb) {
	var errorCount = 0;
	var loaded = false;

	self.getNetwork(function(err, network) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			async.whilst(
				function() {
					return !loaded && errorCount < 5;
				},
				function(next) {
					var peer =
						network.peers[Math.floor(Math.random() * network.peers.length)];
					var lastBlock = modules.blocks.lastBlock.get();

					function loadBlocks() {
						__private.blocksToSync = peer.height;

						modules.blocks.process.loadBlocksFromPeer(peer, function(
							err,
							lastValidBlock
						) {
							if (err) {
								library.logger.error(err.toString());
								library.logger.error(
									`Failed to load blocks from: ${peer.string}`
								);
								errorCount += 1;
							}
							loaded = lastValidBlock.id === lastBlock.id;
							lastValidBlock = lastBlock = null;
							next();
						});
					}

					function getCommonBlock(cb) {
						library.logger.info(
							`Looking for common block with: ${peer.string}`
						);
						modules.blocks.process.getCommonBlock(
							peer,
							lastBlock.height,
							function(err, commonBlock) {
								if (!commonBlock) {
									if (err) {
										library.logger.error(err.toString());
									}
									library.logger.error(
										`Failed to find common block with: ${peer.string}`
									);
									errorCount += 1;
									return next();
								} else {
									library.logger.info(
										[
											'Found common block:',
											commonBlock.id,
											'with:',
											peer.string,
										].join(' ')
									);
									return setImmediate(cb);
								}
							}
						);
					}

					if (lastBlock.height === 1) {
						loadBlocks();
					} else {
						getCommonBlock(loadBlocks);
					}
				},
				function(err) {
					if (err) {
						library.logger.error('Failed to load blocks from network', err);
						return setImmediate(cb, err);
					} else {
						return setImmediate(cb);
					}
				}
			);
		}
	});
};

/**
 * Performs sync operation:
 * - Undoes unconfirmed transactions.
 * - Establishes broadhash consensus before sync.
 * - Performs sync operation: loads blocks from network, updates system.
 * - Establishes broadhash consensus after sync.
 * - Applies unconfirmed transactions.
 * @private
 * @implements {async.series}
 * @implements {modules.transport.getPeers}
 * @implements {__private.loadBlocksFromNetwork}
 * @implements {modules.system.update}
 * @param {function} cb
 * @todo Check err actions.
 */
__private.sync = function(cb) {
	library.logger.info('Starting sync');
	library.bus.message('syncStarted');

	__private.isActive = true;
	__private.syncTrigger(true);

	async.series(
		{
			getPeersBefore: function(seriesCb) {
				library.logger.debug('Establishing broadhash consensus before sync');
				return modules.transport.getPeers(
					{ limit: constants.maxPeers },
					seriesCb
				);
			},
			loadBlocksFromNetwork: function(seriesCb) {
				return __private.loadBlocksFromNetwork(seriesCb);
			},
			updateSystem: function(seriesCb) {
				return modules.system.update(seriesCb);
			},
			getPeersAfter: function(seriesCb) {
				library.logger.debug('Establishing broadhash consensus after sync');
				return modules.transport.getPeers(
					{ limit: constants.maxPeers },
					seriesCb
				);
			},
		},
		function(err) {
			__private.isActive = false;
			__private.syncTrigger(false);
			__private.blocksToSync = 0;

			library.logger.info('Finished sync');
			library.bus.message('syncFinished');
			return setImmediate(cb, err);
		}
	);
};

/**
 * Establishes a list of "good" peers.
 * @private
 * @implements {modules.blocks.lastBlock.get}
 * @implements {library.logic.peers.create}
 * @param {array<Peer>} peers
 * @return {Object} {height number, peers array}
 */
Loader.prototype.findGoodPeers = function(peers) {
	var lastBlockHeight = modules.blocks.lastBlock.get().height;
	library.logger.trace('Good peers - received', { count: peers.length });

	peers = peers.filter(function(item) {
		// Remove unreachable peers or heights below last block height
		return item != null && item.height >= lastBlockHeight;
	});

	library.logger.trace('Good peers - filtered', { count: peers.length });

	// No peers found
	if (peers.length === 0) {
		return { height: 0, peers: [] };
	} else {
		// Order peers by descending height
		peers = peers.sort(function(a, b) {
			return b.height - a.height;
		});

		var histogram = {};
		var max = 0;
		var height;

		// Aggregate height by 2. TODO: To be changed if node latency increases?
		var aggregation = 2;

		// Perform histogram calculation, together with histogram maximum
		for (var i in peers) {
			var val = parseInt(peers[i].height / aggregation) * aggregation;
			histogram[val] = (histogram[val] ? histogram[val] : 0) + 1;

			if (histogram[val] > max) {
				max = histogram[val];
				height = val;
			}
		}

		// Perform histogram cut of peers too far from histogram maximum
		peers = peers
			.filter(function(item) {
				return item && Math.abs(height - item.height) < aggregation + 1;
			})
			.map(function(item) {
				return library.logic.peers.create(item);
			});

		library.logger.trace('Good peers - accepted', { count: peers.length });
		library.logger.debug('Good peers', peers);

		return { height: height, peers: peers };
	}
};

// Public methods
/**
 * Gets a list of "good" peers from network.
 * @implements {modules.blocks.lastBlock.get}
 * @implements {modules.peers.list}
 * @implements {__private.findGoodPeers}
 * @param {function} cb
 * @return {setImmediateCallback} err | __private.network (good peers)
 */
Loader.prototype.getNetwork = function(cb) {
	modules.peers.list({ normalized: false }, function(err, peers) {
		if (err) {
			return setImmediate(cb, err);
		}

		__private.network = self.findGoodPeers(peers);

		if (!__private.network.peers.length) {
			return setImmediate(cb, 'Failed to find enough good peers');
		} else {
			return setImmediate(cb, null, __private.network);
		}
	});
};

/**
 * Checks if private variable syncIntervalId has value.
 * @return {boolean} True if syncIntervalId has value.
 */
Loader.prototype.syncing = function() {
	return !!__private.syncIntervalId;
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Loader.prototype.isLoaded = function() {
	return !!modules;
};

/**
 * Checks private variable loaded.
 * @return {boolean} False if not loaded.
 */
Loader.prototype.loaded = function() {
	return !!__private.loaded;
};

// Events
/**
 * Pulls Transactions and signatures.
 * @implements {__private.syncTimer}
 * @implements {async.series}
 * @implements {async.retry}
 * @implements {__private.loadTransactions}
 * @implements {__private.loadSignatures}
 * @implements {__private.initialize}
 * @return {function} Calling __private.syncTimer()
 */
Loader.prototype.onPeersReady = function() {
	library.logger.trace('Peers ready', { module: 'loader' });
	// Enforce sync early
	__private.syncTimer();

	setImmediate(function load() {
		async.series(
			{
				loadTransactions: function(seriesCb) {
					if (__private.loaded) {
						async.retry(__private.retries, __private.loadTransactions, function(
							err
						) {
							if (err) {
								library.logger.log('Unconfirmed transactions loader', err);
							}

							return setImmediate(seriesCb);
						});
					} else {
						return setImmediate(seriesCb);
					}
				},
				loadSignatures: function(seriesCb) {
					if (__private.loaded) {
						async.retry(__private.retries, __private.loadSignatures, function(
							err
						) {
							if (err) {
								library.logger.log('Signatures loader', err);
							}

							return setImmediate(seriesCb);
						});
					} else {
						return setImmediate(seriesCb);
					}
				},
			},
			function(err) {
				library.logger.trace('Transactions and signatures pulled', err);
			}
		);
	});
};

/**
 * Assigns needed modules from scope to private modules variable.
 * @param {modules} scope
 * @return {function} Calling __private.loadBlockChain.
 */
Loader.prototype.onBind = function(scope) {
	modules = {
		transactions: scope.transactions,
		blocks: scope.blocks,
		peers: scope.peers,
		rounds: scope.rounds,
		transport: scope.transport,
		multisignatures: scope.multisignatures,
		system: scope.system,
	};

	definitions = scope.swagger.definitions;

	__private.loadBlockChain();
};

/**
 * Sets private variable loaded to true.
 */
Loader.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Sets private variable loaded to false.
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Loader.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Export
module.exports = Loader;
