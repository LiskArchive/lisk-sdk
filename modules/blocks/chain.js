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
var transactionTypes = require('../../helpers/transaction_types.js');
var Promise = require('bluebird');

var modules;
var library;
var self;
var __private = {};

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
function Chain(
	logger,
	block,
	transaction,
	db,
	genesisblock,
	bus,
	balancesSequence
) {
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
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.saveGenesisBlock = function(cb) {
	// Check if genesis block ID already exists in the database
	// FIXME: Duplicated, there is another SQL query that we can use for that
	library.db.blocks
		.getGenesisBlockId(library.genesisblock.block.id)
		.then(rows => {
			var blockId = rows.length && rows[0].id;

			if (!blockId) {
				// If there is no block with genesis ID - save to database
				// WARNING: DB_WRITE
				// FIXME: This will fail if we already have genesis block in database, but with different ID
				self.saveBlock(library.genesisblock.block, err =>
					setImmediate(cb, err)
				);
			} else {
				return setImmediate(cb);
			}
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#saveGenesisBlock error');
		});
};

/**
 * Save block with transactions to database
 *
 * @async
 * @param  {Object}   block Full normalized block
 * @param  {function} cb Callback function
 * @return {Function|afterSave} cb If SQL transaction was OK - returns safterSave execution,
 *                                 if not returns callback function from params (through setImmediate)
 * @return {string}   cb.err Error if occurred
 */
Chain.prototype.saveBlock = function(block, cb, tx) {
	block.transactions.map(transaction => {
		transaction.blockId = block.id;

		return transaction;
	});

	function saveBlockBatch(tx) {
		var promises = [tx.blocks.save(block)];

		if (block.transactions.length) {
			promises.push(tx.transactions.save(block.transactions));
		}

		tx
			.batch(promises)
			.then(() => __private.afterSave(block, cb))
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Blocks#saveBlock error');
			});
	}

	// If there is already a running transaction use it
	if (tx) {
		saveBlockBatch(tx);
	} else {
		// Prepare and execute SQL transaction
		// WARNING: DB_WRITE
		library.db.tx('Chain:saveBlock', t => {
			saveBlockBatch(t);
		});
	}
};

/**
 * Execute afterSave callback for transactions depends on transaction type
 *
 * @private
 * @async
 * @method afterSave
 * @param  {Object}   block Full normalized block
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
__private.afterSave = function(block, cb) {
	library.bus.message('transactionsSaved', block.transactions);
	async.eachSeries(
		block.transactions,
		(transaction, cb) => library.logic.transaction.afterSave(transaction, cb),
		err => setImmediate(cb, err)
	);
};

/**
 * Deletes block from blocks table
 *
 * @private
 * @async
 * @method deleteBlock
 * @param  {number}   blockId ID of block to delete
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err String if SQL error occurred, null if success
 */
