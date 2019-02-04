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

const Promise = require('bluebird');
const async = require('async');
const _ = require('lodash');
const transactionTypes = require('../../helpers/transaction_types.js');
const Bignum = require('../../helpers/bignum.js');
const {
	CACHE_KEYS_DELEGATES,
	CACHE_KEYS_TRANSACTION_COUNT,
} = require('../../../../../../framework/src/components/cache');

let components;
let modules;
let library;
let self;
const __private = {};

/**
 * Main chain logic. Allows set information. Initializes library.
 *
 * @class
 * @memberof modules.blocks
 * @see Parent: {@link modules.blocks}
 * @requires async
 * @requires bluebird
 * @requires helpers/transaction_types
 * @param {Object} logger
 * @param {Block} block
 * @param {Transaction} transaction
 * @param {Storage} storage
 * @param {Object} genesisBlock
 * @param {bus} bus
 * @param {Sequence} balancesSequence
 * @todo Add description for the params
 */
class Chain {
	constructor(
		logger,
		block,
		transaction,
		storage,
		genesisBlock,
		bus,
		balancesSequence
	) {
		library = {
			logger,
			storage,
			genesisBlock,
			bus,
			balancesSequence,
			logic: {
				block,
				transaction,
			},
		};
		self = this;

		library.logger.trace('Blocks->Chain: Submodule initialized.');
		return self;
	}
}

/**
 * Save genesis block to database.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
Chain.prototype.saveGenesisBlock = function(cb) {
	// Check if genesis block ID already exists in the database
	library.storage.entities.Block.isPersisted({
		id: library.genesisBlock.block.id,
	})
		.then(isPersisted => {
			if (isPersisted) {
				return setImmediate(cb);
			}

			// If there is no block with genesis ID - save to database
			// WARNING: DB_WRITE
			// FIXME: This will fail if we already have genesis block in database, but with different ID
			return self.saveBlock(library.genesisBlock.block, err =>
				setImmediate(cb, err)
			);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#saveGenesisBlock error');
		});
};

/**
 * Save block with transactions to database.
 *
 * @param {Object} block - Full normalized block
 * @param {function} cb - Callback function
 * @returns {Function|afterSave} cb - If SQL transaction was OK - returns safterSave execution, if not returns callback function from params (through setImmediate)
 * @returns {string} cb.err - Error if occurred
 */
Chain.prototype.saveBlock = function(block, cb, tx) {
	// Parse block data to storage module
	const parsedBlock = _.cloneDeep(block);
	if (parsedBlock.reward) {
		parsedBlock.reward = parsedBlock.reward.toString();
	}
	if (parsedBlock.totalAmount) {
		parsedBlock.totalAmount = parsedBlock.totalAmount.toString();
	}
	if (parsedBlock.totalFee) {
		parsedBlock.totalFee = parsedBlock.totalFee.toString();
	}
	parsedBlock.previousBlockId = parsedBlock.previousBlock;
	delete parsedBlock.previousBlock;

	parsedBlock.transactions.map(transaction => {
		transaction.blockId = parsedBlock.id;
		return transaction;
	});

	function saveBlockBatch(saveBlockBatchTx) {
		const promises = [
			library.storage.entities.Block.create(parsedBlock, {}, saveBlockBatchTx),
		];

		if (parsedBlock.transactions.length) {
			promises.push(
				library.storage.entities.Transaction.create(
					parsedBlock.transactions,
					{},
					saveBlockBatchTx
				)
			);
		}

		saveBlockBatchTx
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
		library.storage.entities.Block.begin('Chain:saveBlock', t => {
			saveBlockBatch(t);
		});
	}
};

/**
 * Execute afterSave callback for transactions depends on transaction type.
 * It clears all cache entries if there is a delegate type transaction after
 * transactions saved.
 *
 * @private
 * @param {Object} block - Full normalized block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.afterSave = async function(block, cb) {
	if (components && components.cache && components.cache.isReady()) {
		library.logger.debug(
			['Cache - chain afterSave', '| Status:', components.cache.isReady()].join(
				' '
			)
		);
		const delegateTransaction = block.transactions.find(
			transaction =>
				!!transaction && transaction.type === transactionTypes.DELEGATE
		);
		if (delegateTransaction) {
			try {
				await components.cache.removeByPattern(CACHE_KEYS_DELEGATES);
				library.logger.debug(
					[
						'Cache - Keys with pattern:',
						CACHE_KEYS_DELEGATES,
						'cleared from cache on delegate transaction',
					].join(' ')
				);
				await components.cache.deleteJsonForKey(CACHE_KEYS_TRANSACTION_COUNT);
				components.cache.logger.debug(
					`Cache - Keys ${CACHE_KEYS_TRANSACTION_COUNT} cleared from cache on chain afterSave`
				);
			} catch (err) {
				library.logger.error(
					['Cache - Error clearing keys', 'on chain afterSave function'].join(
						' '
					)
				);
			}
		}
	}

	async.eachSeries(
		block.transactions,
		(transaction, eachSeriesCb) =>
			library.logic.transaction.afterSave(transaction, eachSeriesCb),
		err => setImmediate(cb, err)
	);
};

/**
 * Deletes block from blocks table.
 *
 * @param {number} blockId - ID of block to delete
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - String if SQL error occurred, null if success
 */
