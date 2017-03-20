'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var ip = require('ip');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/loader.js');
var sql = require('../sql/loader.js');

require('colors');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.loaded = false;
__private.isActive = false;
__private.lastBlock = null;
__private.genesisBlock = null;
__private.total = 0;
__private.blocksToSync = 0;
__private.syncIntervalId = null;
__private.syncInterval = 10000;
__private.retries = 5;

// Constructor
function Loader (cb, scope) {
	library = scope;
	self = this;

	__private.initialize();
	__private.genesisBlock = __private.lastBlock = library.genesisblock;

	setImmediate(cb, null, self);
}

// Private methods
__private.initialize = function () {
	__private.network = {
		height: 0, // Network height
		peers: [] // "Good" peers and with height close to network height
	};
};

__private.syncTrigger = function (turnOn) {
	if (turnOn === false && __private.syncIntervalId) {
		library.logger.trace('Clearing sync interval');
		clearTimeout(__private.syncIntervalId);
		__private.syncIntervalId = null;
	}
	if (turnOn === true && !__private.syncIntervalId) {
		library.logger.trace('Setting sync interval');
		setImmediate(function nextSyncTrigger () {
			library.logger.trace('Sync trigger');
			library.network.io.sockets.emit('loader/sync', {
				blocks: __private.blocksToSync,
				height: modules.blocks.getLastBlock().height
			});
			__private.syncIntervalId = setTimeout(nextSyncTrigger, 1000);
		});
	}
};

__private.syncTimer = function () {
	library.logger.trace('Setting sync timer');
	setImmediate(function nextSync () {
		var lastReceipt = modules.blocks.lastReceipt();
		library.logger.trace('Sync timer trigger', {loaded: __private.loaded, syncing: self.syncing(), last_receipt: lastReceipt});

		if (__private.loaded && !self.syncing() && (!lastReceipt || lastReceipt.stale)) {
			library.sequence.add(function (cb) {
				async.retry(__private.retries, __private.sync, cb);
			}, function (err) {
				if (err) {
					library.logger.error('Sync timer', err);
					__private.initialize();
				}

				return setTimeout(nextSync, __private.syncInterval);
			});
		} else {
			return setTimeout(nextSync, __private.syncInterval);
		}
	});
};

__private.loadSignatures = function (cb) {
	async.waterfall([
		function (waterCb) {
			self.getNetwork(function (err, network) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					var peer = network.peers[Math.floor(Math.random() * network.peers.length)];
					return setImmediate(waterCb, null, peer);
				}
			});
		},
		function (peer, waterCb) {
			library.logger.log('Loading signatures from: ' + peer.string);

			modules.transport.getFromPeer(peer, {
				api: '/signatures',
				method: 'GET'
			}, function (err, res) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					library.schema.validate(res.body, schema.loadSignatures, function (err) {
						return setImmediate(waterCb, err, res.body.signatures);
					});
				}
			});
		},
		function (signatures, waterCb) {
			library.sequence.add(function (cb) {
				async.eachSeries(signatures, function (signature, eachSeriesCb) {
					async.eachSeries(signature.signatures, function (s, eachSeriesCb) {
						modules.multisignatures.processSignature({
							signature: s,
							transaction: signature.transaction
						}, function (err) {
							return setImmediate(eachSeriesCb);
						});
					}, eachSeriesCb);
				}, cb);
			}, waterCb);
		}
	], function (err) {
		return setImmediate(cb, err);
	});
};

__private.loadTransactions = function (cb) {
	async.waterfall([
		function (waterCb) {
			self.getNetwork(function (err, network) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					var peer = network.peers[Math.floor(Math.random() * network.peers.length)];
					return setImmediate(waterCb, null, peer);
				}
			});
		},
		function (peer, waterCb) {
			library.logger.log('Loading transactions from: ' + peer.string);

			modules.transport.getFromPeer(peer, {
				api: '/transactions',
				method: 'GET'
			}, function (err, res) {
				if (err) {
					return setImmediate(waterCb, err);
				}

				library.schema.validate(res.body, schema.loadTransactions, function (err) {
					if (err) {
						return setImmediate(waterCb, err[0].message);
					} else {
						return setImmediate(waterCb, null, peer, res.body.transactions);
					}
				});
			});
		},
		function (peer, transactions, waterCb) {
			async.eachSeries(transactions, function (transaction, eachSeriesCb) {
				var id = (transaction ? transactions.id : 'null');

				try {
					transaction = library.logic.transaction.objectNormalize(transaction);
				} catch (e) {
					library.logger.debug('Transaction normalization failed', {id: id, err: e.toString(), module: 'loader', tx: transaction});

					library.logger.warn(['Transaction', id, 'is not valid, ban 10 min'].join(' '), peer.string);
					modules.peers.ban(peer.ip, peer.port, 600);

					return setImmediate(eachSeriesCb, e);
				}

				return setImmediate(eachSeriesCb);
			}, function (err) {
				return setImmediate(waterCb, err, transactions);
			});
		},
		function (transactions, waterCb) {
			async.eachSeries(transactions, function (transaction, eachSeriesCb) {
				library.balancesSequence.add(function (cb) {
					transaction.bundled = true;
					modules.transactions.processUnconfirmedTransaction(transaction, false, cb);
				}, function (err) {
					if (err) {
						library.logger.debug(err);
					}
					return setImmediate(eachSeriesCb);
				});
			}, waterCb);
		}
	], function (err) {
		return setImmediate(cb, err);
	});
};

