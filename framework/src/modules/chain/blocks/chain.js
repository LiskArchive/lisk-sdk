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
const {
	checkIfTransactionIsInert,
	applyTransactions,
	undoTransactions,
} = require('../transactions');
const {
	loadBlocksPart,
} = require('./utils');

const { TRANSACTION_TYPES } = global.constants;

let modules;
let library;
let self;
const __private = {};

const saveBlockBatch = async (storage, parsedBlock, saveBlockBatchTx) => {
	const promises = [
		storage.entities.Block.create(
			parsedBlock,
			{},
			saveBlockBatchTx
		),
	];

	if (parsedBlock.transactions.length) {
		promises.push(
			storage.entities.Transaction.create(
				parsedBlock.transactions.map(transaction => transaction.toJSON()),
				{},
				saveBlockBatchTx
			)
		);
	}

	return saveBlockBatchTx
		.batch(promises);
};

/**
 * Save block with transactions to database.
 *
 * @param {Object} block - Full normalized block
 * @param {function} cb - Callback function
 * @returns {Function|afterSave} cb - If SQL transaction was OK - returns safterSave execution, if not returns callback function from params (through setImmediate)
 * @returns {string} cb.err - Error if occurred
 */
const saveBlock = async (storage, block, tx) => {
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

	// If there is already a running transaction use it
	if (tx) {
		return saveBlockBatch(storage, parsedBlock, tx);
	}
	// Prepare and execute SQL transaction
	// WARNING: DB_WRITE
	return storage.entities.Block.begin('Chain:saveBlock', t => {
		saveBlockBatch(t);
	});
};

/**
 * Save genesis block to database.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
const saveGenesisBlock = async (storage, transactionManager, genesisBlock) => {
	// Check if genesis block ID already exists in the database
	const isPersisted = await storage.entities.Block.isPersisted({
		id: genesisBlock.block.id,
	});
	if (isPersisted) {
		return;
	}

	// If there is no block with genesis ID - save to database
	// WARNING: DB_WRITE
	// FIXME: This will fail if we already have genesis block in database, but with different ID
	const block = {
		...genesisBlock.block,
		transactions: transactionManager.fromBlock(
			genesisBlock.block
		),
	};
	await saveBlock(storage, block);
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
const deleteBlock = (storage, blockId, tx) =>
	// Delete block with ID from blocks table
	// WARNING: DB_WRITE
	storage.entities.Block.delete({ id: blockId }, {}, tx)

/**
 * Deletes all blocks with height >= supplied block ID.
 *
 * @param {number} blockId - ID of block to begin with
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - SQL error
 * @returns {Object} cb.res - SQL response
 */
const deleteFromBlockId = async (storage, blockId) => {
	const block = await storage.entities.Block.getOne({
		id: blockId,
	});
	return storage.entities.Block.delete({
		height_gte: block.height,
	});
};

/**
 * Apply genesis block's transactions to blockchain.
 *
 * @param {Object} block - Full normalized genesis block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
const applyGenesisBlock = async (storage, roundsModule, block) => {
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
		// TODO: set to last block after this
		modules.blocks.lastBlock.set(block);
		// Tick round
		// WARNING: DB_WRITE
		return modules.rounds.tick(block);
	});
}

/**
 * Description of the function.
 *
 * @param {Object} block - Full normalized genesis block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @todo Add description for the function
 */
const applyBlock = async (storage, roundsModule, transactionPoolModule, slots, block, shouldSave, exceptions) => {
	const tx = await storage.entities.Block.begin('Chain:applyBlock');
	// TODO: recover this
	// modules.blocks.isActive.set(true);
	await applyConfirmedStep(storage, slots, block, exceptions, tx);
	await saveBlockStep(storage, roundsModule, block, shouldSave, tx);
	return library.storage.entities.Block.begin('Chain:applyBlock', tx => {
	// TODO: Remove this dependency
	transactionPool.onConfirmedTransactions(block.transactions);
	// TODO: Remove this dependency
	// modules.blocks.isActive.set(false);
}

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
		storage,
		genesisBlock,
		bus,
		balancesSequence,
		channel,
		transactionManager
	) {
		library = {
			logger,
			storage,
			genesisBlock,
			bus,
			balancesSequence,
			logic: {
				block,
			},
			channel,
		};
		self = this;
		self.modules = {
			transactionManager,
		};

		library.logger.trace('Blocks->Chain: Submodule initialized.');
		return self;
	}






	/**
	 * Broadcast reduced block to increase network performance.
	 *
	 * @param {Object} reducedBlock - Block without empty/insignificant properties
	 * @param {boolean} broadcast - Indicator that block needs to be broadcasted
	 */
	// eslint-disable-next-line class-methods-use-this
	broadcastReducedBlock(reducedBlock, broadcast) {
		library.bus.message('broadcastBlock', reducedBlock, broadcast);
	}

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
	// eslint-disable-next-line class-methods-use-this
	deleteLastBlock(cb) {
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
					return modules.blocks
						.calculateNewBroadhash()
						.then(({ broadhash, height }) => {
							// Listen for the update of step to move to next step
							library.channel.once('app:state:updated', () => {
								seriesCb();
							});

							// Update our application state: broadhash and height
							return library.channel.invoke('app:updateApplicationState', {
								broadhash,
								height,
							});
						})
						.catch(seriesCb);
				},
				addDeletedTransactions(seriesCb) {
					// Put transactions back into transaction pool
					modules.transactionPool.onDeletedTransactions(
						deletedBlockTransactions
					);
					seriesCb();
				},
			},
			err => setImmediate(cb, err, lastBlock)
		);
	}

	/**
	 * Recover chain - wrapper for deleteLastBlock.
	 *
	 * @private
	 * @param  {function} cb - Callback function
	 * @returns {function} cb - Callback function from params (through setImmediate)
	 * @returns {Object} cb.err - Error if occurred
	 */
	// eslint-disable-next-line class-methods-use-this
	recoverChain(cb) {
		library.logger.warn('Chain comparison failed, starting recovery');
		self.deleteLastBlock((err, newLastBlock) => {
			if (err) {
				library.logger.error('Recovery failed');
			} else {
				library.logger.info(
					'Recovery complete, new last block',
					newLastBlock.id
				);
			}
			return setImmediate(cb, err);
		});
	}

	/**
	 * It assigns modules & components to private constants
	 *
	 * @param {modules, components} scope - Exposed modules & components
	 */
	// eslint-disable-next-line class-methods-use-this
	onBind(scope) {
		library.logger.trace('Blocks->Chain: Shared modules bind.');
		modules = {
			blocks: scope.modules.blocks,
			rounds: scope.modules.rounds,
			transactionPool: scope.modules.transactionPool,
		};

		// Set module as loaded
		__private.loaded = true;
	}
}

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
const applyBlockTransactions = async (storage, slots, transactions, exceptions) => {
	const { stateStore } = await applyTransactions(storage, exceptions)(transactions);
	await stateStore.account.finalize();
	stateStore.round.setRoundForData(slots.calcRound(1));
	await stateStore.round.finalize();
};

