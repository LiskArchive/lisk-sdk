'use strict';

var constants     = require('../helpers/constants.js');
var sandboxHelper = require('../helpers/sandbox.js');
// Submodules
var blocksAPI     = require('./blocks/api');
var blocksVerify  = require('./blocks/verify');
var blocksProcess = require('./blocks/process');
var blocksUtils   = require('./blocks/utils');
var blocksChain   = require('./blocks/chain');

// Private fields
var modules, library, self, __private = {};

__private.lastBlock = {};
__private.lastReceipt = null;

__private.loaded = false;
__private.cleanup = false;
__private.isActive = false;

/**
 * Initializes submodules with scope content.
 * Calls submodules.chain.saveGenesisBlock.
 * @memberof module:blocks
 * @class
 * @classdesc Main Blocks methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Blocks (cb, scope) {
	library = {
		logger: scope.logger,
	};	

	// Initialize submodules with library content
	this.submodules = {
		api:     new blocksAPI(
			scope.logger, scope.db, scope.logic.block, scope.schema, scope.dbSequence
		),
		verify:  new blocksVerify(scope.logger, scope.logic.block, 
			scope.logic.transaction, scope.db
		),
		process: new blocksProcess(
			scope.logger, scope.logic.block, scope.logic.peers, scope.logic.transaction,
			scope.schema, scope.db, scope.dbSequence, scope.sequence, scope.genesisblock
		),
		utils:   new blocksUtils(scope.logger, scope.logic.block, scope.logic.transaction, 
			scope.db, scope.dbSequence, scope.genesisblock
		),
		chain:   new blocksChain(
			scope.logger, scope.logic.block, scope.logic.transaction, scope.db,
			scope.genesisblock, scope.bus, scope.balancesSequence
		)
	};

	var promiseGrouper = function (promise) {
		if (promise && promise.table) {
			return promise.table;
		} else {
			throw 'Invalid promise';
		}
	};

	var typeIterator = function (type) {
		var values = [];

		_.each(type, function (promise) {
			if (promise && promise.values) {
				values = values.concat(promise.values);
			} else {
				throw 'Invalid promise';
			}
		});

		var inserts = new Inserts(type[0], values, true);
		t.none(inserts.template(), inserts);
	};

	var promises = _.flatMap(block.transactions, transactionIterator);
	_.each(_.groupBy(promises, promiseGrouper), typeIterator);

	return t;
};

// Apply the block, provided it has been verified.
__private.applyBlock = function (block, broadcast, cb, saveBlock) {
	// Prevent shutdown during database writes.
	__private.isActive = true;

	// Transactions to rewind in case of error.
	var appliedTransactions = {};

	// List of unconfirmed transactions ids.
	var unconfirmedTransactionIds;

	async.series({
		// Rewind any unconfirmed transactions before applying block.
		// TODO: It should be possible to remove this call if we can guarantee that only this function is processing transactions atomically. Then speed should be improved further.
		// TODO: Other possibility, when we rebuild from block chain this action should be moved out of the rebuild function.
		undoUnconfirmedList: function (seriesCb) {
			modules.transactions.undoUnconfirmedList(function (err, ids) {
				if (err) {
					// TODO: Send a numbered signal to be caught by forever to trigger a rebuild.
					return process.exit(0);
				} else {
					unconfirmedTransactionIds = ids;
					return setImmediate(seriesCb);
				}
			});
		},
		// Apply transactions to unconfirmed mem_accounts fields.
		applyUnconfirmed: function (seriesCb) {
			async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
				// DATABASE write
				modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
					// DATABASE: write
					modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
						if (err) {
							err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
							library.logger.error(err);
							library.logger.error('Transaction', transaction);
							return setImmediate(eachSeriesCb, err);
						}

						appliedTransactions[transaction.id] = transaction;

						// Remove the transaction from the node queue, if it was present.
						var index = unconfirmedTransactionIds.indexOf(transaction.id);
						if (index >= 0) {
							unconfirmedTransactionIds.splice(index, 1);
						}

						return setImmediate(eachSeriesCb);
					});
				});
			}, function (err) {
				if (err) {
					// Rewind any already applied unconfirmed transactions.
					// Leaves the database state as per the previous block.
					async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
						modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
							if (err) {
								return setImmediate(eachSeriesCb, err);
							}
							// The transaction has been applied?
							if (appliedTransactions[transaction.id]) {
								// DATABASE: write
								library.logic.transaction.undoUnconfirmed(transaction, sender, eachSeriesCb);
							} else {
								return setImmediate(eachSeriesCb);
							}
						});
					}, function (err) {
						return setImmediate(seriesCb, err);
					});
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		// Block and transactions are ok.
		// Apply transactions to confirmed mem_accounts fields.
		applyConfirmed: function (seriesCb) {
			async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
				modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
					if (err) {
						err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
						library.logger.error(err);
						library.logger.error('Transaction', transaction);
						// TODO: Send a numbered signal to be caught by forever to trigger a rebuild.
						process.exit(0);
					}
					// DATABASE: write
					modules.transactions.apply(transaction, block, sender, function (err) {
						if (err) {
							err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
							library.logger.error(err);
							library.logger.error('Transaction', transaction);
							// TODO: Send a numbered signal to be caught by forever to trigger a rebuild.
							process.exit(0);
						}
						// Transaction applied, removed from the unconfirmed list.
						modules.transactions.removeUnconfirmedTransaction(transaction.id);
						return setImmediate(eachSeriesCb);
					});
				});
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
		// Optionally save the block to the database.
		saveBlock: function (seriesCb) {
			__private.lastBlock = block;

			if (saveBlock) {
				// DATABASE: write
				__private.saveBlock(block, function (err) {
					if (err) {
						library.logger.error('Failed to save block...');
						library.logger.error('Block', block);
						// TODO: Send a numbered signal to be caught by forever to trigger a rebuild.
						process.exit(0);
					}

					library.logger.debug('Block applied correctly with ' + block.transactions.length + ' transactions');
					library.bus.message('newBlock', block, broadcast);

					// DATABASE write. Update delegates accounts
					modules.rounds.tick(block, seriesCb);
				});
			} else {
				library.bus.message('newBlock', block, broadcast);

				// DATABASE write. Update delegates accounts
				modules.rounds.tick(block, seriesCb);
			}
		},
		// Push back unconfirmed transactions list (minus the one that were on the block if applied correctly).
		// TODO: See undoUnconfirmedList discussion above.
		applyUnconfirmedIds: function (seriesCb) {
			// DATABASE write
			modules.transactions.applyUnconfirmedIds(unconfirmedTransactionIds, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
	}, function (err) {
		// Allow shutdown, database writes are finished.
		__private.isActive = false;

		// Nullify large objects.
		// Prevents memory leak during synchronisation.
		appliedTransactions = unconfirmedTransactionIds = block = null;

		// Finish here if snapshotting.
		if (err === 'Snapshot finished') {
			library.logger.info(err);
			process.emit('SIGTERM');
		}

		return setImmediate(cb, err);
	});
};

__private.checkTransaction = function (block, transaction, cb) {
	async.waterfall([
		function (waterCb) {
			try {
				transaction.id = library.logic.transaction.getId(transaction);
			} catch (e) {
				return setImmediate(waterCb, e.toString());
			}
			transaction.blockId = block.id;
			return setImmediate(waterCb);
		},
		function (waterCb) {
			// Check if transaction is already in database, otherwise fork 2.
			// DATABASE: read only
			library.logic.transaction.checkConfirmed(transaction, function (err) {
				if (err) {
					// Fork: Transaction already confirmed.
					modules.delegates.fork(block, 2);
					// Undo the offending transaction.
					// DATABASE: write
					modules.transactions.undoUnconfirmed(transaction, function (err2) {
						modules.transactions.removeUnconfirmedTransaction(transaction.id);
						return setImmediate(waterCb, err2 || err);
					});
				} else {
					return setImmediate(waterCb);
				}
			});
		},
		function (waterCb) {
			// Get account from database if any (otherwise cold wallet).
			// DATABASE: read only
			modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, waterCb);
		},
		function (sender, waterCb) {
			// Check if transaction id valid against database state (mem_* tables).
			// DATABASE: read only
			library.logic.transaction.verify(transaction, sender, waterCb);
		}
	], function (err) {
		return setImmediate(cb, err);
	});
};

__private.applyTransaction = function (block, transaction, sender, cb) {
	modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
		if (err) {
			return setImmediate(cb, {
				message: err,
				transaction: transaction,
				block: block
			});
		}

		modules.transactions.apply(transaction, block, sender, function (err) {
			if (err) {
				return setImmediate(cb, {
					message: 'Failed to apply transaction: ' + transaction.id,
					transaction: transaction,
					block: block
				});
			}
			return setImmediate(cb);
		});
	});
};

__private.afterSave = function (block, cb) {
	async.eachSeries(block.transactions, function (transaction, cb) {
		return library.logic.transaction.afterSave(transaction, cb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

__private.popLastBlock = function (oldLastBlock, cb) {
	library.balancesSequence.add(function (cb) {
		self.loadBlocksPart({ id: oldLastBlock.previousBlock }, function (err, previousBlock) {
			if (err || !previousBlock.length) {
				return setImmediate(cb, err || 'previousBlock is null');
			}
			previousBlock = previousBlock[0];

			async.eachSeries(oldLastBlock.transactions.reverse(), function (transaction, cb) {
				async.series([
					function (cb) {
						modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
							if (err) {
								return setImmediate(cb, err);
							}
							modules.transactions.undo(transaction, oldLastBlock, sender, cb);
						});
					}, function (cb) {
						modules.transactions.undoUnconfirmed(transaction, cb);
					}, function (cb) {
						return setImmediate(cb);
					}
				], cb);
			}, function (err) {
				modules.rounds.backwardTick(oldLastBlock, previousBlock, function () {
					__private.deleteBlock(oldLastBlock.id, function (err) {
						if (err) {
							return setImmediate(cb, err);
						}

						return setImmediate(cb, null, previousBlock);
					});
				});
			});
		});
	}, cb);
};

__private.deleteBlock = function (blockId, cb) {
	library.db.none(sql.deleteBlock, {id: blockId}).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#deleteBlock error');
	});
};

__private.recoverChain = function (cb) {
	library.logger.warn('Chain comparison failed, starting recovery');
	self.deleteLastBlock(function (err, newLastBlock) {
		if (err) {
			library.logger.error('Recovery failed');
		} else {
			library.logger.info('Recovery complete, new last block', newLastBlock.id);
		}
		return setImmediate(cb, err);
	});
};

__private.receiveBlock = function (block, cb) {
	library.logger.info([
		'Received new block id:', block.id,
		'height:', block.height,
		'round:',  modules.rounds.calc(modules.blocks.getLastBlock().height),
		'slot:', slots.getSlotNumber(block.timestamp),
		'reward:', modules.blocks.getLastBlock().reward
	].join(' '));

	self.lastReceipt(new Date());
	self.processBlock(block, true, cb, true);
};

// Public methods
Blocks.prototype.count = function (cb) {
	library.db.query(sql.countByRowId).then(function (rows) {
		var res = rows.length ? rows[0].count : 0;

		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#count error');
	});
};

Blocks.prototype.getLastBlock = function () {
	if (__private.lastBlock) {
		var epoch = constants.epochTime / 1000;
		var lastBlockTime = epoch + __private.lastBlock.timestamp;
		var currentTime = new Date().getTime() / 1000;

		__private.lastBlock.secondsAgo = Math.round((currentTime - lastBlockTime) * 1e2) / 1e2;
		__private.lastBlock.fresh = (__private.lastBlock.secondsAgo < constants.blockReceiptTimeOut);
	}

	return __private.lastBlock;
};

Blocks.prototype.lastReceipt = function (lastReceipt) {
	if (lastReceipt) {
		__private.lastReceipt = lastReceipt;
	}

	if (__private.lastReceipt) {
		var timeNow = new Date();
		__private.lastReceipt.secondsAgo = Math.floor((timeNow.getTime() - __private.lastReceipt.getTime()) / 1000);
		__private.lastReceipt.secondsAgo = Math.round(__private.lastReceipt.secondsAgo * 1e2) / 1e2;
		__private.lastReceipt.stale = (__private.lastReceipt.secondsAgo > constants.blockReceiptTimeOut);
	}

	return __private.lastReceipt;
};

Blocks.prototype.getCommonBlock = function (peer, height, cb) {
	var comparisionFailed = false;

	async.waterfall([
		function (waterCb) {
			__private.getIdSequence(height, function (err, res) {
				return setImmediate(waterCb, err, res);
			});
		},
		function (res, waterCb) {
			var ids = res.ids;

			if (library.config.peerProtocol === 'ws') {
				peer.attachRPC();
				peer.rpc.blocksCommon({ids: ids, peer: library.logic.peers.me()}, function (err, res) {
					if (err || !res.success) {
						return setImmediate(waterCb, err);
					} else if (!res.common) {
						comparisionFailed = true;
						return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using ids:', ids].join(' '));
					} else {
						return setImmediate(waterCb, null, res);
					}
				});
			} else {
				modules.transport.getFromPeer(peer, {
					api: '/blocks/common?ids=' + ids,
					method: 'GET'
				}, function (err, res) {
					if (err || res.body.error) {
						return setImmediate(waterCb, err || res.body.error.toString());
					} else if (!res.body.common) {
						comparisionFailed = true;
						return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using ids:', ids].join(' '));
					} else {
						return setImmediate(waterCb, null, res);
					}
				});
			}
		},
		function (res, waterCb) {
			if (library.config.peerProtocol === 'ws') {
				library.schema.validate(res.common, schema.getCommonBlock, function (err) {
					if (err) {
						return setImmediate(waterCb, err[0].message);
					} else {
						return setImmediate(waterCb, null, res);
					}
				});
			} else {
				library.schema.validate(res.body.common, schema.getCommonBlock, function (err) {
					if (err) {
						return setImmediate(waterCb, err[0].message);
					} else {
						return setImmediate(waterCb, null, res.body);
					}
				});
			}
		},
		function (res, waterCb) {
			library.db.query(sql.getCommonBlock(res.common.previousBlock), {
				id: res.common.id,
				previousBlock: res.common.previousBlock,
				height: res.common.height
			}).then(function (rows) {
				if (!rows.length || !rows[0].count) {
					comparisionFailed = true;
					return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using block:', JSON.stringify(res.common)].join(' '));
				} else {
					return setImmediate(waterCb, null, res.common);
				}
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(waterCb, 'Blocks#getCommonBlock error');
			});
		}
	], function (err, res) {
		if (comparisionFailed && modules.transport.poorConsensus()) {
			return __private.recoverChain(cb);
		} else {
			return setImmediate(cb, err, res);
		}
	});
};

Blocks.prototype.loadBlocksFromPeer = function (peer, cb) {
	var lastValidBlock = __private.lastBlock;

	peer = library.logic.peers.create(peer);
	library.logger.info('Loading blocks from: ' + peer.string);

	function getFromPeer (seriesCb) {

		if (library.config.peerProtocol === 'ws') {
			peer.rpc.blocks({lastBlockId: lastValidBlock.id, peer: library.logic.peers.me()}, function (err, res) {
				err = err || res.error;
				if (err) {
					return setImmediate(seriesCb, err);
				} else {
					return setImmediate(seriesCb, null, res.blocks);
				}
			});
		} else {
			modules.transport.getFromPeer(peer, {
				method: 'GET',
				api: '/blocks?lastBlockId=' + lastValidBlock.id
			}, function (err, res) {
				err = err || res.body.error;
				if (err) {
					return setImmediate(seriesCb, err);
				} else {
					return setImmediate(seriesCb, null, res.body.blocks);
				}
			});
		}

	}

	function validateBlocks (blocks, seriesCb) {
		var report = library.schema.validate(blocks, schema.loadBlocksFromPeer);

		if (!report) {
			return setImmediate(seriesCb, 'Received invalid blocks data');
		} else {
			return setImmediate(seriesCb, null, blocks);
		}
	}

	function processBlocks (blocks, seriesCb) {
		if (blocks.length === 0) {
			return setImmediate(seriesCb);
		}
		async.eachSeries(__private.readDbRows(blocks), function (block, eachSeriesCb) {
			if (__private.cleanup) {
				return setImmediate(eachSeriesCb);
			} else {
				return processBlock(block, eachSeriesCb);
			}
		}, function (err) {
			return setImmediate(seriesCb, err);
		});
	}

	function processBlock (block, seriesCb) {
		self.processBlock(block, false, function (err) {
			if (!err) {
				lastValidBlock = block;
				library.logger.info(['Block', block.id, 'loaded from:', peer.string].join(' '), 'height: ' + block.height);
			} else {
				var id = (block ? block.id : 'null');

				library.logger.debug('Block processing failed', {id: id, err: err.toString(), module: 'blocks', block: block});
			}
			return seriesCb(err);
		}, true);
	}

	async.waterfall([
		getFromPeer,
		validateBlocks,
		processBlocks
	], function (err) {
		if (err) {
			return setImmediate(cb, 'Error loading blocks: ' + (err.message || err), lastValidBlock);
		} else {
			return setImmediate(cb, null, lastValidBlock);
		}
	});
};

Blocks.prototype.loadBlocksData = function (filter, options, cb) {
	if (arguments.length < 3) {
		cb = options;
		options = {};
	}

	options = options || {};

	self = this;

	this.submodules.chain.saveGenesisBlock(function (err) {
		return setImmediate(cb, err, self);
	});
}

/**
 * PUBLIC METHODS
 */
