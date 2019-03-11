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
		return transactions.map(transaction => transaction.validate());
	}

	// eslint-disable-next-line class-methods-use-this
	async applyTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = library.logic.stateManager.createStore({
			mutate: true,
			tx,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			const transactionResponse = transaction.apply(stateStore);
			stateStore.transaction.add(transaction);
			return transactionResponse;
		});

		return {
			transactionsResponses,
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

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionResponses = transactions.map(transaction => {
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

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			library.logic.stateManager.createSnapshot();
			const transactionResponse = transaction.apply(stateStore);
			library.logic.stateManager.restoreSnapshot();
			return transactionResponse;
		});

		return {
			transactionsResponses,
		};
	}
}

module.exports = ProcessTransactions;
