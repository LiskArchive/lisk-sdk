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

const initTransaction = require('../helpers/init_transaction.js');

let library;

class ProcessTransactions {
	constructor(cb, scope) {
		library = {
			logic: {
				stateManager: scope.logic.stateManager,
			},
		};

		setImmediate(cb, null, this);
	}

	// eslint-disable-next-line class-methods-use-this
	validateTransactions(transactions) {
		return transactions
			.map(transaction => ({
				...transaction,
				fee: transaction.fee.toString(),
				amount: transaction.amount.toString(),
			}))
			.map(initTransaction)
			.map(transactionInstance => transactionInstance.validate());
	}

	// eslint-disable-next-line class-methods-use-this
	async applyTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = library.logic.stateManager.createStore({
			mutate: true,
			tx,
		});

		const transactionInstances = transactions
			.map(transaction => ({
				...transaction,
				fee: transaction.fee.toString(),
				amount: transaction.amount.toString(),
				recipientId: transaction.recipientId || '',
			}))
			.map(initTransaction);

		await Promise.all(transactionInstances.map(t => t.prepare(stateStore)));

		const transactionResponses = transactionInstances.map(transaction => {
			const transactionResponse = transaction.apply(stateStore);
			stateStore.transaction.add(transaction);
			return transactionResponse;
		});

		return {
			transactionResponses,
			stateStore,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	async undoTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = library.logic.stateManager.createStore({
			mutate: true,
			tx,
		});

		const transactionInstances = transactions
			.map(transaction => ({
				...transaction,
				fee: transaction.fee.toString(),
				amount: transaction.amount.toString(),
				recipientId: transaction.recipientId || '',
			}))
			.map(initTransaction);

		await Promise.all(transactionInstances.map(t => t.prepare(stateStore)));

		const transactionResponses = transactionInstances.map(transaction => {
			const transactionResponse = transaction.undo(stateStore);
			return transactionResponse;
		});

		return {
			transactionResponses,
			stateStore,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	async verifyTransactions(transactions) {
		// Get data required for verifying transactions
		const stateStore = library.logic.stateManager.createStore({
			mutate: false,
		});

		const transactionInstances = transactions
			.map(transaction => ({
				...transaction,
				fee: transaction.fee.toString(),
				amount: transaction.amount.toString(),
				recipientId: transaction.recipientId || '',
			}))
			.map(initTransaction);

		await Promise.all(transactionInstances.map(t => t.prepare(stateStore)));

		return transactionInstances.map(transaction => {
			library.logic.stateManager.createSnapshot();
			const transactionResponse = transaction.apply(stateStore);
			library.logic.stateManager.restoreSnapshot();
			return transactionResponse;
		});
	}
}

module.exports = ProcessTransactions;
