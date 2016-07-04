var async = require("async");
var Router = require("../helpers/router.js");
var util = require("util");
var ip = require("ip");
var bignum = require("../helpers/bignum.js");
var constants = require("../helpers/constants.js");
var sandboxHelper = require("../helpers/sandbox.js");
var sql = require("../sql/loader.js");

require("colors");

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false;
// holding the network height network.height and "good peers" (ie reachable and with height close to network.height) network.peers
private.network = null;
private.isActive = false;
private.loadingLastBlock = null;
private.genesisBlock = null;
private.total = 0;
private.blocksToSync = 0;
private.syncIntervalId = null;

// Constructor
function Loader(cb, scope) {
	library = scope;
	private.genesisBlock = private.loadingLastBlock = library.genesisblock;
	self = this;
	self.__private = private;
	private.attachApi();

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.map(shared, {
		"get /status": "status",
		"get /status/sync": "sync"
	});

	library.network.app.use("/api/loader", router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
}

private.syncTrigger = function (turnOn) {
	if (turnOn === false && private.syncIntervalId) {
		clearTimeout(private.syncIntervalId);
		private.syncIntervalId = null;
	}
	if (turnOn === true && !private.syncIntervalId) {
		setImmediate(function nextSyncTrigger() {
			library.network.io.sockets.emit("loader/sync", {
				blocks: private.blocksToSync,
				height: modules.blocks.getLastBlock().height
			});
			private.syncIntervalId = setTimeout(nextSyncTrigger, 1000);
		});
	}
}

private.findUpdate = function (lastBlock, peer, cb) {
	peer = modules.peer.inspect(peer);

	library.logger.info("Looking for common block with " + peer.string);

	modules.blocks.getCommonBlock(peer, lastBlock.height, function (err, commonBlock) {
		if (err || !commonBlock) {
			return cb(err);
		}

		library.logger.info("Found common block " + commonBlock.id + " (at " + commonBlock.height + ")" + " with peer " + peer.string);

		// toRemove > 0 means node has forked from the other peer
		// in this case we will remove the "wrong blocks"
		// TODO: note from fixcrypt: I think removing blocks does not work here.
		var toRemove = lastBlock.height - commonBlock.height;

		if (toRemove > constants.activeDelegates * 10) {
			library.logger.warn("Long fork, ban 60 min", peer.string);
			modules.peer.state(peer.ip, peer.port, 0, 3600);
			return cb("Remote peer not in sync");
		}

		var overTransactionList = [];
		modules.transactions.undoUnconfirmedList(function (err, unconfirmedList) {
			if (err) {
				// Database likely messed up
				return process.exit(0);
			}

			for (var i = 0; i < unconfirmedList.length; i++) {
				var transaction = modules.transactions.getUnconfirmedTransaction(unconfirmedList[i]);
				overTransactionList.push(transaction);
				modules.transactions.removeUnconfirmedTransaction(unconfirmedList[i]);
			}

			async.series([
				function (cb) {
					if (commonBlock.id != lastBlock.id) {
						modules.round.directionSwap("backward", lastBlock, cb);
					} else {
						cb();
					}
				},
				function (cb) {
					library.bus.message("deleteBlocksBefore", commonBlock);

					modules.blocks.deleteBlocksBefore(commonBlock, cb);
				},
				function (cb) {
					if (commonBlock.id != lastBlock.id) {
						modules.round.directionSwap("forward", lastBlock, cb);
					} else {
						cb();
					}
				},
				function (cb) {
					library.logger.debug("Loading blocks from peer " + peer.string);

					modules.blocks.loadBlocksFromPeer(peer, function (err, lastValidBlock) {
						if (err) {
							modules.transactions.deleteHiddenTransaction();
							library.logger.warn("Failed to load blocks, ban 60 min", peer.string);
							modules.peer.state(peer.ip, peer.port, 0, 3600);

							if (lastValidBlock) {
								var uploaded = lastValidBlock.height - commonBlock.height;

								if (toRemove < uploaded) {
									library.logger.info("Removing blocks again until " + lastValidBlock.id + " (at " + lastValidBlock.height + ")");

									async.series([
										function (cb) {
											if (lastValidBlock.id != lastBlock.id) {
												modules.round.directionSwap("backward", lastBlock, cb);
											} else {
												cb();
											}
										},
										function (cb) {
											modules.blocks.deleteBlocksBefore(lastValidBlock, function (err) {
												async.series([
													function (cb) {
														if (lastValidBlock.id != lastBlock.id) {
															modules.round.directionSwap("forward", lastBlock, cb);
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
									library.logger.info("Removing blocks again until common " + commonBlock.id + " (at " + commonBlock.height + ")");

									async.series([
										function (cb) {
											if (commonBlock.id != lastBlock.id) {
												modules.round.directionSwap("backward", lastBlock, cb);
											} else {
												cb();
											}
										},
										function (cb) {
											modules.blocks.deleteBlocksBefore(commonBlock, cb);
										},
										function (cb) {
											if (commonBlock.id != lastBlock.id) {
												modules.round.directionSwap("forward", lastBlock, cb);
											} else {
												cb();
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
									return trs
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
			], cb)
		});
	});
}

private.loadBlocks = function (lastBlock, cb) {
	modules.transport.getFromRandomPeer({
		api: "/height",
		method: "GET"
	}, function (err, data) {
		if (err) {
			return cb(err);
		}

		data.peer = modules.peer.inspect(data.peer);

		library.logger.info("Checking blockchain on " + data.peer.string);

		data.body.height = parseInt(data.body.height);

		var report = library.scheme.validate(data.body, {
			type: "object",
			properties: {
				"height": {
					type: "integer",
					minimum: 0
				}
			}, required: ["height"]
		});

		if (!report) {
			library.logger.warn("Failed to parse blockchain height: " + data.peer.string + "\n" + library.scheme.getLastError());
			return cb(err);
		}

		if (bignum(modules.blocks.getLastBlock().height).lt(data.body.height)) { // Diff in chainbases
			private.blocksToSync = data.body.height;
			private.findUpdate(lastBlock, data.peer, cb);
		} else {
			cb();
		}
	});
}

private.loadSignatures = function (cb) {
	modules.transport.getFromRandomPeer({
		api: "/signatures",
		method: "GET",
		not_ban: true
	}, function (err, data) {
		if (err) {
			return cb();
		}

		library.scheme.validate(data.body, {
			type: "object",
			properties: {
				signatures: {
					type: "array",
					uniqueItems: true
				}
			},
			required: ["signatures"]
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
							setImmediate(cb);
						});
					}, cb);
				}, cb);
			}, cb);
		});
	});
}

private.loadUnconfirmedTransactions = function (cb) {
	modules.transport.getFromRandomPeer({
		api: "/transactions",
		method: "GET"
	}, function (err, data) {
		if (err) {
			return cb();
		}

		var report = library.scheme.validate(data.body, {
			type: "object",
			properties: {
				transactions: {
					type: "array",
					uniqueItems: true
				}
			},
			required: ["transactions"]
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
				library.logger.warn("Transaction " + (transactions[i] ? transactions[i].id : "null") + " is not valid, ban 60 min", data.peer.string);
				library.logger.warn(e.toString());
				modules.peer.state(data.peer.ip, data.peer.port, 0, 3600);
				return setImmediate(cb);
			}
		}

		library.balancesSequence.add(function (cb) {
			modules.transactions.receiveTransactions(transactions, cb);
		}, cb);
	});
}

private.loadBlockChain = function () {
	var offset = 0, limit = Number(library.config.loading.loadPerIteration) || 1000;
	    verify = Boolean(library.config.loading.verifyOnLoading);

	function load(count) {
		verify = true;
		private.total = count;

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
								return count < offset
							}, function (cb) {
								if (count > 1) {
									library.logger.info("Rebuilding blockchain, current block height: " + offset);
								}
								setImmediate(function () {
									modules.blocks.loadBlocksOffset(limit, offset, verify, function (err, lastBlockOffset) {
										if (err) {
											return cb(err);
										}

										offset = offset + limit;
										private.loadingLastBlock = lastBlockOffset;

										cb();
									});
								})
							}, function (err) {
								if (err) {
									library.logger.error(err);
									if (err.block) {
										library.logger.error("Blockchain failed at ", err.block.height)
										modules.blocks.simpleDeleteAfterBlock(err.block.id, function (err, res) {
											library.logger.error("Blockchain clipped");
											library.bus.message("blockchainReady");
										})
									}
								} else {
									library.logger.info("Blockchain ready");
									library.bus.message("blockchainReady");
								}
							}
						)
					}
				});
			}
		});
	}

	library.logic.account.createTables(function (err) {
		function reload (count, message) {
			if (message) {
				library.logger.warn(message);
				library.logger.warn("Recreating memory tables");
			}
			load(count);
		}

		if (err) {
			throw err;
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
			var count = results[0].count,
			    missed = !(results[1].count);

			library.logger.info("Blocks " + count);

			if (count == 1) {
				return reload(count);
			}

			if (verify) {
				return reload(count, "Blocks verification enabled");
			}

			if (missed) {
				return reload(count, "Detected missed blocks in mem_accounts");
			}

			var round = modules.round.calc(count);
			var unapplied = results[2].filter(function (row) {
				return (row.round != round);
			});

			if (unapplied.length > 0) {
				return reload(count, "Detected unapplied rounds in mem_round");
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
					return reload(count, "Detected orphaned blocks in mem_accounts");
				}

				if (results[2].length == 0) {
					return reload(count, "No delegates found");
				}

				modules.blocks.loadBlocksOffset(1, count, verify, function (err, lastBlock) {
					if (err) {
						return reload(count, err || "Failed to load blocks offset");
					} else {
						modules.blocks.loadLastBlock(function (err, block) {
							if (err) {
								return load(count);
							}
							private.lastBlock = block;
							library.logger.info("Blockchain ready");
							library.bus.message("blockchainReady");
						});
					}
				});
			});
		}).catch(function (err) {
			return reload(count, err);
		});
	});
}

private.loadBlocksFromNetwork = function(cb) {
	var counterrorload=0;
	var loaded=false;
	self.getNetwork(function(err, network){
		if(err) {
			private.loadBlocksFromNetwork(cb);
		}
		else {
			async.whilst(
				function () {
					return !loaded && counterrorload < 5;
				},
				function (next) {
					var peer = network.peers[Math.floor(Math.random()*network.peers.length)];
					var lastBlockId = modules.blocks.getLastBlock().id;
					modules.blocks.loadBlocksFromPeer(peer, function(err, lastValidBlock){
						if(err){
							library.logger.error("Could not load blocks from " + peer.ip, err);
							library.logger.info("Trying to reload from another random peer");
							counterrorload=counterrorload + 1;
						}
						loaded = lastValidBlock.id == lastBlockId;
						next();
					});
				},
				function (error) {
					if(counterrorload == 5){
						library.logger.info("Peer is not well connected to network, resyncing from network");
						return private.loadBlocksFromNetwork(cb);
					}
					if(error){
						library.logger.error("Could not load blocks from network", error);
						return cb(error);
					}
					return cb();
				}
			);
		}
	});
}


// Given a list of peers with associated blockchain height (heights={peer:peer, height:height}), we find a list of good peers (likely to sync with)
// Histogram cut removing peers far from the most common observed height (not as easy as it sounds since the histogram has likely been made accross few blocks time. Needs to aggregate).
private.findGoodPeers = function(heights){
	heights = heights.filter(function(item){
		return item != null;
	});
  // Ordering the peers with descending height
  heights=heights.sort(function (a,b){
    return b.height - a.height;
  });

  // Assuming at least > 10% of network is in good health
  if(heights.length < 10){
    return null;
  }
  else {
		var histogram = {};
		var max = 0;
		var height;

		for(i in heights){
			var val = parseInt(heights[i].height / 2) * 2;
			histogram[val] = (histogram[val] ? histogram[val] : 0) + 1;
			if(histogram[val] > max){
				max = histogram[val];
				height = val;
			}
		}

		var peers = heights.filter(function(item){
			return item && Math.abs(height - item.height) < 2;
		}).map(function(item){
			// add the height info to the peer
			item.peer.height=item.height;
			return item.peer;
		});
    return {height:height, peers: peers};
  }
}

// Public methods

// Rationale:
// - we pick 100 random peers from a random peer (could be unreachable...),
// - then for each of them we grab the height of their blockchain.
// - With this list we try to get a peer with sensibly good blockchain height (see private.findGoodPeer for actual strategy)
Loader.prototype.getNetwork = function(cb) {
	// if private.network is not so far from current node height, just return the cached one.
	if(private.network && Math.abs(private.network.height - modules.blocks.getLastBlock().height) < 101){
		return setImmediate(cb, null, private.network);
	}
	//fetch a list of 100 random peers
	modules.transport.getFromRandomPeer({
		api: '/list',
		method: 'GET'
	}, function (err, data) {
		if (err) {
			library.logger.info("Could not connect properly to the network", err);
			library.logger.info("Retrying...", err);
			return self.getNetwork(cb);
		}

		var report = library.scheme.validate(data.body.peers, {type: "array", required: true, uniqueItems: true});
		library.scheme.validate(data.body, {
			type: "object",
			properties: {
				peers: {
					type: "array",
					uniqueItems: true
				}
			},
			required: ['peers']
		}, function (err) {
			if (err) {
				return cb(err);
			}

			var peers = data.body.peers;

			// For each peer, we will get the height and find the maximum
			async.map(peers, function (peer, cb) {
				var ispeervalid = library.scheme.validate(peer, {
					type: "object",
					properties: {
						ip: {
							type: "string"
						},
						port: {
							type: "integer",
							minimum: 1,
							maximum: 65535
						},
						state: {
							type: "integer",
							minimum: 0,
							maximum: 3
						},
						os: {
							type: "string"
						},
						version: {
							type: "string"
						}
					},
					required: ['ip', 'port', 'state']
				});


				if (ispeervalid) {
					modules.transport.getFromPeer(peer, {
						api: "/height",
						method: "GET"
					}, function (err, result) {
						if (err) {
							return cb(err);
						}
						var isheightvalid = library.scheme.validate(result.body, {
							type: "object",
							properties: {
								"height": {
									type: "integer",
									minimum: 0
								}
							}, required: ["height"]
						});

						if (isheightvalid) {
							library.logger.info("Checking blockchain on " + result.peer.string + " - received height: " + result.body.height);
							var peer = modules.peer.inspect(result.peer);
							return cb(null,{peer: peer, height: result.body.height});
						}
					});
				}
			},function(err, heights){
				private.network=private.findGoodPeers(heights);

				if(!private.network){
					return setImmediate(cb, "Could not find enough good peers to connect");
				}
				else{
					return setImmediate(cb, null, private.network);
				}
			});
		});
	});
}

Loader.prototype.syncing = function () {
	return !!private.syncIntervalId;
}

Loader.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Loader.prototype.onPeerReady = function () {
	setImmediate(function nextLoadBlock() {
		library.sequence.add(function (cb) {
			private.isActive = true;
			private.syncTrigger(true);
			private.loadBlocksFromNetwork(cb);
		}, function (err) {
			err && library.logger.error("Blocks timer", err);
			private.isActive = false;
			private.syncTrigger(false);
			private.blocksToSync = 0;
		});
		library.logger.debug("Checking blockchain for new block in 10s");
		setTimeout(nextLoadBlock, 10 * 1000);
	});

	setImmediate(function nextLoadUnconfirmedTransactions() {
		if (!private.loaded || self.syncing()) return;
		private.loadUnconfirmedTransactions(function (err) {
			err && library.logger.error("Unconfirmed transactions timer:", err);
			setTimeout(nextLoadUnconfirmedTransactions, 14 * 1000)
		});

	});

	setImmediate(function nextLoadSignatures() {
		if (!private.loaded) return;
		private.loadSignatures(function (err) {
			err && library.logger.error("Signatures timer:", err);

			setTimeout(nextLoadSignatures, 14 * 1000)
		});
	});
}

Loader.prototype.onBind = function (scope) {
	modules = scope;

	private.loadBlockChain();
}

Loader.prototype.onBlockchainReady = function () {
	private.loaded = true;
}

Loader.prototype.cleanup = function (cb) {
	private.loaded = false;
	if (!private.isActive) {
		cb();
	} else {
		setImmediate(function nextWatch() {
			if (private.isActive) {
				setTimeout(nextWatch, 1 * 1000)
			} else {
				cb();
			}
		});
	}
}

// Shared
shared.status = function (req, cb) {
	cb(null, {
		loaded: private.loaded,
		now: private.loadingLastBlock.height,
		blocksCount: private.total
	});
}

shared.sync = function (req, cb) {
	cb(null, {
		syncing: self.syncing(),
		blocks: private.blocksToSync,
		height: modules.blocks.getLastBlock().height
	});
}

// Export
module.exports = Loader;