Chain.prototype.deleteBlock = function(blockId, cb) {
	// Delete block with ID from blocks table
	// WARNING: DB_WRITE
	library.db.blocks
		.deleteBlock(blockId)
		.then(() => setImmediate(cb))
		.catch(err => {
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
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err SQL error
 * @return {Object}   cb.res SQL response
 */
Chain.prototype.deleteAfterBlock = function(blockId, cb) {
	library.db.blocks
		.deleteAfterBlock(blockId)
		.then(res => setImmediate(cb, null, res))
		.catch(err => {
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
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.applyGenesisBlock = function(block, cb) {
	// Sort transactions included in block
	block.transactions = block.transactions.sort(a => {
		if (a.type === transactionTypes.VOTE) {
			return 1;
		} else {
			return 0;
		}
	});
	// Initialize block progress tracker
	var tracker = modules.blocks.utils.getBlockProgressLogger(
		block.transactions.length,
		block.transactions.length / 100,
		'Genesis block loading'
	);
	async.eachSeries(
		block.transactions,
		(transaction, cb) => {
			// Apply transactions through setAccountAndGet, bypassing unconfirmed/confirmed states
			// FIXME: Poor performance - every transaction cause SQL query to be executed
			// WARNING: DB_WRITE
			modules.accounts.setAccountAndGet(
				{ publicKey: transaction.senderPublicKey },
				(err, sender) => {
					if (err) {
						return setImmediate(cb, {
							message: err,
							transaction: transaction,
							block: block,
						});
					}
					// Apply transaction to confirmed & unconfirmed balances
					// WARNING: DB_WRITE
					__private.applyTransaction(block, transaction, sender, cb);
					// Update block progress tracker
					tracker.applyNext();
				}
			);
		},
		err => {
			if (err) {
				// If genesis block is invalid, kill the node...
				return process.exit(0);
			} else {
				// Set genesis block as last block
				modules.blocks.lastBlock.set(block);
				// Tick round
				// WARNING: DB_WRITE
				modules.rounds.tick(block, cb);
			}
		}
	);
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
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
__private.applyTransaction = function(block, transaction, sender, cb) {
	// FIXME: Not sure about flow here, when nodes have different transactions - 'applyUnconfirmed' can fail but 'apply' can be ok
	modules.transactions.applyUnconfirmed(transaction, sender, err => {
		if (err) {
			return setImmediate(cb, {
				message: err,
				transaction: transaction,
				block: block,
			});
		}

		modules.transactions.apply(transaction, block, sender, err => {
			if (err) {
				return setImmediate(cb, {
					message: `Failed to apply transaction: ${transaction.id}`,
					transaction: transaction,
					block: block,
				});
			}
			return setImmediate(cb);
		});
	});
};

Chain.prototype.applyBlock = function(block, saveBlock, cb) {
	// Transactions to rewind in case of error.
	var appliedTransactions = {};

	var undoUnconfirmedListStep = function(tx) {
		return new Promise((resolve, reject) => {
			modules.transactions.undoUnconfirmedList(err => {
				if (err) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error('Failed to undo unconfirmed list', err);
					var errObj = new Error('Failed to undo unconfirmed list');
					reject(errObj);
				} else {
					return setImmediate(resolve);
				}
			}, tx);
		});
	};

	// Apply transactions to unconfirmed mem_accounts fields
	var applyUnconfirmedStep = function(tx) {
		return Promise.mapSeries(
			block.transactions,
			transaction =>
				new Promise((resolve, reject) => {
					modules.accounts.setAccountAndGet(
						{ publicKey: transaction.senderPublicKey },
						(err, sender) => {
							// DATABASE: write
							modules.transactions.applyUnconfirmed(
								transaction,
								sender,
								err => {
									if (err) {
										err = [
											'Failed to apply transaction:',
											transaction.id,
											'-',
											err,
										].join(' ');
										library.logger.error(err);
										library.logger.error('Transaction', transaction);
										return setImmediate(reject, err);
									}

									appliedTransactions[transaction.id] = transaction;

									return setImmediate(resolve);
								},
								tx
							);
						},
						tx
					);
				})
		).catch(() =>
			Promise.mapSeries(
				block.transactions,
				transaction =>
					new Promise((resolve, reject) => {
						// Rewind any already applied unconfirmed transactions
						// Leaves the database state as per the previous block
						modules.accounts.getAccount(
							{ publicKey: transaction.senderPublicKey },
							(err, sender) => {
								if (err) {
									return setImmediate(reject, err);
								}
								// The transaction has been applied?
								if (appliedTransactions[transaction.id]) {
									// DATABASE: write
									library.logic.transaction.undoUnconfirmed(
										transaction,
										sender,
										error => {
											if (error) {
												return setImmediate(reject, error);
											} else {
												return setImmediate(resolve);
											}
										},
										tx
									);
								} else {
									return setImmediate(resolve);
								}
							},
							tx
						);
					})
			)
		);
	};

	var applyConfirmedStep = function(tx) {
		return Promise.mapSeries(
			block.transactions,
			transaction =>
				new Promise((resolve, reject) => {
					modules.accounts.getAccount(
						{ publicKey: transaction.senderPublicKey },
						(err, sender) => {
							if (err) {
								// Fatal error, memory tables will be inconsistent
								err = [
									'Failed to apply transaction:',
									transaction.id,
									'-',
									err,
								].join(' ');
								library.logger.error(err);
								library.logger.error('Transaction', transaction);

								reject(err);
							}
							// DATABASE: write
							modules.transactions.apply(
								transaction,
								block,
								sender,
								err => {
									if (err) {
										// Fatal error, memory tables will be inconsistent
										err = [
											'Failed to apply transaction:',
											transaction.id,
											'-',
											err,
										].join(' ');
										library.logger.error(err);
										library.logger.error('Transaction', transaction);

										reject(err);
									}
									// Transaction applied, removed from the unconfirmed list
									modules.transactions.removeUnconfirmedTransaction(
										transaction.id
									);
									return setImmediate(resolve);
								},
								tx
							);
						},
						tx
					);
				})
		);
	};

	var saveBlockStep = function(tx) {
		return new Promise((resolve, reject) => {
			modules.blocks.lastBlock.set(block);

			if (saveBlock) {
				// DATABASE: write
				self.saveBlock(
					block,
					err => {
						if (err) {
							// Fatal error, memory tables will be inconsistent
							library.logger.error('Failed to save block...', err);
							library.logger.error('Block', block);
							var errObj = new Error('Failed to save block');
							reject(errObj);
						}

						library.logger.debug(
							`Block applied correctly with ${
								block.transactions.length
							} transactions`
						);
						library.bus.message('newBlock', block);

						// DATABASE write. Update delegates accounts
						modules.rounds.tick(block, resolve);
					},
					tx
				);
			} else {
				library.bus.message('newBlock', block);

				// DATABASE write. Update delegates accounts
				modules.rounds.tick(block, resolve);
			}
		});
	};

	library.db
		.tx('Chain:applyBlock', tx => {
			modules.blocks.isActive.set(true);

			return undoUnconfirmedListStep(tx)
				.then(() => applyUnconfirmedStep(tx))
				.then(() => applyConfirmedStep(tx))
				.then(() => saveBlockStep(tx));
		})
		.then(() => {
			modules.blocks.isActive.set(false);
			appliedTransactions = block = null;

			return setImmediate(cb, null);
		})
		.catch(reason => {
			modules.blocks.isActive.set(false);
			appliedTransactions = block = null;

			// Finish here if snapshotting.
			// FIXME: Not the best place to do that
			if (reason === 'Snapshot finished') {
				library.logger.info(reason);
				process.emit('SIGTERM');
			}

			return setImmediate(cb, reason);
		});
};

/**
 * Broadcast reduced block to increase network performance.
 * @param {Object} reducedBlock Block without empty/insignificant properties
 * @param {boolean} broadcast Indicator that block needs to be broadcasted
 */
Chain.prototype.broadcastReducedBlock = function(reducedBlock, broadcast) {
	library.bus.message('broadcastBlock', reducedBlock, broadcast);
};

/**
 * Deletes last block, undo transactions, recalculate round
 *
 * @private
 * @async
 * @method popLastBlock
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error
 * @return {Object}   cb.obj New last block
 */
__private.popLastBlock = function(oldLastBlock, cb) {
	// Execute in sequence via balancesSequence
	library.balancesSequence.add(cb => {
		// Load previous block from full_blocks_list table
		// TODO: Can be inefficient, need performnce tests
		modules.blocks.utils.loadBlocksPart(
			{ id: oldLastBlock.previousBlock },
			(err, previousBlock) => {
				if (err || !previousBlock.length) {
					return setImmediate(cb, err || 'previousBlock is null');
				}
				previousBlock = previousBlock[0];

				// Reverse order of transactions in last blocks...
				async.eachSeries(
					oldLastBlock.transactions.reverse(),
					(transaction, cb) => {
						async.series(
							[
								function(cb) {
									// Retrieve sender by public key
									modules.accounts.getAccount(
										{ publicKey: transaction.senderPublicKey },
										(err, sender) => {
											if (err) {
												return setImmediate(cb, err);
											}
											// Undoing confirmed transaction - refresh confirmed balance (see: logic.transaction.undo, logic.transfer.undo)
											// WARNING: DB_WRITE
											modules.transactions.undo(
												transaction,
												oldLastBlock,
												sender,
												cb
											);
										}
									);
								},
								function(cb) {
									// Undoing unconfirmed transaction - refresh unconfirmed balance (see: logic.transaction.undoUnconfirmed)
									// WARNING: DB_WRITE
									modules.transactions.undoUnconfirmed(transaction, cb);
								},
								function(cb) {
									return setImmediate(cb);
								},
							],
							cb
						);
					},
					err => {
						if (err) {
							// Fatal error, memory tables will be inconsistent
							library.logger.error('Failed to undo transactions', err);

							return process.exit(0);
						}

						// Perform backward tick on rounds
						// WARNING: DB_WRITE
						modules.rounds.backwardTick(oldLastBlock, previousBlock, err => {
							if (err) {
								// Fatal error, memory tables will be inconsistent
								library.logger.error('Failed to perform backwards tick', err);

								return process.exit(0);
							}

							// Delete last block from blockchain
							// WARNING: Db_WRITE
							self.deleteBlock(oldLastBlock.id, err => {
								if (err) {
									// Fatal error, memory tables will be inconsistent
									library.logger.error('Failed to delete block', err);

									return process.exit(0);
								}

								return setImmediate(cb, null, previousBlock);
							});
						});
					}
				);
			}
		);
	}, cb);
};

/**
 * Deletes last block
 *
 * @public
 * @async
 * @method deleteLastBlock
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.obj New last block
 */
Chain.prototype.deleteLastBlock = function(cb) {
	var lastBlock = modules.blocks.lastBlock.get();
	library.logger.warn('Deleting last block', lastBlock);

	if (lastBlock.height === 1) {
		return setImmediate(cb, 'Cannot delete genesis block');
	}

	async.waterfall(
		[
			function(seriesCb) {
				// Delete last block, replace last block with previous block, undo things
				__private.popLastBlock(lastBlock, (err, newLastBlock) => {
					if (err) {
						library.logger.error('Error deleting last block', lastBlock);
					}
					return setImmediate(seriesCb, err, newLastBlock);
				});
			},
			function(newLastBlock, seriesCb) {
				// Put transactions back into transaction pool
				modules.transactions.receiveTransactions(
					lastBlock.transactions.reverse(),
					false,
					err => {
						if (err) {
							library.logger.error('Error adding transactions', lastBlock);
						}
						// Replace last block with previous
						lastBlock = modules.blocks.lastBlock.set(newLastBlock);
						return setImmediate(seriesCb, err, lastBlock);
					}
				);
			},
		],
		cb
	);
};

/**
 * Recover chain - wrapper for deleteLastBlock
 *
 * @private
 * @async
 * @method recoverChain
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Chain.prototype.recoverChain = function(cb) {
	library.logger.warn('Chain comparison failed, starting recovery');
	self.deleteLastBlock((err, newLastBlock) => {
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
 * - rounds
 * - transactions
 * @param {modules} scope Exposed modules
 */
Chain.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Chain: Shared modules bind.');
	modules = {
		accounts: scope.accounts,
		blocks: scope.blocks,
		rounds: scope.rounds,
		transactions: scope.transactions,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Chain;