Chain.prototype.deleteBlock = function(blockId, cb, tx) {
	// Delete block with ID from blocks table
	// WARNING: DB_WRITE
	library.storage.entities.Block.delete({ id: blockId }, {}, tx)
		.then(() => setImmediate(cb))
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#deleteBlock error');
		});
};

/**
 * Deletes all blocks with height >= supplied block ID.
 *
 * @param {number} blockId - ID of block to begin with
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - SQL error
 * @returns {Object} cb.res - SQL response
 */
Chain.prototype.deleteFromBlockId = async function(blockId, cb) {
	try {
		const block = await library.storage.entities.Block.getOne({ id: blockId });
		const result = await library.storage.entities.Block.delete({
			height_gte: block.height,
		});
		return setImmediate(cb, null, result);
	} catch (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#deleteFromBlockId error');
	}
};

/**
 * Apply genesis block's transactions to blockchain.
 *
 * @param {Object} block - Full normalized genesis block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
Chain.prototype.applyGenesisBlock = function(block, cb) {
	// Sort transactions included in block
	block.transactions = block.transactions.sort(a => {
		if (a.type === transactionTypes.VOTE) {
			return 1;
		}
		return 0;
	});
	// Initialize block progress tracker
	const tracker = modules.blocks.utils.getBlockProgressLogger(
		block.transactions.length,
		block.transactions.length / 100,
		'Genesis block loading'
	);
	async.eachSeries(
		block.transactions,
		(transaction, eachSeriesCb) => {
			// Apply transactions through setAccountAndGet, bypassing unconfirmed/confirmed states
			// FIXME: Poor performance - every transaction cause SQL query to be executed
			// WARNING: DB_WRITE

			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);

			modules.accounts.setAccountAndGet(
				{ publicKey: transaction.senderPublicKey },
				(err, sender) => {
					if (err) {
						return setImmediate(eachSeriesCb, {
							message: err,
							transaction,
							block,
						});
					}
					// Apply transaction to confirmed & unconfirmed balances
					// WARNING: DB_WRITE
					__private.applyTransaction(block, transaction, sender, eachSeriesCb);
					// Update block progress tracker
					return tracker.applyNext();
				}
			);
		},
		err => {
			if (err) {
				// If genesis block is invalid, kill the node...
				process.emit('cleanup', err.message);
				return setImmediate(cb, err);
			}
			// Set genesis block as last block
			modules.blocks.lastBlock.set(block);
			// Tick round
			// WARNING: DB_WRITE
			return modules.rounds.tick(block, cb);
		}
	);
};

/**
 * Apply transaction to unconfirmed and confirmed.
 *
 * @private
 * @param {Object} block - Block object
 * @param {Object} transaction - Transaction object
 * @param {Object} sender - Sender account
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.applyTransaction = function(block, transaction, sender, cb) {
	// FIXME: Not sure about flow here, when nodes have different transactions - 'applyUnconfirmed' can fail but 'applyConfirmed' can be ok
	modules.transactions.applyUnconfirmed(transaction, sender, err => {
		if (err) {
			return setImmediate(cb, {
				message: err,
				transaction,
				block,
			});
		}

		return modules.transactions.applyConfirmed(
			transaction,
			block,
			sender,
			applyConfirmedErr => {
				if (applyConfirmedErr) {
					return setImmediate(cb, {
						message: `Failed to apply transaction: ${
							transaction.id
						} to confirmed state of account:`,
						transaction,
						block,
					});
				}
				return setImmediate(cb);
			}
		);
	});
};

/**
 * Calls undoUnconfirmedList from modules transactions
 *
 * @private
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object}   cb.err - Error if occurred
 */
