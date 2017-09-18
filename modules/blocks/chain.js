'use strict';

var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var Inserts = require('../../helpers/inserts.js');
var sql = require('../../sql/blocks.js');
var transactionTypes = require('../../helpers/transactionTypes.js');

var modules, library, self, __private = {};

/**
 * Initializes library.
 * @memberof module:blocks
 * @class
 * @classdesc Main Chain logic.
 * Allows set information.
 * @param {Object} logger
 * @param {Block} block
 * @param {Transaction} transaction
 * @param {Database} db
 * @param {Object} genesisblock
 * @param {bus} bus
 * @param {Sequence} balancesSequence
 */
function Chain (logger, block, transaction, db, genesisblock, bus, balancesSequence) {
	library = {
		logger: logger,
		db: db,
		genesisblock: genesisblock,
		bus: bus,
		balancesSequence: balancesSequence,
		logic: {
			block: block,
			transaction: transaction,
		},
	};
	self = this;

	library.logger.trace('Blocks->Chain: Submodule initialized.');
	return self;
}

/**
 * Save genesis block to database
 *
 * @async
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.saveGenesisBlock = function (cb) {
	// Check if genesis block ID already exists in the database
	// FIXME: Duplicated, there is another SQL query that we can use for that
	library.db.query(sql.getGenesisBlockId, { id: library.genesisblock.block.id }).then(function (rows) {
		var blockId = rows.length && rows[0].id;

		if (!blockId) {
			// If there is no block with genesis ID - save to database
			// WARNING: DB_WRITE
			// FIXME: This will fail if we already have genesis block in database, but with different ID
			self.saveBlock(library.genesisblock.block, function (err) {
				return setImmediate(cb, err);
			});
		} else {
			return setImmediate(cb);
		}
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#saveGenesisBlock error');
	});
};

/**
 * Save block with transactions to database
 *
 * @async
 * @param  {Object}   block Full normalized block
 * @param  {Function} cb Callback function
 * @return {Function|afterSave} cb If SQL transaction was OK - returns safterSave execution,
 *                                 if not returns callback function from params (through setImmediate)
 * @return {String}   cb.err Error if occurred
 */
Chain.prototype.saveBlock = function (block, cb) {
	// Prepare and execute SQL transaction
	// WARNING: DB_WRITE
	library.db.tx(function (t) {
		// Create bytea fields (buffers), and returns pseudo-row object promise-like
		var promise = library.logic.block.dbSave(block);
		// Initialize insert helper
		var inserts = new Inserts(promise, promise.values);

		var promises = [
			// Prepare insert SQL query
			t.none(inserts.template(), promise.values)
		];

		// Apply transactions inserts
		t = __private.promiseTransactions(t, block, promises);
		// Exec inserts as batch
		t.batch(promises);
	}).then(function () {
		// Execute afterSave for transactions
		return __private.afterSave(block, cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#saveBlock error');
	});
};

/**
 * Execute afterSave callback for transactions depends on transaction type
 *
 * @private
 * @async
 * @method afterSave
 * @param  {Object}   block Full normalized block
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
__private.afterSave = function (block, cb) {
	library.bus.message('transactionsSaved', block.transactions);
	async.eachSeries(block.transactions, function (transaction, cb) {
		return library.logic.transaction.afterSave(transaction, cb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Build a sequence of transaction queries
 * // FIXME: Processing here is not clean
 *
 * @private
 * @method promiseTransactions
 * @param  {Object} t SQL connection object
 * @param  {Object} block Full normalized block
 * @param  {Object} blockPromises Not used
 * @return {Object} t SQL connection object filled with inserts
 * @throws Will throw 'Invalid promise' when no promise, promise.values or promise.table
 */
__private.promiseTransactions = function (t, block, blockPromises) {
	if (_.isEmpty(block.transactions)) {
		return t;
	}

	var transactionIterator = function (transaction) {
		// Apply block ID to transaction
		transaction.blockId = block.id;
		// Create bytea fileds (buffers), and returns pseudo-row promise-like object
		return library.logic.transaction.dbSave(transaction);
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

		// Initialize insert helper
		var inserts = new Inserts(type[0], values, true);
		// Prepare insert SQL query
		t.none(inserts.template(), inserts);
	};

	var promises = _.flatMap(block.transactions, transactionIterator);
	_.each(_.groupBy(promises, promiseGrouper), typeIterator);

	return t;
};

/**
 * Deletes block from blocks table
 *
 * @private
 * @async
 * @method deleteBlock
 * @param  {number}   blockId ID of block to delete
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err String if SQL error occurred, null if success
 */
Chain.prototype.deleteBlock = function (blockId, cb) {
	// Delete block with ID from blocks table
	// WARNING: DB_WRITE
	library.db.none(sql.deleteBlock, {id: blockId}).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#deleteBlock error');
	});
};