/**
 * Calls applyConfirmed from transactions module for each transaction in block
 *
 * @private
 * @param {Object} block - Block object
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
const applyConfirmedStep = async (storage, slots, block, exceptions, tx) => {
	if (block.transactions.length <= 0) {
		return;
	}
	const nonInertTransactions = block.transactions.filter(
		transaction => !checkIfTransactionIsInert(transaction, exceptions)
	);

	const { stateStore, transactionsResponses } = await applyTransactions(
		storage,
		exceptions
	)(nonInertTransactions, tx);

	const unappliableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK
	);

	if (unappliableTransactionsResponse.length > 0) {
		throw unappliableTransactionsResponse[0].errors;
	}

	await stateStore.account.finalize();
	stateStore.round.setRoundForData(slots.calcRound(block.height));
	await stateStore.round.finalize();
};

/**
 * Calls saveBlock for the block and performs round tick
 *
 * @private
 * @param {Object} block - Block object
 * @param {boolean} saveBlock - Flag to save block into database
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
const saveBlockStep = async (storage, roundsModule, block, shouldSave, tx) => {
	if (shouldSave) {
		await saveBlock(storage, block, tx);
	}
		await new Promise((resolve, reject) => {
			roundsModule.tick(
				block,
				tickErr => {
					if (tickErr) {
						return reject(tickErr);
					}
					resolve();
				},
				tx
			);
		});
		// TODO: recover below
		// library.bus.message('newBlock', block);
		// modules.blocks.lastBlock.set(block);
};

/**
 * Loads 2nd last block from the database
 * @param {String} secondLastBlockId - id of the second last block
 * @param {Object} tx - database transaction
 */
const loadSecondLastBlockStep = async (storage, secondLastBlockId, tx) => {
	const blocks = await loadBlocksPart(storage, { id: secondLastBlockId }, tx);
	if (!blocks.length) {
		throw new Error('PreviousBlock is null');
	}
	return blocks[0];
};

/**
 * Reverts confirmed transactions due to block deletion
 * @param {Object} block - secondLastBlock
 * @param {Object} tx - database transaction
 */
const undoConfirmedStep = async (storage, slots, block, exceptions, tx) => {
	if (block.transactions.length === 0) {
		return;
	}

	const nonInertTransactions = block.transactions.filter(
		transaction => !exceptions.inertTransactions.includes(transaction.id)
	);

	const { stateStore, transactionsResponses } = await undoTransactions(
		storage,
		exceptions
	)(nonInertTransactions, tx);

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
const backwardTickStep = async (roundsModule, oldLastBlock, previousBlock, tx) =>
	new Promise((resolve, reject) => {
		// Perform backward tick on rounds
		// WARNING: DB_WRITE
		roundsModule.backwardTick(
			oldLastBlock,
			previousBlock,
			backwardTickErr => {
				if (backwardTickErr) {
					return reject(backwardTickErr);
				}
				return resolve();
			},
			tx
		);
	});

/**
 * deletes block and relevant transactions
 * @param {Object} oldLastBlock - secondLastBlock
 * @param {Object} tx - database transaction
 */
const deleteBlockStep = async (storage, oldLastBlock, tx) =>
	deleteBlock(storage, oldLastBlock.id, tx);

/**
 * Deletes last block, undo transactions, recalculate round.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error
 * @returns {Object} cb.obj - New last block
 */
const popLastBlock = async (storage, roundsModule, slots, oldLastBlock) => {
	let secondLastBlock;

	const tx = await storage.entities.Block.begin('Chain:deleteBlock');
	const secondLastBlock = await loadSecondLastBlockStep(storage, oldLastBlock.previousBlock, tx);
	await undoConfirmedStep(storage, slots, oldLastBlock, tx);
	await backwardTickStep(roundsModule, secondLastBlock, tx);
	await deleteBlockStep(storage, oldLastBlock, tx);
	// TODO: recover this
	// library.bus.message('deleteBlock', oldLastBlock);
};

module.exports = Chain;