/**
 * Last block functions, getter, setter and isFresh
 * @property {function} get Returns lastBlock
 * @property {function} set Sets lastBlock
 * @property {function} isFresh Returns status of last block - if it fresh or not
 */
Blocks.prototype.lastBlock = {
	get: function () {
		return __private.lastBlock;
	},
	set: function (lastBlock) {
		__private.lastBlock = lastBlock;
		return __private.lastBlock;
	},
	/**
	 * Returns status of last block - if it fresh or not
	 *
	 * @function isFresh
	 * @return {Boolean} Fresh status of last block
	 */
	isFresh: function () {
		if (!__private.lastBlock) { return false; }
		// Current time in seconds - (epoch start in seconds + block timestamp)
		var secondsAgo = Math.floor(Date.now() / 1000) - (Math.floor(constants.epochTime / 1000) + __private.lastBlock.timestamp);
		return (secondsAgo < constants.blockReceiptTimeOut);
	}
};

Blocks.prototype.generateBlock = function (keypair, timestamp, cb) {
	var transactions = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	var ready = [];

	async.eachSeries(transactions, function (transaction, cb) {
		modules.accounts.getAccount({ publicKey: transaction.senderPublicKey }, function (err, sender) {
			if (err || !sender) {
				return setImmediate(cb, 'Sender not found');
			}

			if (library.logic.transaction.ready(transaction, sender)) {
				library.logic.transaction.verify(transaction, sender, function (err) {
					ready.push(transaction);
					return setImmediate(cb);
				});
			} else {
				return setImmediate(cb);
			}
		});
	}, function () {
		var block;

		try {
			block = library.logic.block.create({
				keypair: keypair,
				timestamp: timestamp,
				previousBlock: __private.lastBlock,
				transactions: ready
			});
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, e);
		}


		self.processBlock(block, true, cb, true);
	});
};