/**
 * Deletes all blocks with height >= supplied block ID
 *
 * @public
 * @async
 * @method deleteAfterBlock
 * @param  {number}   blockId ID of block to begin with
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err SQL error
 * @return {Object}   cb.res SQL response
 */
Chain.prototype.deleteAfterBlock = function (blockId, cb) {
	library.db.query(sql.deleteAfterBlock, {id: blockId}).then(function (res) {
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#deleteAfterBlock error');
	});
};


/**
 * Apply genesis block's transactions to blockchain
 *
 * @private
 * @async
 * @method applyGenesisBlock
 * @param  {Object}   block Full normalized genesis block
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.applyGenesisBlock = function (block, cb) {
	// Sort transactions included in block
	block.transactions = block.transactions.sort(function (a, b) {
		if (a.type === transactionTypes.VOTE) {
			return 1;
		} else {
			return 0;
		}
	});
	// Initialize block progress tracker
	var tracker = modules.blocks.utils.getBlockProgressLogger(block.transactions.length, block.transactions.length / 100, 'Genesis block loading');
	async.eachSeries(block.transactions, function (transaction, cb) {
		// Apply transactions through setAccountAndGet, bypassing unconfirmed/confirmed states
		// FIXME: Poor performance - every transaction cause SQL query to be executed
		// WARNING: DB_WRITE
		modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
			if (err) {
				return setImmediate(cb, {
					message: err,
					transaction: transaction,
					block: block
				});
			}
			// Apply transaction to confirmed & unconfirmed balances
			// WARNING: DB_WRITE
			__private.applyTransaction(block, transaction, sender, cb);
			// Update block progress tracker
			tracker.applyNext();
		});
	}, function (err) {
		if (err) {
			// If genesis block is invalid, kill the node...
			return process.exit(0);
		} else {
			// Set genesis block as last block
			modules.blocks.lastBlock.set(block);
			return cb();
		}
	});
};

/**
 * Apply transaction to unconfirmed and confirmed
 *
 * @private
 * @async
 * @method applyTransaction
 * @param  {Object}   block Block object
 * @param  {Object}   transaction Transaction object
 * @param  {Object}   sender Sender account
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
__private.applyTransaction = function (block, transaction, sender, cb) {
	// FIXME: Not sure about flow here, when nodes have different transactions - 'applyUnconfirmed' can fail but 'apply' can be ok
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

/**
 * Apply verified block
 *
 * @private
 * @async
 * @method applyBlock
 * @emits  SIGTERM
 * @param  {Object}   block Full normalized block
 * @param  {boolean}  saveBlock Indicator that block needs to be saved to database
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.applyBlock = function (block, saveBlock, cb) {
	// Prevent shutdown during database writes.
	modules.blocks.isActive.set(true);

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
					// Fatal error, memory tables will be inconsistent
					library.logger.error('Failed to undo unconfirmed list', err);

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
						// Fatal error, memory tables will be inconsistent
						err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
						library.logger.error(err);
						library.logger.error('Transaction', transaction);

						return process.exit(0);
					}
					// DATABASE: write
					modules.transactions.apply(transaction, block, sender, function (err) {
						if (err) {
							// Fatal error, memory tables will be inconsistent
							err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
							library.logger.error(err);
							library.logger.error('Transaction', transaction);

							return process.exit(0);
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
			modules.blocks.lastBlock.set(block);

			if (saveBlock) {
				// DATABASE: write
				self.saveBlock(block, function (err) {
					if (err) {
						// Fatal error, memory tables will be inconsistent
						library.logger.error('Failed to save block...');
						library.logger.error('Block', block);

						return process.exit(0);
					}

					library.logger.debug('Block applied correctly with ' + block.transactions.length + ' transactions');

					return seriesCb();
				});
			} else {
				return seriesCb();
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
		modules.blocks.isActive.set(false);

		// Nullify large objects.
		// Prevents memory leak during synchronisation.
		appliedTransactions = unconfirmedTransactionIds = block = null;

		// Finish here if snapshotting.
		// FIXME: Not the best place to do that
		if (err === 'Snapshot finished') {
			library.logger.info(err);
			process.emit('SIGTERM');
		}

		return setImmediate(cb, err);
	});
};

/**
 * Broadcast reduced block to increase network performance.
 * @param {Object} reducedBlock reduced block
 * @param {Number} blockId
 * @param {boolean} broadcast Indicator that block needs to be broadcasted
 */
