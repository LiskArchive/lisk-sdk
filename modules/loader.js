'use strict';

var async = require('async');
var bignum = require('../helpers/bignum.js');
var constants = require('../helpers/constants.js');
var ip = require('ip');
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var sql = require('../sql/loader.js');
var util = require('util');

require('colors');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.network = {
	height: 0, // Network height
	peers: [], // "Good" peers and with height close to network height
};

__private.loaded = false;
__private.isActive = false;
__private.loadingLastBlock = null;
__private.genesisBlock = null;
__private.total = 0;
__private.blocksToSync = 0;
__private.syncIntervalId = null;

// Constructor
function Loader (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();
	__private.genesisBlock = __private.loadingLastBlock = library.genesisblock;

	setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.get('/status/ping', function (req, res) {
		__private.ping(function(status, body) {
			return res.status(status).json(body);
		});
	});

	router.map(shared, {
		'get /status': 'status',
		'get /status/sync': 'sync'
	});

	library.network.app.use('/api/loader', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

__private.syncTrigger = function (turnOn) {
	if (turnOn === false && __private.syncIntervalId) {
		clearTimeout(__private.syncIntervalId);
		__private.syncIntervalId = null;
	}
	if (turnOn === true && !__private.syncIntervalId) {
		setImmediate(function nextSyncTrigger () {
			library.network.io.sockets.emit('loader/sync', {
				blocks: __private.blocksToSync,
				height: modules.blocks.getLastBlock().height
			});
			__private.syncIntervalId = setTimeout(nextSyncTrigger, 1000);
		});
	}
};

__private.findUpdate = function (lastBlock, peer, cb) {
	peer = modules.peer.inspect(peer);

	library.logger.info('Looking for common block with ' + peer.string);

	modules.blocks.getCommonBlock(peer, lastBlock.height, function (err, commonBlock) {
		if (err || !commonBlock) {
			return cb(err);
		}

		library.logger.info('Found common block ' + commonBlock.id + ' (at ' + commonBlock.height + ')' + ' with peer ' + peer.string);

		// toRemove > 0 means node has forked from the other peer, in this case we will remove the 'wrong blocks'.
		// TODO: Note from fixcrypt: I think removing blocks does not work here.
		// TODO: Before removing try to confirm with other 'good peers'.
		var toRemove = lastBlock.height - commonBlock.height;

		if (toRemove > constants.activeDelegates * 10) {
			library.logger.warn('Long fork, ban 60 min', peer.string);
			modules.peer.state(peer.ip, peer.port, 0, 3600);
			return cb('Remote peer not in sync');
		}

		var overTransactionList = [];
		// Removing applied transactions not yet included in a block (thus in unconfirmed state).
		modules.transactions.undoUnconfirmedList(function (err, unconfirmedList) {
			if (err) {
				// Database likely corrupt
				return process.exit(0);
			}

			for (var i = 0; i < unconfirmedList.length; i++) {
				var transaction = modules.transactions.getUnconfirmedTransaction(unconfirmedList[i]);
				overTransactionList.push(transaction);
				modules.transactions.removeUnconfirmedTransaction(unconfirmedList[i]);
			}

			// Strategy:
			// - Set Round in backward mode.
			// - Remove Blocks (and transactions included in thoses blocks) until the commonBlock if needed.
			// - Set Round in forward mode.
			// - Process Blocks sent from the peer from commonBlock.
			async.series([
				function (cb) {
					if (commonBlock.id !== lastBlock.id) {
						modules.round.directionSwap('backward', lastBlock, cb);
					} else {
						return cb();
					}
				},
				function (cb) {
					library.bus.message('deleteBlocksBefore', commonBlock);
					modules.blocks.deleteBlocksBefore(commonBlock, cb);
				},
				function (cb) {
					if (commonBlock.id !== lastBlock.id) {
						modules.round.directionSwap('forward', lastBlock, cb);
					} else {
						return cb();
					}
				},
				function (cb) {
					library.logger.debug('Loading blocks from peer ' + peer.string);
					modules.blocks.loadBlocksFromPeer(peer, function (err, lastValidBlock) {
						if (err) {
							// Database Corruption...
							//
							// Strategy:
							// - Set Round in backward mode.
							// - Remove all 'uploaded' blocks from the peers that have been applied.
							// - Set Round in forward mode.
							// - Apply unconfirmed transactions from the list.
							//
							// We are then supposed to be back in a correct state at commonBlock height.
							modules.transactions.deleteHiddenTransaction();
							library.logger.warn('Failed to load blocks, ban 60 min', peer.string);
							modules.peer.state(peer.ip, peer.port, 0, 3600);

							if (lastValidBlock) {
								var uploaded = lastValidBlock.height - commonBlock.height;

								if (toRemove < uploaded) { // Note from fixcrypt: Useless since the 'else' block contains the exact same code logic imo.
									library.logger.info('Removing blocks again until ' + lastValidBlock.id + ' (at ' + lastValidBlock.height + ')');

									async.series([
										function (cb) {
											if (lastValidBlock.id !== lastBlock.id) {
												modules.round.directionSwap('backward', lastBlock, cb);
											} else {
												return cb();
											}
										},
										function (cb) {
											modules.blocks.deleteBlocksBefore(lastValidBlock, function (err) {
												async.series([
													function (cb) {
														if (lastValidBlock.id !== lastBlock.id) {
															modules.round.directionSwap('forward', lastBlock, cb);
														}
													},
													function (cb) {
														async.eachSeries(overTransactionList, function (trs, cb) {
															modules.transactions.processUnconfirmedTransaction(trs, false, cb);
														}, cb);
													}
												], cb);
											});
										}
									], cb);

								} else {
									library.logger.info('Removing blocks again until common ' + commonBlock.id + ' (at ' + commonBlock.height + ')');

									async.series([
										function (cb) {
											if (commonBlock.id !== lastBlock.id) {
												modules.round.directionSwap('backward', lastBlock, cb);
											} else {
												return cb();
											}
										},
										function (cb) {
											modules.blocks.deleteBlocksBefore(commonBlock, cb);
										},
										function (cb) {
											if (commonBlock.id !== lastBlock.id) {
												modules.round.directionSwap('forward', lastBlock, cb);
											} else {
												return cb();
											}
										},
										function (cb) {
											async.eachSeries(overTransactionList, function (trs, cb) {
												modules.transactions.processUnconfirmedTransaction(trs, false, cb);
											}, cb);
										}
									], cb);
								}
							} else {
								async.eachSeries(overTransactionList, function (trs, cb) {
									modules.transactions.processUnconfirmedTransaction(trs, false, cb);
								}, cb);
							}
						} else {
							for (var i = 0; i < overTransactionList.length; i++) {
								modules.transactions.pushHiddenTransaction(overTransactionList[i]);
							}

							var trs = modules.transactions.shiftHiddenTransaction();
							async.whilst(
								function () {
									return trs;
								},
								function (next) {
									modules.transactions.processUnconfirmedTransaction(trs, true, function () {
										trs = modules.transactions.shiftHiddenTransaction();
										next();
									});
								}, cb);
						}
					});
				}
			], cb);
		});
	});
};

__private.loadBlocks = function (lastBlock, cb) {
	modules.transport.getFromRandomPeer({
		api: '/height',
		method: 'GET'
	}, function (err, data) {
		if (err) {
			return cb(err);
		}

		data.peer = modules.peer.inspect(data.peer);

		library.logger.info('Checking blockchain on ' + data.peer.string);

		data.body.height = parseInt(data.body.height);

		var report = library.scheme.validate(data.body, {
			type: 'object',
			properties: {
				'height': {
					type: 'integer',
					minimum: 0
				}
			}, required: ['height']
		});

		if (!report) {
			library.logger.warn('Failed to parse blockchain height: ' + data.peer.string + '\n' + library.scheme.getLastError());
			return cb(err);
		}

		if (bignum(modules.blocks.getLastBlock().height).lt(data.body.height)) { // Diff in chainbases
			__private.blocksToSync = data.body.height;
			__private.findUpdate(lastBlock, data.peer, cb);
		} else {
			return cb();
		}
	});
};

__private.loadSignatures = function (cb) {
	modules.transport.getFromRandomPeer({
		api: '/signatures',
		method: 'GET',
		not_ban: true
	}, function (err, data) {
		if (err) {
			return cb();
		}

		library.scheme.validate(data.body, {
			type: 'object',
			properties: {
				signatures: {
					type: 'array',
					uniqueItems: true
				}
			},
			required: ['signatures']
		}, function (err) {
			if (err) {
				return cb();
			}

			library.sequence.add(function (cb) {
				async.eachSeries(data.body.signatures, function (signature, cb) {
					async.eachSeries(signature.signatures, function (s, cb) {
						modules.multisignatures.processSignature({
							signature: s,
							transaction: signature.transaction
						}, function (err) {
							return setImmediate(cb);
						});
					}, cb);
				}, cb);
			}, cb);
		});
	});
};

__private.loadUnconfirmedTransactions = function (cb) {
	modules.transport.getFromRandomPeer({
		api: '/transactions',
		method: 'GET'
	}, function (err, data) {
		if (err) {
			return cb();
		}

		var report = library.scheme.validate(data.body, {
			type: 'object',
			properties: {
				transactions: {
					type: 'array',
					uniqueItems: true
				}
			},
			required: ['transactions']
		});

		if (!report) {
			return cb();
		}

		data.peer = modules.peer.inspect(data.peer);

		var transactions = data.body.transactions;

		for (var i = 0; i < transactions.length; i++) {
			try {
				transactions[i] = library.logic.transaction.objectNormalize(transactions[i]);
			} catch (e) {
				library.logger.warn('Transaction ' + (transactions[i] ? transactions[i].id : 'null') + ' is not valid, ban 60 min', data.peer.string);
				library.logger.warn(e.toString());
				modules.peer.state(data.peer.ip, data.peer.port, 0, 3600);
				return setImmediate(cb);
			}
		}

		library.balancesSequence.add(function (cb) {
			modules.transactions.receiveTransactions(transactions, cb);
		}, cb);
	});
};

__private.loadBlockChain = function () {
	var offset = 0, limit = Number(library.config.loading.loadPerIteration) || 1000;
	var verify = Boolean(library.config.loading.verifyOnLoading);

	function load (count) {
		verify = true;
		__private.total = count;

		library.logic.account.removeTables(function (err) {
			if (err) {
				throw err;
			} else {
				library.logic.account.createTables(function (err) {
					if (err) {
						throw err;
					} else {
						async.until(
							function () {
								return count < offset;
							}, function (cb) {
								if (count > 1) {
									library.logger.info('Rebuilding blockchain, current block height: ' + offset);
								}
								return setImmediate(function () {
									modules.blocks.loadBlocksOffset(limit, offset, verify, function (err, lastBlockOffset) {
										if (err) {
											return cb(err);
										}

										offset = offset + limit;
										__private.loadingLastBlock = lastBlockOffset;

										return cb();
									});
								});
							}, function (err) {
								if (err) {
									library.logger.error(err);
									if (err.block) {
										library.logger.error('Blockchain failed at: ' + err.block.height);
										modules.blocks.simpleDeleteAfterBlock(err.block.id, function (err, res) {
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
				});
			}
		});
	}

	function reload (count, message) {
		if (message) {
			library.logger.warn(message);
			library.logger.warn('Recreating memory tables');
		}
		load(count);
	}

	function checkMemTables (t) {
		var promises = [
			t.one(sql.countBlocks),
			t.one(sql.countMemAccounts),
			t.query(sql.getMemRounds)
		];

		return t.batch(promises);
	}

	library.db.task(checkMemTables).then(function (results) {
		var count = results[0].count;
		var missed = !(results[1].count);

		library.logger.info('Blocks ' + count);

		var round = modules.round.calc(count);

		if (library.config.loading.snapshot !== undefined || library.config.loading.snapshot > 0) {
			library.logger.info('Snapshot mode enabled');
			verify = true;

			if (isNaN(library.config.loading.snapshot) || library.config.loading.snapshot >= round) {
				library.config.loading.snapshot = round;

				if ((count === 1) || (count % constants.activeDelegates > 0)) {
					library.config.loading.snapshot = (round > 1) ? (round - 1) : 1;
				}
			}

			library.logger.info('Snapshotting to end of round: ' + library.config.loading.snapshot);
		}

		if (count === 1) {
			return reload(count);
		}

		if (verify) {
			return reload(count, 'Blocks verification enabled');
		}

		if (missed) {
			return reload(count, 'Detected missed blocks in mem_accounts');
		}

		var unapplied = results[2].filter(function (row) {
			return (row.round !== round);
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

			modules.blocks.loadBlocksOffset(1, count, verify, function (err, lastBlock) {
				if (err) {
					return reload(count, err || 'Failed to load blocks offset');
				} else {
					__private.lastBlock = lastBlock;
					library.logger.info('Blockchain ready');
					library.bus.message('blockchainReady');
				}
			});
		});
	}).catch(function (err) {
		library.logger.error(err);
		return process.exit(0);
	});
};

__private.loadBlocksFromNetwork = function (cb) {
	var counterrorload = 0;
	var loaded = false;
	self.getNetwork(function (err, network) {
		if (err) {
			__private.loadBlocksFromNetwork(cb);
		} else {
			async.whilst(
				function () {
					return !loaded && counterrorload < 5;
				},
				function (next) {
					var peer = network.peers[Math.floor(Math.random() * network.peers.length)];
					var lastBlockId = modules.blocks.getLastBlock().id;
					modules.blocks.loadBlocksFromPeer(peer, function (err, lastValidBlock) {
						if (err) {
							library.logger.error('Could not load blocks from: ' + peer.ip, err);
							library.logger.info('Trying to reload from another random peer');
							counterrorload = counterrorload + 1;
						}
						loaded = lastValidBlock.id === lastBlockId;
						next();
					});
				},
				function (err) {
					if (counterrorload === 5) {
						library.logger.info('Peer is not well connected to network, resyncing from network');
						return __private.loadBlocksFromNetwork(cb);
					}
					if (err) {
						library.logger.error('Could not load blocks from network', err);
						return cb(err);
					}
					return cb();
				}
			);
		}
	});
};

// Given a list of peers with associated blockchain height (heights = {peer: peer, height: height}), we find a list of good peers (likely to sync with), then perform a histogram cut, removing peers far from the most common observed height. This is not as easy as it sounds, since the histogram has likely been made accross several blocks, therefore need to aggregate).
__private.findGoodPeers = function (heights) {
	// Removing unreachable peers
	heights = heights.filter(function (item) {
		return item != null;
	});

	// Assuming that the node reached at least 10% of the network
	if (heights.length < 10) {
		return { height: 0, peers: [] };
	} else {
		// Ordering the peers with descending height
		heights = heights.sort(function (a,b) {
			return b.height - a.height;
		});
		var histogram = {};
		var max = 0;
		var height;

		var aggregation = 2; // Aggregating height by 2. TODO: To be changed if node latency increases?

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
			// Add the height info to the peer. To be removed?
			item.peer.height = item.height;
			return item.peer;
		});
		return { height: height, peers: peers };
	}
};

// Public methods

// Rationale:
// - We pick 100 random peers from a random peer (could be unreachable).
// - Then for each of them we grab the height of their blockchain.
// - With this list we try to get a peer with sensibly good blockchain height (see __private.findGoodPeers for actual strategy).
Loader.prototype.getNetwork = function (cb) {
	// If __private.network.height is not so far (i.e. 1 round) from current node height, just return cached __private.network.
	if (__private.network.height > 0 && Math.abs(__private.network.height - modules.blocks.getLastBlock().height) < 101) {
		return setImmediate(cb, null, __private.network);
	}
	// Fetch a list of 100 random peers
	modules.transport.getFromRandomPeer({
		api: '/list',
		method: 'GET'
	}, function (err, data) {
		if (err) {
			library.logger.info('Could not connect properly to the network', err);
			library.logger.info('Retrying...', err);
			return self.getNetwork(cb); // TODO: Use setImmediate to prevent from stack overflow?
		}

		var report = library.scheme.validate(data.body.peers, {type: 'array', required: true, uniqueItems: true});

		library.scheme.validate(data.body, {
			type: 'object',
			properties: {
				peers: {
					type: 'array',
					uniqueItems: true
				}
			},
			required: ['peers']
		}, function (err) {
			if (err) {
				return cb(err);
			}

			var peers = data.body.peers;

			// For each peer, we will get the height
			async.map(peers, function (peer, cb) {
				var ispeervalid = library.scheme.validate(peer, {
					type: 'object',
					properties: {
						ip: {
							type: 'string'
						},
						port: {
							type: 'integer',
							minimum: 1,
							maximum: 65535
						},
						state: {
							type: 'integer',
							minimum: 0,
							maximum: 3
						},
						os: {
							type: 'string'
						},
						version: {
							type: 'string'
						}
					},
					required: ['ip', 'port', 'state']
				});

				if (ispeervalid) {
					modules.transport.getFromPeer(peer, {
						api: '/height',
						method: 'GET'
					}, function (err, result) {
						if (err) {
							return cb(err);
						}
						var isheightvalid = library.scheme.validate(result.body, {
							type: 'object',
							properties: {
								'height': {
									type: 'integer',
									minimum: 0
								}
							}, required: ['height']
						});

						if (isheightvalid) {
							library.logger.info('Checking blockchain on: ' + result.peer.string, 'received height: ' + result.body.height);
							var peer = modules.peer.inspect(result.peer);
							return cb(null, {peer: peer, height: result.body.height});
						}
					});
				}
			},function (err, heights) {
				__private.network = __private.findGoodPeers(heights);

				if (!__private.network.peers.length) {
					return setImmediate(cb, 'Could not find enough good peers to sync from');
				} else {
					return setImmediate(cb, null, __private.network);
				}
			});
		});
	});
};

Loader.prototype.syncing = function () {
	return !!__private.syncIntervalId;
};

Loader.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Loader.prototype.onPeerReady = function () {
	setImmediate(function nextLoadBlock () {
		library.sequence.add(function (cb) {
			__private.isActive = true;
			__private.syncTrigger(true);
			__private.loadBlocksFromNetwork(cb);
		}, function (err) {
			if (err) {
				library.logger.error('Blocks timer', err);
			}
			__private.isActive = false;
			__private.syncTrigger(false);
			__private.blocksToSync = 0;
		});
		library.logger.debug('Checking blockchain for new block in 10 seconds');
		setTimeout(nextLoadBlock, 10 * 1000);
	});

	setImmediate(function nextLoadUnconfirmedTransactions () {
		if (!__private.loaded || self.syncing()) { return; }

		__private.loadUnconfirmedTransactions(function (err) {
			if (err) {
				library.logger.error('Unconfirmed transactions timer:', err);
			}
			setTimeout(nextLoadUnconfirmedTransactions, 14 * 1000);
		});
	});

	setImmediate(function nextLoadSignatures () {
		if (!__private.loaded || self.syncing()) { return; }

		__private.loadSignatures(function (err) {
			if (err) {
				library.logger.error('Signatures timer:', err);
			}
			setTimeout(nextLoadSignatures, 14 * 1000);
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
	if (!__private.isActive) {
		return cb();
	} else {
		setImmediate(function nextWatch () {
			if (__private.isActive) {
				setTimeout(nextWatch, 1 * 1000);
			} else {
				return cb();
			}
		});
	}
};

// Private
__private.ping = function (cb) {
	var epoch = constants.epochTime / 1000;
	var lastBlockTime = epoch + modules.blocks.getLastBlock().timestamp;
	var currentTime = new Date().getTime() / 1000;
	var blockAge = currentTime - lastBlockTime;

	if (blockAge < 120) {
		return cb(200, {success: true});
	} else {
		return cb(503, {success: false});
	}
};

// Shared
shared.status = function (req, cb) {
	return cb(null, {
		loaded: __private.loaded,
		now: __private.loadingLastBlock.height,
		blocksCount: __private.total
	});
};

shared.sync = function (req, cb) {
	return cb(null, {
		syncing: self.syncing(),
		blocks: __private.blocksToSync,
		height: modules.blocks.getLastBlock().height
	});
};

// Export
module.exports = Loader;