// Main function to process a Block.
// * Verify the block looks ok
// * Verify the block is compatible with database state (DATABASE readonly)
// * Apply the block to database if both verifications are ok
Blocks.prototype.processBlock = function (block, broadcast, cb, saveBlock) {
	if (__private.cleanup) {
		return setImmediate(cb, 'Cleaning up');
	} else if (!__private.loaded) {
		return setImmediate(cb, 'Blockchain is loading');
	}
};

Blocks.prototype.isCleaning = {
	get: function () {
		return __private.cleanup;
	}
};

/**
 * Sandbox API wrapper
 *
 * @public
 * @async
 * @method sandboxApi
 * @param  {string}   call Name of the function to be called 
 * @param  {Object}   args Arguments
 * @param  {Function} cb Callback function
 */
Blocks.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(Blocks.prototype.shared, call, args, cb);
};

/**
 * Handle modules initialization.
 * Modules are not required in this file.
 * @param {modules} scope Exposed modules
 */
Blocks.prototype.onBind = function (scope) {
	// TODO: move here blocks submodules modules load from app.js.
	// Set module as loaded
	__private.loaded = true;
};

/**
 * Handle node shutdown request
 *
 * @public
 * @method cleanup
 * @listens module:app~event:cleanup
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 */
Blocks.prototype.cleanup = function (cb) {
	__private.loaded = false;
	__private.cleanup = true;

	if (!__private.isActive) {
		// Module ready for shutdown
		return setImmediate(cb);
	} else {
		// Module is not ready, repeat
		setImmediate(function nextWatch () {
			if (__private.isActive) {
				library.logger.info('Waiting for block processing to finish...');
				setTimeout(nextWatch, 10000); // 10 sec
			} else {
				return setImmediate(cb);
			}
		});
	}
};

/**
 * Get module loading status
 *
 * @public
 * @method isLoaded
 * @return {boolean} status Module loading status
 */
Blocks.prototype.isLoaded = function () {
	// Return 'true' if 'modules' are present
	return __private.loaded;
};


// Export
module.exports = Blocks;
