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
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const slots = require('../../helpers/slots.js');
const { convertErrorsToString } = require('../../helpers/error_handlers');
const {
	CACHE_KEYS_DELEGATES,
	CACHE_KEYS_TRANSACTION_COUNT,
} = require('../../../../../../framework/src/components/cache');

const { TRANSACTION_TYPES } = global.constants;

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
 * @param {Object} logger
 * @param {Block} block
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
		initTransaction,
		storage,
		genesisBlock,
		bus,
		balancesSequence,
		channel
	) {
		library = {
			logger,
			storage,
			genesisBlock,
			bus,
			balancesSequence,
			logic: {
				block,
				initTransaction,
			},
			channel,
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
			const block = {
				...library.genesisBlock.block,
				transactions: library.genesisBlock.block.transactions.map(transaction =>
					library.logic.initTransaction.jsonRead(transaction)
				),
			};
			return self.saveBlock(block, err => setImmediate(cb, err));
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
					parsedBlock.transactions.map(transaction => transaction.toJSON()),
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
				!!transaction && transaction.type === TRANSACTION_TYPES.DELEGATE
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

	// TODO: create functions for afterSave for each transaction type
	cb();
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
		if (a.type === TRANSACTION_TYPES.VOTE) {
			return 1;
		}
		return 0;
	});

	__private.applyTransactions(block.transactions, err => {
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
	});
};

/**
 * Applies transactions to the confirmed state.
 *
 * @private
 * @param {Object} block - Block object
 * @param {Object} transactions - Transaction object
 * @param {Object} sender - Sender account
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.applyTransactions = function(transactions, cb) {
	modules.processTransactions
		.applyTransactions(transactions)
		.then(({ stateStore }) => {
			// TODO: Need to add logic for handling exceptions for genesis block transactions
			stateStore.account.finalize();
			return stateStore;
		})
		.then(stateStore => {
			stateStore.round.setRoundForData(slots.calcRound(1));
			return stateStore.round.finalize();
		})
		.then(() => cb())
		.catch(cb);
};

/**
 * Calls applyConfirmed from modules.transactions for each transaction in block after get serder with modules.accounts.getAccount
 *
 * @private
 * @param {Object} block - Block object
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
__private.applyConfirmedStep = async function(block, tx) {
	if (block.transactions.length <= 0) {
		return;
	}
	const nonInertTransactions = block.transactions.filter(
		transaction => !global.exceptions.inertTransactions.includes(transaction.id)
	);

	const {
		stateStore,
		transactionsResponses,
	} = await modules.processTransactions.applyTransactions(
		nonInertTransactions,
		tx
	);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}

	await stateStore.account.finalize();
	stateStore.round.setRoundForData(slots.calcRound(block.height));
	await stateStore.round.finalize();
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
	return library.storage.entities.Block.begin('Chain:applyBlock', tx => {
		modules.blocks.isActive.set(true);

		return __private
			.applyConfirmedStep(block, tx)
			.then(() => __private.saveBlockStep(block, saveBlock, tx));
	})
		.then(() => {
			modules.transactions.onConfirmedTransactions(block.transactions);
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
		// TODO: Can be inefficient, need performance tests
		modules.blocks.utils.loadBlocksPart(
			{ id: secondLastBlockId },
			(err, blocks) => {
				if (err || !blocks.length) {
					library.logger.error('Failed to get loadBlocksPart', convertErrorsToString(err));
					return setImmediate(
						reject,
						err || new Error('previousBlock is null')
					);
				}
				return setImmediate(resolve, blocks[0]);
			},
			tx
		);
	});
};

/**
 * Reverts confirmed transactions due to block deletion
 * @param {Object} block - secondLastBlock
 * @param {Object} tx - database transaction
 */
__private.undoConfirmedStep = async function(block, tx) {
	if (block.transactions.length === 0) {
		return;
	}

	const nonInertTransactions = block.transactions.filter(
		transaction => !global.exceptions.inertTransactions.includes(transaction.id)
	);

	const {
		stateStore,
		transactionsResponses,
	} = await modules.processTransactions.undoTransactions(
		nonInertTransactions,
		tx
	);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}

	await stateStore.account.finalize();
	stateStore.round.setRoundForData(slots.calcRound(block.height));
	await stateStore.round.finalize();
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
				return __private.undoConfirmedStep(oldLastBlock, tx);
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
					return seriesCb(err);
				});
			},
			updateApplicationState(seriesCb) {
				return library.storage.entities.Block.get(
					{},
					{
						limit: 5,
						sort: 'height:desc',
					}
				)
					.then(blocks => {
						// Listen for the update of step to move to next step
						library.channel.once('lisk:state:updated', () => {
							seriesCb();
						});

						// Update our application state: broadhash and height
						return library.channel.invoke(
							'lisk:updateApplicationState',
							blocks
						);
					})
					.catch(seriesCb);
			},
			broadcastHeaders(seriesCb) {
				// Notify all remote peers about our new headers
				modules.transport.broadcastHeaders(seriesCb);
			},
			addDeletedTransactions(seriesCb) {
				// Put transactions back into transaction pool
				modules.transactions.onDeletedTransactions(deletedBlockTransactions);
				seriesCb();
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
 * It assigns modules & components to private constants
 *
 * @param {modules, components} scope - Exposed modules & components
 */
Chain.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Chain: Shared modules bind.');
	components = {
		cache: scope.components ? scope.components.cache : undefined,
	};

	modules = {
		accounts: scope.modules.accounts,
		blocks: scope.modules.blocks,
		rounds: scope.modules.rounds,
		transactions: scope.modules.transactions,
		transport: scope.modules.transport,
		processTransactions: scope.modules.processTransactions,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Chain;
