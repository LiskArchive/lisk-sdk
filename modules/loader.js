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

private.loadFullDb = function (peer, cb) {
	peer = modules.peer.inspect(peer);

	var commonBlockId = private.genesisBlock.block.id;

	library.logger.info("Loading blocks from genesis from " + peer.string);

	modules.blocks.loadBlocksFromPeer(peer, commonBlockId, cb);
}

private.findUpdate = function (lastBlock, peer, cb) {
	peer = modules.peer.inspect(peer);

	library.logger.info("Looking for common block with " + peer.string);

	modules.blocks.getCommonBlock(peer, lastBlock.height, function (err, commonBlock) {
		if (err || !commonBlock) {
			return cb(err);
		}

		library.logger.info("Found common block " + commonBlock.id + " (at " + commonBlock.height + ")" + " with peer " + peer.string);
		var toRemove = lastBlock.height - commonBlock.height;

		if (toRemove > constants.activeDelegates * 10) {
			library.logger.warn("Long fork, ban 60 min", peer.string);
			modules.peer.state(peer.ip, peer.port, 0, 3600);
			return cb();
		}

		var overTransactionList = [];
		modules.transactions.undoUnconfirmedList(function (err, unconfirmedList) {
			if (err) {
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

					modules.blocks.loadBlocksFromPeer(peer, commonBlock.id, function (err, lastValidBlock) {
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
			return cb();
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
			return cb();
		}

		if (bignum(modules.blocks.getLastBlock().height).lt(data.body.height)) { // Diff in chainbases
			private.blocksToSync = data.body.height;

			if (lastBlock.id != private.genesisBlock.block.id) { // Have to find common block
				private.findUpdate(lastBlock, data.peer, cb);
			} else { // Have to load full db
				private.loadFullDb(data.peer, cb);
			}
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

// Public methods
Loader.prototype.syncing = function () {
	return !!private.syncIntervalId;
}

Loader.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Loader.prototype.onPeerReady = function () {
	setImmediate(function nextLoadBlock() {
		if (!private.loaded) return;
		private.isActive = true;
		library.sequence.add(function (cb) {
			private.syncTrigger(true);
			var lastBlock = modules.blocks.getLastBlock();
			private.loadBlocks(lastBlock, cb);
		}, function (err) {
			err && library.logger.error("Blocks timer:", err);
			private.syncTrigger(false);
			private.blocksToSync = 0;

			private.isActive = false;
			if (!private.loaded) return;

			setTimeout(nextLoadBlock, 9 * 1000)
		});
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