__private.loadBlockChain = function () {
	var offset = 0, limit = Number(library.config.loading.loadPerIteration) || 1000;
	var verify = Boolean(library.config.loading.verifyOnLoading);

	function load (count) {
		verify = true;
		__private.total = count;

		async.series({
			removeTables: function (seriesCb) {
				library.logic.account.removeTables(function (err) {
					if (err) {
						throw err;
					} else {
						return setImmediate(seriesCb);
					}
				});
			},
			createTables: function (seriesCb) {
				library.logic.account.createTables(function (err) {
					if (err) {
						throw err;
					} else {
						return setImmediate(seriesCb);
					}
				});
			},
			loadBlocksOffset: function (seriesCb) {
				async.until(
					function () {
						return count < offset;
					}, function (cb) {
					if (count > 1) {
						library.logger.info('Rebuilding blockchain, current block height: '  + (offset + 1));
					}
					modules.blocks.loadBlocksOffset(limit, offset, verify, function (err, lastBlock) {
						if (err) {
							return setImmediate(cb, err);
						}

						offset = offset + limit;
						__private.lastBlock = lastBlock;

						return setImmediate(cb);
					});
				}, function (err) {
					return setImmediate(seriesCb, err);
				}
				);
			}
		}, function (err) {
			if (err) {
				library.logger.error(err);
				if (err.block) {
					library.logger.error('Blockchain failed at: ' + err.block.height);
					modules.blocks.deleteAfterBlock(err.block.id, function (err, res) {
						library.logger.error('Blockchain clipped');
						library.bus.message('blockchainReady');
					});
				}
			} else {
				library.logger.info('Blockchain ready');
				library.bus.message('blockchainReady');
			}
		});
	}

	function reload (count, message) {
		if (message) {
			library.logger.warn(message);
			library.logger.warn('Recreating memory tables');
		}

		return load(count);
	}

	function checkMemTables (t) {
		var promises = [
			t.one(sql.countBlocks),
			t.query(sql.getGenesisBlock),
			t.one(sql.countMemAccounts),
			t.query(sql.getMemRounds)
		];

		return t.batch(promises);
	}

	function matchGenesisBlock (row) {
		if (row) {
			var matched = (
				row.id === __private.genesisBlock.block.id &&
				row.payloadHash.toString('hex') === __private.genesisBlock.block.payloadHash &&
				row.blockSignature.toString('hex')  === __private.genesisBlock.block.blockSignature
			);
			if (matched) {
				library.logger.info('Genesis block matched with database');
			} else {
				throw 'Failed to match genesis block with database';
			}
		}
	}

	function verifySnapshot (count, round) {
		if (library.config.loading.snapshot !== undefined || library.config.loading.snapshot > 0) {
			library.logger.info('Snapshot mode enabled');

			if (isNaN(library.config.loading.snapshot) || library.config.loading.snapshot >= round) {
				library.config.loading.snapshot = round;

				if ((count === 1) || (count % constants.activeDelegates > 0)) {
					library.config.loading.snapshot = (round > 1) ? (round - 1) : 1;
				}
			}

			library.logger.info('Snapshotting to end of round: ' + library.config.loading.snapshot);
			return true;
		} else {
			return false;
		}
	}

	library.db.task(checkMemTables).then(function (results) {
		var count = results[0].count;

		library.logger.info('Blocks ' + count);

		var round = modules.rounds.calc(count);

		if (count === 1) {
			return reload(count);
		}

		matchGenesisBlock(results[1][0]);

		verify = verifySnapshot(count, round);

		if (verify) {
			return reload(count, 'Blocks verification enabled');
		}

		var missed = !(results[2].count);

		if (missed) {
			return reload(count, 'Detected missed blocks in mem_accounts');
		}

		var unapplied = results[3].filter(function (row) {
			return (row.round !== String(round));
		});

		if (unapplied.length > 0) {
			return reload(count, 'Detected unapplied rounds in mem_round');
		}

		function updateMemAccounts (t) {
			var promises = [
				t.none(sql.updateMemAccounts),
				t.query(sql.getOrphanedMemAccounts),
				t.query(sql.getDelegates)
			];

			return t.batch(promises);
		}

		library.db.task(updateMemAccounts).then(function (results) {
			if (results[1].length > 0) {
				return reload(count, 'Detected orphaned blocks in mem_accounts');
			}

			if (results[2].length === 0) {
				return reload(count, 'No delegates found');
			}

			modules.blocks.loadLastBlock(function (err, block) {
				if (err) {
					return reload(count, err || 'Failed to load last block');
				} else {
					__private.lastBlock = block;
					library.logger.info('Blockchain ready');
					library.bus.message('blockchainReady');
				}
			});
		});
	}).catch(function (err) {
		library.logger.error(err.stack || err);
		return process.emit('exit');
	});
};

