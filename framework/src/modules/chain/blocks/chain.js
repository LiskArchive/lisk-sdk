/*
 * Copyright © 2019 Lisk Foundation
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

const { cloneDeep } = require('lodash');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const transactionsModule = require('../transactions');
const { storageRead } = require('./block');

const TRANSACTION_TYPES_VOTE = 3;

const saveBlockBatch = async (storage, parsedBlock, saveBlockBatchTx) => {
	const promises = [
		storage.entities.Block.create(parsedBlock, {}, saveBlockBatchTx),
	];

	if (parsedBlock.transactions.length) {
		promises.push(
			storage.entities.Transaction.create(
				parsedBlock.transactions.map(transaction => transaction.toJSON()),
				{},
				saveBlockBatchTx,
			),
		);
	}

	return saveBlockBatchTx.batch(promises);
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
	const parsedBlock = cloneDeep(block);
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
	return storage.entities.Block.begin('Chain:saveBlock', async t => {
		await saveBlockBatch(storage, parsedBlock, t);
	});
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
const deleteBlock = async (storage, blockId, tx) =>
	// Delete block with ID from blocks table
	// WARNING: DB_WRITE
	storage.entities.Block.delete({ id: blockId }, {}, tx);

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
const applyGenesisBlockTransactions = async (storage, slots, transactions) => {
	const { stateStore } = await transactionsModule.applyGenesisTransactions(
		storage,
	)(transactions);
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
		transaction =>
			!transactionsModule.checkIfTransactionIsInert(transaction, exceptions),
	);

	const {
		stateStore,
		transactionsResponses,
	} = await transactionsModule.applyTransactions(storage, exceptions)(
		nonInertTransactions,
		tx,
	);

	const unappliableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
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
				return resolve();
			},
			tx,
		);
	});
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
		transaction =>
			!exceptions.inertTransactions ||
			!exceptions.inertTransactions.includes(transaction.id),
	);

	const {
		stateStore,
		transactionsResponses,
	} = await transactionsModule.undoTransactions(storage, exceptions)(
		nonInertTransactions,
		tx,
	);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
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
const backwardTickStep = async (
	roundsModule,
	oldLastBlock,
	previousBlock,
	tx,
) =>
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
			tx,
		);
	});

/**
 * Deletes last block, undo transactions, recalculate round.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error
 * @returns {Object} cb.obj - New last block
 */
const popLastBlock = async (
	storage,
	interfaceAdapters,
	genesisBlock,
	roundsModule,
	slots,
	oldLastBlock,
	exceptions,
) =>
	storage.entities.Block.begin('Chain:deleteBlock', async tx => {
		const [storageResult] = await storage.entities.Block.get(
			{ id: oldLastBlock.previousBlock },
			{ extended: true },
			tx,
		);

		if (!storageResult) {
			throw new Error('PreviousBlock is null');
		}

		const secondLastBlock = storageRead(storageResult);
		secondLastBlock.transactions = interfaceAdapters.transactions.fromBlock(
			secondLastBlock,
		);

		await undoConfirmedStep(storage, slots, oldLastBlock, exceptions, tx);
		await backwardTickStep(roundsModule, oldLastBlock, secondLastBlock, tx);
		await deleteBlock(storage, oldLastBlock.id, tx);
		return secondLastBlock;
	});

class BlocksChain {
	constructor({
		storage,
		interfaceAdapters,
		roundsModule,
		slots,
		exceptions,
		genesisBlock,
	}) {
		this.storage = storage;
		this.interfaceAdapters = interfaceAdapters;
		this.roundsModule = roundsModule;
		this.slots = slots;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
	}

	/**
	 * Save genesis block to database.
	 *
	 * @returns {Object} Block genesis block
	 */
	async saveGenesisBlock() {
		// Check if genesis block ID already exists in the database
		const isPersisted = await this.storage.entities.Block.isPersisted({
			id: this.genesisBlock.id,
		});
		if (isPersisted) {
			return;
		}

		// If there is no block with genesis ID - save to database
		// WARNING: DB_WRITE
		// FIXME: This will fail if we already have genesis block in database, but with different ID
		const block = {
			...this.genesisBlock,
			transactions: this.interfaceAdapters.transactions.fromBlock(
				this.genesisBlock,
			),
		};
		await saveBlock(this.storage, block);
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
	async applyBlock(block, shouldSave = true) {
		await this.storage.entities.Block.begin('Chain:applyBlock', async tx => {
			await applyConfirmedStep(
				this.storage,
				this.slots,
				block,
				this.exceptions,
				tx,
			);
			await saveBlockStep(
				this.storage,
				this.roundsModule,
				block,
				shouldSave,
				tx,
			);
		});
	}

	/**
	 * Apply genesis block's transactions to blockchain.
	 *
	 * @param {Object} block - Full normalized genesis block
	 * @param {function} cb - Callback function
	 * @returns {function} cb - Callback function from params (through setImmediate)
	 * @returns {Object} cb.err - Error if occurred
	 */
	async applyGenesisBlock(block) {
		// Sort transactions included in block
		block.transactions = block.transactions.sort(a => {
			if (a.type === TRANSACTION_TYPES_VOTE) {
				return 1;
			}
			return 0;
		});

		await applyGenesisBlockTransactions(
			this.storage,
			this.slots,
			block.transactions,
			this.exceptions,
		);
		await new Promise((resolve, reject) => {
			this.roundsModule.tick(block, tickErr => {
				if (tickErr) {
					return reject(tickErr);
				}
				return resolve();
			});
		});
		return block;
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
	async deleteLastBlock(lastBlock) {
		if (lastBlock.height === 1) {
			throw new Error('Cannot delete genesis block');
		}
		const previousBlock = await popLastBlock(
			this.storage,
			this.interfaceAdapters,
			this.genesisBlock,
			this.roundsModule,
			this.slots,
			lastBlock,
			this.exceptions,
		);
		return previousBlock;
	}
}

module.exports = {
	BlocksChain,
	saveBlock,
	applyGenesisBlockTransactions,
	backwardTickStep,
	saveBlockBatch,
	deleteBlock,
	deleteFromBlockId,
	saveBlockStep,
	applyConfirmedStep,
	undoConfirmedStep,
	popLastBlock,
};