__private.undoUnconfirmedListStep = function(cb) {
	return modules.transactions.undoUnconfirmedList(err => {
		if (err) {
			// Fatal error, memory tables will be inconsistent
			library.logger.error('Failed to undo unconfirmed list', err);
			return setImmediate(cb, 'Failed to undo unconfirmed list');
		}
		return setImmediate(cb);
	});
};

/**
 * Calls applyUnconfirmed from modules.transactions for each transaction in block
 *
 * @private
 * @param {Object} block - Block object
 * @param {function} tx - Postgres transaction
 * @returns {Promise<reject|resolve>} new Promise. Resolve if ok, reject if error ocurred
 * @todo check descriptions
 */
__private.applyUnconfirmedStep = function(block, tx) {
	return Promise.mapSeries(
		block.transactions,
		transaction =>
			new Promise((resolve, reject) => {
				modules.accounts.setAccountAndGet(
					{ publicKey: transaction.senderPublicKey },
					(accountErr, sender) => {
						if (accountErr) {
							const err = `Failed to get account to apply unconfirmed transaction: ${
								transaction.id
							} - ${accountErr}`;
							library.logger.error(err);
							library.logger.error('Transaction', transaction);
							return setImmediate(reject, new Error(err));
						}
						// DATABASE: write
						return modules.transactions.applyUnconfirmed(
							transaction,
							sender,
							err => {
								if (err) {
									err = `Failed to apply transaction: ${
										transaction.id
									} to unconfirmed state of account - ${err}`;
									library.logger.error(err);
									library.logger.error('Transaction', transaction);
									return setImmediate(reject, new Error(err));
								}

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

/**
 * Calls applyConfirmed from modules.transactions for each transaction in block after get serder with modules.accounts.getAccount
 *
 * @private
 * @param {Object} block - Block object
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
__private.applyConfirmedStep = function(block, tx) {
	return Promise.mapSeries(
		block.transactions,
		transaction =>
			new Promise((resolve, reject) => {
				modules.accounts.getAccount(
					{ publicKey: transaction.senderPublicKey },
					(accountErr, sender) => {
						if (accountErr) {
							const err = `Failed to get account for applying transaction to confirmed state: ${
								transaction.id
							} - ${accountErr}`;
							library.logger.error(err);
							library.logger.error('Transaction', transaction);
							return setImmediate(reject, new Error(err));
						}
						// DATABASE: write
						return modules.transactions.applyConfirmed(
							transaction,
							block,
							sender,
							err => {
								if (err) {
									// Fatal error, memory tables will be inconsistent
									err = `Failed to apply transaction: ${
										transaction.id
									} to confirmed state of account - ${err}`;
									library.logger.error(err);
									library.logger.error('Transaction', transaction);

									return setImmediate(reject, new Error(err));
								}
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

/**
 * Calls applyConfirmed from modules.transactions for each transaction in block after get serder with modules.accounts.getAccount
 *
 * @private
 * @param {Object} block - Block object
 * @param {boolean} saveBlock - Flag to save block into database
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
__private.saveBlockStep = function(block, saveBlock, tx) {
	return new Promise((resolve, reject) => {
		if (saveBlock) {
			// DATABASE: write
			self.saveBlock(
				block,
				err => {
					if (err) {
						// Fatal error, memory tables will be inconsistent
						library.logger.error('Failed to save block...', err);
						library.logger.error('Block', block);
						return setImmediate(reject, new Error('Failed to save block'));
					}

					library.logger.debug(
						`Block applied correctly with ${
							block.transactions.length
						} transactions`
					);

					// DATABASE write. Update delegates accounts
					return modules.rounds.tick(
						block,
						tickErr => {
							if (tickErr) {
								return setImmediate(reject, tickErr);
							}

							library.bus.message('newBlock', block);
							modules.blocks.lastBlock.set(block);
							return setImmediate(resolve);
						},
						tx
					);
				},
				tx
			);
		} else {
			// DATABASE write. Update delegates accounts
			modules.rounds.tick(
				block,
				err => {
					if (err) {
						return setImmediate(reject, err);
					}

					library.bus.message('newBlock', block);
					modules.blocks.lastBlock.set(block);
					return setImmediate(resolve);
				},
				tx
			);
		}
	});
};

/**
 * Description of the function.
 *
 * @param {Object} block - Full normalized genesis block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @todo Add description for the function
 */
Chain.prototype.applyBlock = function(block, saveBlock, cb) {
	__private.undoUnconfirmedListStep(err => {
		if (err) {
			return setImmediate(cb, err);
		}
		return library.storage.entities.Block.begin('Chain:applyBlock', tx => {
			modules.blocks.isActive.set(true);

			return __private
				.applyUnconfirmedStep(block, tx)
				.then(() => __private.applyConfirmedStep(block, tx))
				.then(() => __private.saveBlockStep(block, saveBlock, tx));
		})
			.then(() => {
				// Remove block transactions from transaction pool
				block.transactions.forEach(transaction => {
					modules.transactions.removeUnconfirmedTransaction(transaction.id);
				});
				modules.blocks.isActive.set(false);
				block = null;

				return setImmediate(cb, null);
			})
			.catch(reason => {
				modules.blocks.isActive.set(false);
				block = null;

				// Finish here if snapshotting.
				// FIXME: Not the best place to do that
				if (reason.name === 'Snapshot finished') {
					library.logger.info(reason);
					process.emit('SIGTERM');
				}

				return setImmediate(cb, reason);
			});
	});
};

/**
 * Broadcast reduced block to increase network performance.
 *
 * @param {Object} reducedBlock - Block without empty/insignificant properties
 * @param {boolean} broadcast - Indicator that block needs to be broadcasted
 */
Chain.prototype.broadcastReducedBlock = function(reducedBlock, broadcast) {
	library.bus.message('broadcastBlock', reducedBlock, broadcast);
};

/**
 * Loads 2nd last block from the database
 * @param {String} secondLastBlockId - id of the second last block
 * @param {Object} tx - database transaction
 */
__private.loadSecondLastBlockStep = function(secondLastBlockId, tx) {
	return new Promise((resolve, reject) => {
		// Load previous block from full_blocks_list table
		// TODO: Can be inefficient, need performnce tests
		modules.blocks.utils.loadBlocksPart(
			{ id: secondLastBlockId },
			(err, blocks) => {
				if (err || !blocks.length) {
					library.logger.error('Failed to get loadBlocksPart', err);
					return setImmediate(reject, err || 'previousBlock is null');
				}
				return setImmediate(resolve, blocks[0]);
			},
			tx
		);
	});
};

/**
 * Reverts changes on confirmed columns of mem_account for one transaction
 * @param {Object} transaction - transaction to undo
 * @param {Object} oldLastBlock - secondLastBlock
 * @param {Object} tx - database transaction
 */
__private.undoConfirmedStep = function(transaction, oldLastBlock, tx) {
	return new Promise((resolve, reject) => {
		// Retrieve sender by public key
		modules.accounts.getAccount(
			{ publicKey: transaction.senderPublicKey },
			(accountErr, sender) => {
				if (accountErr) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error(
						'Failed to get account for undoing transaction to confirmed state',
						accountErr
					);
					return setImmediate(reject, accountErr);
				}
				// Undoing confirmed transaction - refresh confirmed balance (see: logic.transaction.undo, logic.transfer.undo)
				// WARNING: DB_WRITE
				return modules.transactions.undoConfirmed(
					transaction,
					oldLastBlock,
					sender,
					undoConfirmedErr => {
						if (undoConfirmedErr) {
							// Fatal error, memory tables will be inconsistent
							library.logger.error(
								'Failed to undo transaction to confirmed state of account',
								undoConfirmedErr
							);
							return setImmediate(reject, undoConfirmedErr);
						}
						return setImmediate(resolve);
					},
					tx
				);
			},
			tx
		);
	});
};

/**
 * Reverts changes on unconfirmed columns of mem_account for one transaction
 * @param {Object} transaction - transaction to undo
 * @param {Object} oldLastBlock - secondLastBlock
 * @param {Object} tx - database transaction
 */
__private.undoUnconfirmStep = function(transaction, tx) {
	return new Promise((resolve, reject) => {
		// Undoing unconfirmed transaction - refresh unconfirmed balance (see: logic.transaction.undoUnconfirmed)
		// WARNING: DB_WRITE
		modules.transactions.undoUnconfirmed(
			transaction,
			undoUnconfirmedErr => {
				if (undoUnconfirmedErr) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error(
						'Failed to undo transaction to unconfirmed state of account',
						undoUnconfirmedErr
					);
					return setImmediate(reject, undoUnconfirmedErr);
				}
				return setImmediate(resolve);
			},
			tx
		);
	});
};

/**
 * Performs backward tick
 * @param {Object} oldLastBlock - secondLastBlock
 * @param {Object} previousBlock - block to delete
 * @param {Object} tx - database transaction
 */
__private.backwardTickStep = function(oldLastBlock, previousBlock, tx) {
	return new Promise((resolve, reject) => {
		// Perform backward tick on rounds
		// WARNING: DB_WRITE
		modules.rounds.backwardTick(
			oldLastBlock,
			previousBlock,
			backwardTickErr => {
				if (backwardTickErr) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error(
						'Failed to perform backwards tick',
						backwardTickErr
					);
					return setImmediate(reject, backwardTickErr);
				}
				return setImmediate(resolve);
			},
			tx
		);
	});
};

/**
 * deletes block and relevant transactions
 * @param {Object} oldLastBlock - secondLastBlock
 * @param {Object} tx - database transaction
 */
__private.deleteBlockStep = function(oldLastBlock, tx) {
	return new Promise((resolve, reject) => {
		// Delete last block from blockchain
		// WARNING: Db_WRITE
		self.deleteBlock(
			oldLastBlock.id,
			deleteBlockErr => {
				if (deleteBlockErr) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error('Failed to delete block', deleteBlockErr);
					return setImmediate(reject, deleteBlockErr);
				}
				return setImmediate(resolve);
			},
			tx
		);
	});
};

/**
 * Deletes last block, undo transactions, recalculate round.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error
 * @returns {Object} cb.obj - New last block
 */
__private.popLastBlock = function(oldLastBlock, cb) {
	let secondLastBlock;

	library.storage.entities.Block.begin('Chain:deleteBlock', tx =>
		__private
			.loadSecondLastBlockStep(oldLastBlock.previousBlock, tx)
			.then(res => {
				secondLastBlock = res;
				return Promise.mapSeries(
					oldLastBlock.transactions.reverse(),
					transaction =>
						__private
							.undoConfirmedStep(transaction, oldLastBlock, tx)
							.then(() => __private.undoUnconfirmStep(transaction, tx))
				);
			})
			.then(() => __private.backwardTickStep(oldLastBlock, secondLastBlock, tx))
			.then(() => __private.deleteBlockStep(oldLastBlock, tx))
	)
		.then(() => setImmediate(cb, null, secondLastBlock))
		.catch(err => setImmediate(cb, err));
};

/**
 * Deletes last block.
 * - Apply the block to database if both verifications are ok
 * - Update headers: broadhash and height
 * - Put transactions from deleted block back into transaction pool
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.obj - New last block
 */
Chain.prototype.deleteLastBlock = function(cb) {
	let lastBlock = modules.blocks.lastBlock.get();
	library.logger.warn('Deleting last block', lastBlock);

	if (lastBlock.height === 1) {
		return setImmediate(cb, 'Cannot delete genesis block');
	}

	let deletedBlockTransactions;

	return async.series(
		{
			popLastBlock(seriesCb) {
				// Perform actual delete of last block
				__private.popLastBlock(lastBlock, (err, previousBlock) => {
					if (err) {
						library.logger.error('Error deleting last block', lastBlock);
					} else {
						// Store actual lastBlock transactions in reverse order
						deletedBlockTransactions = lastBlock.transactions.reverse();

						// Set previous block as our new last block
						lastBlock = modules.blocks.lastBlock.set(previousBlock);
					}
					return setImmediate(seriesCb, err);
				});
			},
			updateSystemHeaders(seriesCb) {
				// Update our own headers: broadhash and height
				return components.system.update().then(() => seriesCb());
			},
			broadcastHeaders(seriesCb) {
				// Notify all remote peers about our new headers
				modules.transport.broadcastHeaders(seriesCb);
			},
			receiveTransactions(seriesCb) {
				// Put transactions back into transaction pool
				modules.transactions.receiveTransactions(
					deletedBlockTransactions,
					false,
					err => {
						if (err) {
							library.logger.error('Error adding transactions', err);
						}
						deletedBlockTransactions = null;
						return setImmediate(seriesCb);
					}
				);
			},
		},
		err => setImmediate(cb, err, lastBlock)
	);
};

/**
 * Recover chain - wrapper for deleteLastBlock.
 *
 * @private
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
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
 *
 * @param {modules} scope - Exposed modules
 */
Chain.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Chain: Shared modules bind.');
	components = {
		cache: scope.components ? scope.components.cache : undefined,
		system: scope.components.system,
	};

	modules = {
		accounts: scope.modules.accounts,
		blocks: scope.modules.blocks,
		rounds: scope.modules.rounds,
		transactions: scope.modules.transactions,
		transport: scope.modules.transport,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Chain;
