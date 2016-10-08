'use strict';

var async = require('async');
var bignum = require('../helpers/bignum.js');
var constants = require('../helpers/constants.js');
var ip = require('ip');
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/loader.js');
var sql = require('../sql/loader.js');

require('colors');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.network = {
	height: 0, // Network height
	peers: [], // "Good" peers and with height close to network height
};

__private.loaded = false;
__private.isActive = false;
__private.lastBlock = null;
__private.genesisBlock = null;
__private.total = 0;
__private.blocksToSync = 0;
__private.syncIntervalId = null;

// Constructor
function Loader (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();
	__private.genesisBlock = __private.lastBlock = library.genesisblock;

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
		library.logger.error('API error ' + req.url, err);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
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

__private.loadSignatures = function (cb) {
	modules.transport.getFromRandomPeer({
		api: '/signatures',
		method: 'GET'
	}, function (err, res) {
		if (err) {
			return setImmediate(cb);
		}

		library.schema.validate(res.body, schema.loadSignatures, function (err) {
			if (err) {
				return setImmediate(cb);
			}

			library.sequence.add(function (cb) {
				async.eachSeries(res.body.signatures, function (signature, cb) {
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
	}, function (err, res) {
		if (err) {
			return setImmediate(cb);
		}

		var report = library.schema.validate(res.body, schema.loadUnconfirmedTransactions);

		if (!report) {
			return setImmediate(cb);
		}

		var peer = modules.peers.inspect(res.peer);
		var transactions = res.body.transactions;

		for (var i = 0; i < transactions.length; i++) {
			var transaction = transactions[i];
			var id = (transaction ? transactions.id : 'null');

			try {
				transaction = library.logic.transaction.objectNormalize(transaction);
			} catch (e) {
				library.logger.error(['Transaction', id].join(' '), e.toString());
				if (transaction) { library.logger.error('Transaction', transaction); }

				library.logger.warn(['Transaction', id, 'is not valid, ban 60 min'].join(' '), peer.string);
				modules.peers.state(peer.ip, peer.port, 0, 3600);

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

		var round = modules.rounds.calc(count);

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
		library.logger.error(err.stack);
		return process.exit(0);
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
			// Add the height info to the peer. To be removed?
			item.peer.height = item.height;
			return item.peer;
		});
		return {height: height, peers: peers};
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
	}, function (err, res) {
		if (err) {
			library.logger.info('Failed to connect properly with network', err);
			return setImmediate(cb, err);
		}

		library.schema.validate(res.body, schema.getNetwork.peers, function (err) {
			if (err) {
				return setImmediate(cb, err);
			}

			var peers = res.body.peers;

			library.logger.debug(['Received', res.body.peers.length, 'peers from'].join(' '), res.peer.string);

			// Validate each peer and then attempt to get its height
			async.map(peers, function (peer, cb) {
				var peerIsValid = library.schema.validate(modules.peers.inspect(peer), schema.getNetwork.peer);

				if (peerIsValid) {
					modules.transport.getFromPeer(peer, {
						api: '/height',
						method: 'GET'
					}, function (err, res) {
						if (err) {
							library.logger.error(err);
							library.logger.warn('Failed to get height from peer', peer.string);
							return setImmediate(cb);
						}

						var heightIsValid = library.schema.validate(res.body, schema.getNetwork.height);

						if (heightIsValid) {
							library.logger.info(['Received height:', res.body.height, 'from peer'].join(' '), peer.string);
							return setImmediate(cb, null, {peer: peer, height: res.body.height});
						} else {
							library.logger.warn('Received invalid height from peer', peer.string);
							return setImmediate(cb);
						}
					});
				} else {
					library.logger.warn('Failed to validate peer', peer);
					return setImmediate(cb);
				}
			}, function (err, heights) {
				__private.network = __private.findGoodPeers(heights);

				if (err) {
					return setImmediate(cb, err);
				} else if (!__private.network.peers.length) {
					return setImmediate(cb, 'Failed to find enough good peers to sync with');
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
Loader.prototype.onPeersReady = function () {
	setImmediate(function nextLoadBlock () {
		var lastReceipt = modules.blocks.lastReceipt();

		if (__private.loaded && !self.syncing() && (!lastReceipt || lastReceipt.stale)) {
			library.logger.debug('Loading blocks from network');
			library.sequence.add(function (cb) {
				__private.isActive = true;
				__private.syncTrigger(true);
				__private.loadBlocksFromNetwork(cb);
			}, function (err) {
				if (err) {
					library.logger.warn('Blocks timer', err);
				}

				__private.isActive = false;
				__private.syncTrigger(false);
				__private.blocksToSync = 0;

				setTimeout(nextLoadBlock, 10000);
			});
		} else {
			setTimeout(nextLoadBlock, 10000);
		}
	});

	setImmediate(function nextLoadUnconfirmedTransactions () {
		if (__private.loaded && !self.syncing()) {
			library.logger.debug('Loading unconfirmed transactions');
			__private.loadUnconfirmedTransactions(function (err) {
				if (err) {
					library.logger.warn('Unconfirmed transactions timer', err);
				}

				setTimeout(nextLoadUnconfirmedTransactions, 14000);
			});
		} else {
			setTimeout(nextLoadUnconfirmedTransactions, 14000);
		}
	});

	setImmediate(function nextLoadSignatures () {
		if (__private.loaded && !self.syncing()) {
			library.logger.debug('Loading signatures');
			__private.loadSignatures(function (err) {
				if (err) {
					library.logger.warn('Signatures timer', err);
				}

				setTimeout(nextLoadSignatures, 14000);
			});
		} else {
			setTimeout(nextLoadSignatures, 14000);
		}
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

// Private
__private.ping = function (cb) {
	var lastBlock = modules.blocks.getLastBlock();

	if (lastBlock && lastBlock.fresh) {
		return setImmediate(cb, 200, {success: true});
	} else {
		return setImmediate(cb, 503, {success: false});
	}
};

// Shared
shared.status = function (req, cb) {
	return setImmediate(cb, null, {
		loaded: __private.loaded,
		now: __private.lastBlock.height,
		blocksCount: __private.total
	});
};

shared.sync = function (req, cb) {
	return setImmediate(cb, null, {
		syncing: self.syncing(),
		blocks: __private.blocksToSync,
		height: modules.blocks.getLastBlock().height
	});
};

// Export
module.exports = Loader;