__private.loadBlocksFromNetwork = function (cb) {
	var errorCount = 0;
	var loaded = false;

	self.getNetwork(function (err, network) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			async.whilst(
				function () {
					return !loaded && errorCount < 5;
				},
				function (next) {
					var peer = network.peers[Math.floor(Math.random() * network.peers.length)];
					var lastBlock = modules.blocks.getLastBlock();

					function loadBlocks () {
						__private.blocksToSync = peer.height;

						modules.blocks.loadBlocksFromPeer(peer, function (err, lastValidBlock) {
							if (err) {
								library.logger.error(err.toString());
								library.logger.error('Failed to load blocks from: ' + peer.string);
								errorCount += 1;
							}
							loaded = lastValidBlock.id === lastBlock.id;
							lastValidBlock = lastBlock = null;
							next();
						});
					}

					function getCommonBlock (cb) {
						library.logger.info('Looking for common block with: ' + peer.string);
						modules.blocks.getCommonBlock(peer, lastBlock.height, function (err, commonBlock) {
							if (!commonBlock) {
								if (err) { library.logger.error(err.toString()); }
								library.logger.error('Failed to find common block with: ' + peer.string);
								errorCount += 1;
								return next();
							} else {
								library.logger.info(['Found common block:', commonBlock.id, 'with:', peer.string].join(' '));
								return setImmediate(cb);
							}
						});
					}

					if (lastBlock.height === 1) {
						loadBlocks();
					} else {
						getCommonBlock(loadBlocks);
					}
				},
				function (err) {
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

__private.sync = function (cb) {
	library.logger.info('Starting sync');

	__private.isActive = true;
	__private.syncTrigger(true);

	async.series({
		undoUnconfirmedList: function (seriesCb) {
			library.logger.debug('Undoing unconfirmed transactions before sync');
			return modules.transactions.undoUnconfirmedList(seriesCb);
		},
		getPeersBefore: function (seriesCb) {
			library.logger.debug('Establishing broadhash consensus before sync');
			return modules.transport.getPeers({limit: constants.maxPeers}, seriesCb);
		},
		loadBlocksFromNetwork: function (seriesCb) {
			return __private.loadBlocksFromNetwork(seriesCb);
		},
		updateSystem: function (seriesCb) {
			return modules.system.update(seriesCb);
		},
		getPeersAfter: function (seriesCb) {
			library.logger.debug('Establishing broadhash consensus after sync');
			return modules.transport.getPeers({limit: constants.maxPeers}, seriesCb);
		},
		applyUnconfirmedList: function (seriesCb) {
			library.logger.debug('Applying unconfirmed transactions after sync');
			return modules.transactions.applyUnconfirmedList(seriesCb);
		}
	}, function (err) {
		__private.isActive = false;
		__private.syncTrigger(false);
		__private.blocksToSync = 0;

		library.logger.info('Finished sync');
		return setImmediate(cb, err);
	});
};

// Given a list of peers (with associated blockchain height), we find a list of good peers (likely to sync with), then perform a histogram cut, removing peers far from the most common observed height. This is not as easy as it sounds, since the histogram has likely been made accross several blocks, therefore need to aggregate).
__private.findGoodPeers = function (heights) {
	var lastBlockHeight = modules.blocks.getLastBlock().height;
	library.logger.trace('Good peers - received', {count: heights.length});

	heights = heights.filter(function (item) {
		// Removing unreachable peers or heights below last block height
		return item != null && item.height >= lastBlockHeight;
	});

	library.logger.trace('Good peers - filtered', {count: heights.length});

	// No peers found
	if (heights.length === 0) {
		return {height: 0, peers: []};
	} else {
		// Ordering the peers with descending height
		heights = heights.sort(function (a,b) {
			return b.height - a.height;
		});

		var histogram = {};
		var max = 0;
		var height;

		// Aggregating height by 2. TODO: To be changed if node latency increases?
		var aggregation = 2;

		// Histogram calculation, together with histogram maximum
		for (var i in heights) {
			var val = parseInt(heights[i].height / aggregation) * aggregation;
			histogram[val] = (histogram[val] ? histogram[val] : 0) + 1;

			if (histogram[val] > max) {
				max = histogram[val];
				height = val;
			}
		}

		// Performing histogram cut of peers too far from histogram maximum
		var peers = heights.filter(function (item) {
			return item && Math.abs(height - item.height) < aggregation + 1;
		}).map(function (item) {
			return library.logic.peers.create(item);
		});

		library.logger.trace('Good peers - accepted', {count: peers.length});
		library.logger.debug('Good peers', peers);

		return {height: height, peers: peers};
	}
};

// Public methods

// Rationale:
// - We pick 100 random peers from a random peer (could be unreachable).
// - Then for each of them we grab the height of their blockchain.
// - With this list we try to get a peer with sensibly good blockchain height (see __private.findGoodPeers for actual strategy).
Loader.prototype.getNetwork = function (cb) {
	if (__private.network.height > 0 && Math.abs(__private.network.height - modules.blocks.getLastBlock().height) === 1) {
		return setImmediate(cb, null, __private.network);
	}

	modules.peers.list({}, function (err, peers) {
		if (err) {
			return setImmediate(cb, err);
		}

		__private.network = __private.findGoodPeers(peers);

		if (!__private.network.peers.length) {
			return setImmediate(cb, 'Failed to find enough good peers');
		} else {
			return setImmediate(cb, null, __private.network);
		}
	});
};

Loader.prototype.syncing = function () {
	return !!__private.syncIntervalId;
};

Loader.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

Loader.prototype.isLoaded = function () {
	return !!modules;
};

// Events
Loader.prototype.onPeersReady = function () {
	library.logger.trace('Peers ready', {module: 'loader'});
	// Enforce sync early
	__private.syncTimer();

	setImmediate(function load () {
		async.series({
			loadTransactions: function (seriesCb) {
				if (__private.loaded) {
					async.retry(__private.retries, __private.loadTransactions, function (err) {
						if (err) {
							library.logger.log('Unconfirmed transactions loader', err);
						}

						return setImmediate(seriesCb);
					});
				} else {
					return setImmediate(seriesCb);
				}
			},
			loadSignatures: function (seriesCb) {
				if (__private.loaded) {
					async.retry(__private.retries, __private.loadSignatures, function (err) {
						if (err) {
							library.logger.log('Signatures loader', err);
						}

						return setImmediate(seriesCb);
					});
				} else {
					return setImmediate(seriesCb);
				}
			}
		}, function (err) {
			library.logger.trace('Transactions and signatures pulled');

			if (err) {
				__private.initialize();
			}

			return __private.syncTimer();
		});
	});
};

Loader.prototype.onBind = function (scope) {
	modules = scope;

	__private.loadBlockChain();
};

Loader.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

Loader.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Internal API
Loader.prototype.internal = {
	statusPing: function () {
		var lastBlock = modules.blocks.getLastBlock();
		return lastBlock && lastBlock.fresh;
	}
};

// Shared API
Loader.prototype.shared = {
	status: function (req, cb) {
		return setImmediate(cb, null, {
			loaded: __private.loaded,
			now: __private.lastBlock.height,
			blocksCount: __private.total
		});
	},

	sync: function (req, cb) {
		return setImmediate(cb, null, {
			syncing: self.syncing(),
			blocks: __private.blocksToSync,
			height: modules.blocks.getLastBlock().height,
			broadhash: modules.system.getBroadhash(),
			consensus: modules.transport.consensus()
		});
	}
};

// Export
module.exports = Loader;