Chain.prototype.broadcastReducedBlock = function (reducedBlock, blockId, broadcast) {
	library.bus.message('newBlock', reducedBlock, broadcast);
	library.logger.debug(['reducedBlock', blockId, 'broadcasted correctly'].join(' '));
};

/**
 * Deletes last block, undo transactions, recalculate round
 *
 * @private
 * @async
 * @method popLastBlock
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error
 * @return {Object}   cb.obj New last block
 */
__private.popLastBlock = function (oldLastBlock, cb) {
	// Execute in sequence via balancesSequence
	library.balancesSequence.add(function (cb) {
		// Load previous block from full_blocks_list table
		// TODO: Can be inefficient, need performnce tests
		modules.blocks.utils.loadBlocksPart({ id: oldLastBlock.previousBlock }, function (err, previousBlock) {
			if (err || !previousBlock.length) {
				return setImmediate(cb, err || 'previousBlock is null');
			}
			previousBlock = previousBlock[0];

			// Reverse order of transactions in last blocks...
			async.eachSeries(oldLastBlock.transactions.reverse(), function (transaction, cb) {
				async.series([
					function (cb) {
						// Retrieve sender by public key
						modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
							if (err) {
								return setImmediate(cb, err);
							}
							// Undoing confirmed tx - refresh confirmed balance (see: logic.transaction.undo, logic.transfer.undo)
							// WARNING: DB_WRITE
							modules.transactions.undo(transaction, oldLastBlock, sender, cb);
						});
					}, function (cb) {
						// Undoing unconfirmed tx - refresh unconfirmed balance (see: logic.transaction.undoUnconfirmed)
						// WARNING: DB_WRITE
						modules.transactions.undoUnconfirmed(transaction, cb);
					}, function (cb) {
						return setImmediate(cb);
					}
				], cb);
			}, function (err) {
				if (err) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error('Failed to undo transactions', err);

					return process.exit(0);
				}

				// Delete last block from blockchain
				// WARNING: DB_WRITE
				self.deleteBlock(oldLastBlock.id, function (err) {
					if (err) {
						// Fatal error, memory tables will be inconsistent
						library.logger.error('Failed to delete block', err);

						return process.exit(0);
					}

					return setImmediate(cb, null, previousBlock);
				});
			});
		});
	}, cb);
};

/**
 * Deletes last block
 *
 * @public
 * @async
 * @method deleteLastBlock
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.obj New last block
 */
Chain.prototype.deleteLastBlock = function (cb) {
	var lastBlock = modules.blocks.lastBlock.get();
	library.logger.warn('Deleting last block', lastBlock);

	if (lastBlock.height === 1) {
		return setImmediate(cb, 'Cannot delete genesis block');
	}

	// Delete last block, replace last block with previous block, undo things
	__private.popLastBlock(lastBlock, function (err, newLastBlock) {
		if (err) {
			library.logger.error('Error deleting last block', lastBlock);
		} else {
			// Replace last block with previous
			lastBlock = modules.blocks.lastBlock.set(newLastBlock);
		}
		return setImmediate(cb, err, lastBlock);
	});
};

/**
 * Recover chain - wrapper for deleteLastBlock
 *
 * @private
 * @async
 * @method recoverChain
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.recoverChain = function (cb) {
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

/**
 * Handle modules initialization:
 * - accounts
 * - blocks
 * - transactions
 * @param {modules} scope Exposed modules
 */
Chain.prototype.onBind = function (scope) {
	library.logger.trace('Blocks->Chain: Shared modules bind.');
	modules = {
		accounts: scope.accounts,
		blocks: scope.blocks,
		transactions: scope.transactions,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Chain;
