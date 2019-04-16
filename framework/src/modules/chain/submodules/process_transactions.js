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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const roundInformation = require('../logic/rounds_information');

let library;

/**
 * Get current state from modules.blocks.lastBlock
 */
const getCurrentState = () => {
	const { version, height, timestamp } = library.modules.blocks.lastBlock.get();
	return { version, height, timestamp };
};

class ProcessTransactions {
	constructor(cb, scope) {
		library = {
			storage: scope.components.storage,
			logic: {
				stateManager: scope.logic.stateManager,
			},
		};
		setImmediate(cb, null, this);
	}

	// eslint-disable-next-line class-methods-use-this
	validateTransactions(transactions) {
		return {
			transactionsResponses: transactions.map(transaction =>
				transaction.validate()
			),
		};
	}

	// eslint-disable-next-line class-methods-use-this
	async checkPersistedTransactions(transactions) {
		const confirmedTransactions = await library.storage.entities.Transaction.get(
			{
				id_in: transactions.map(transaction => transaction.id),
			}
		);

		const persistedTransactionIds = confirmedTransactions.map(
			transaction => transaction.id
		);
		const persistedTransactions = transactions.filter(transaction =>
			persistedTransactionIds.includes(transaction.id)
		);
		const unpersistedTransactions = transactions.filter(
			transaction => !persistedTransactionIds.includes(transaction.id)
		);
		const transactionsResponses = [
			...unpersistedTransactions.map(transaction => ({
				id: transaction.id,
				status: TransactionStatus.OK,
				errors: [],
			})),
			...persistedTransactions.map(transaction => ({
				id: transaction.id,
				status: TransactionStatus.FAIL,
				errors: [
					new Error(`Transaction is already confirmed: ${transaction.id}`),
				],
			})),
		];

		return {
			transactionsResponses,
		};
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
			roundInformation.apply(stateStore, transaction);
			stateStore.transaction.add(transaction);
			return transactionResponse;
		});

		return {
			transactionsResponses,
			stateStore,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	checkAllowedTransactions(transactions, state = getCurrentState()) {
		return {
			transactionsResponses: transactions.map(transaction => {
				const allowed =
					!transaction.isAllowedAt || transaction.isAllowedAt(state);

				return {
					id: transaction.id,
					status: allowed ? TransactionStatus.OK : TransactionStatus.FAIL,
					errors: allowed
						? []
						: [
								new Error(
									`Transaction type ${
										transaction.type
									} is currently not allowed.`
								),
							],
				};
			}),
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

		const transactionsResponses = transactions.map(transaction => {
			const transactionResponse = transaction.undo(stateStore);
			roundInformation.undo(stateStore, transaction);
			return transactionResponse;
		});

		return {
			transactionsResponses,
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

	// eslint-disable-next-line class-methods-use-this
	async processSignature(transaction, signature) {
		// Get data required for processing signature
		const stateStore = library.logic.stateManager.createStore({
			mutate: false,
		});
		await transaction.prepare(stateStore);
		// Add multisignature to transaction and process
		return transaction.addMultisignature(stateStore, signature);
	}

	// eslint-disable-next-line class-methods-use-this
	onBind(scope) {
		library.modules = {
			blocks: scope.modules.blocks,
		};
	}

	/**
	 * Executes each step from left to right and pipes the transactions that succeed to the next
	 * step. Finally collects all responses and formats them accordingly.
	 * @param steps
	 * @returns {function(*=): {transactionsResponses: *[]}}
	 */
	static composeProcessTransactionSteps(...steps) {
		return async transactions => {
			let failedResponses = [];
			const { transactionsResponses: successfulResponses } = await steps.reduce(
				async (previousValue, fn, index) => {
					if (index === 0) {
						// previousValue === transactions argument in the first iteration
						// First iteration includes raw transaction objects instead of formatted responses.
						return fn(previousValue);
					}

					previousValue = await previousValue;

					// Keep track of transactions that failed in the current step
					failedResponses = [
						...failedResponses,
						...previousValue.transactionsResponses.filter(
							response => response.status === TransactionStatus.FAIL
						),
					];

					// Return only transactions that succeeded to the next step
					return fn(
						transactions.filter(transaction =>
							previousValue.transactionsResponses
								.filter(response => response.status === TransactionStatus.OK)
								.map(transactionResponse => transactionResponse.id)
								.includes(transaction.id)
						)
					);
				},
				transactions
			);

			return {
				transactionsResponses: [...failedResponses, ...successfulResponses],
			};
		};
	}
}

module.exports = ProcessTransactions;
