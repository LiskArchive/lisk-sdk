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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const transactionsModule = require('./transactions');

const TRANSACTION_TYPES_VOTE = [3, 11];

/**
 * Save block with transactions to database.
 *
 * @param {Object} block - Full normalized block
 * @param {function} cb - Callback function
 * @returns {Function|afterSave} cb - If SQL transaction was OK - returns safterSave execution, if not returns callback function from params (through setImmediate)
 * @returns {string} cb.err - Error if occurred
 */
const saveBlock = async (storage, blockJSON, tx) => {
	if (!tx) {
		throw new Error('Block should only be saved in a database tx');
	}
	// If there is already a running transaction use it
	const promises = [storage.entities.Block.create(blockJSON, {}, tx)];

	if (blockJSON.transactions.length) {
		promises.push(
			storage.entities.Transaction.create(blockJSON.transactions, {}, tx),
		);
	}

	return tx.batch(promises);
};

/**
 * Deletes last block.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.obj - New last block
 */
const deleteLastBlock = async (storage, lastBlock, tx) => {
	if (lastBlock.height === 1) {
		throw new Error('Cannot delete genesis block');
	}
	const [storageBlock] = await storage.entities.Block.get(
		{ id: lastBlock.previousBlockId },
		{ extended: true },
		tx,
	);

	if (!storageBlock) {
		throw new Error('PreviousBlock is null');
	}

	await storage.entities.Block.delete({ id: lastBlock.id }, {}, tx);
	return storageBlock;
};

/**
 * Deletes all blocks with height >= supplied block ID.
 *
 * @param storage - Storage module dependency
 * @param {number} blockId - ID of block to begin with
 */
const deleteFromBlockId = async (storage, blockId) => {
	const block = await storage.entities.Block.getOne({
		id: blockId,
	});
	return storage.entities.Block.delete({
		height_gt: block.height,
	});
};

/**
 * Calls applyConfirmed from transactions module for each transaction in block
 *
 * @private
 * @param {Object} block - Block object
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
const applyConfirmedStep = async (blockInstance, stateStore, exceptions) => {
	if (blockInstance.transactions.length <= 0) {
		return;
	}
	const nonInertTransactions = blockInstance.transactions.filter(
		transaction =>
			!transactionsModule.checkIfTransactionIsInert(transaction, exceptions),
	);

	const { transactionsResponses } = await transactionsModule.applyTransactions(
		exceptions,
	)(nonInertTransactions, stateStore);

	const unappliableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliableTransactionsResponse.length > 0) {
		throw unappliableTransactionsResponse[0].errors;
	}

	await stateStore.account.finalize();
};

/**
 * Apply genesis block's transactions to blockchain.
 *
 * @param {Object} block - Full normalized genesis block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
const applyConfirmedGenesisStep = async (blockInstance, stateStore) => {
	const sortedTransactionInstances = blockInstance.transactions.sort(a => {
		if (TRANSACTION_TYPES_VOTE.includes(a.type)) {
			return 1;
		}
		return 0;
	});
	await transactionsModule.applyGenesisTransactions()(
		sortedTransactionInstances,
		stateStore,
	);
	await stateStore.account.finalize();

	return blockInstance;
};

/**
 * Reverts confirmed transactions due to block deletion
 * @param {Object} block - secondLastBlock
 * @param {Object} tx - database transaction
 */
const undoConfirmedStep = async (blockInstance, stateStore, exceptions) => {
	if (blockInstance.transactions.length === 0) {
		return;
	}

	const nonInertTransactions = blockInstance.transactions.filter(
		transaction =>
			!exceptions.inertTransactions ||
			!exceptions.inertTransactions.includes(transaction.id),
	);

	const { transactionsResponses } = await transactionsModule.undoTransactions(
		exceptions,
	)(nonInertTransactions, stateStore);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}

	await stateStore.account.finalize();
};

module.exports = {
	saveBlock,
	deleteLastBlock,
	deleteFromBlockId,
	applyConfirmedStep,
	applyConfirmedGenesisStep,
	undoConfirmedStep,
};
