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

const {
	Status: TransactionStatus,
	TransactionError,
} = require('@liskhq/lisk-transactions');
const StateStore = require('../logic/state_store');
const votes = require('./votes');
const {
	updateTransactionResponseForExceptionTransactions,
} = require('./handle_exceptions');

class Transactions {
	constructor({ storage, logger, exceptions, slots }) {
		this.storage = storage;
		this.logger = logger;
		this.exceptions = exceptions;
		this.slots = slots;
	}

	// eslint-disable-next-line class-methods-use-this
	validateTransactions(transactions) {
		const transactionsResponses = transactions.map(transaction =>
			transaction.validate()
		);

		const invalidTransactionResponses = transactionsResponses.filter(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);
		updateTransactionResponseForExceptionTransactions(
			invalidTransactionResponses,
			transactions,
			this.exceptions
		);

		return {
			transactionsResponses,
		};
	}

	async applyTransactions(transactions, tx) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(this.storage, {
			mutate: true,
			tx,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			const transactionResponse = transaction.apply(stateStore);
			votes.apply(stateStore, transaction, this.exceptions);
			stateStore.transaction.add(transaction);
			return transactionResponse;
		});

		const unappliableTransactionsResponse = transactionsResponses.filter(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);

		updateTransactionResponseForExceptionTransactions(
			unappliableTransactionsResponse,
			transactions,
			this.exceptions
		);

		return {
			transactionsResponses,
			stateStore,
		};
	}

	async checkPersistedTransactions(transactions) {
		if (!transactions.length) {
			return {
				transactionsResponses: [],
			};
		}

		const confirmedTransactions = await this.storage.entities.Transaction.get({
			id_in: transactions.map(transaction => transaction.id),
		});

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
					new TransactionError(
						`Transaction is already confirmed: ${transaction.id}`,
						transaction.id,
						'.id'
					),
				],
			})),
		];

		return {
			transactionsResponses,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	checkAllowedTransactions(transactions, context) {
		return {
			transactionsResponses: transactions.map(transaction => {
				const allowed = !transaction.matcher || transaction.matcher(context);

				return {
					id: transaction.id,
					status: allowed ? TransactionStatus.OK : TransactionStatus.FAIL,
					errors: allowed
						? []
						: [
								new TransactionError(
									`Transaction type ${
										transaction.type
									} is currently not allowed.`,
									transaction.id
								),
						  ],
				};
			}),
		};
	}

	async undoTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(this.storage, {
			mutate: true,
			tx,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			const transactionResponse = transaction.undo(stateStore);
			votes.undo(stateStore, transaction, this.exceptions);
			return transactionResponse;
		});

		const unundoableTransactionsResponse = transactionsResponses.filter(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);

		updateTransactionResponseForExceptionTransactions(
			unundoableTransactionsResponse,
			transactions,
			this.exceptions
		);

		return {
			transactionsResponses,
			stateStore,
		};
	}

	async verifyTransactions(transactions) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(this.storage, {
			mutate: false,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			stateStore.createSnapshot();
			const transactionResponse = transaction.apply(stateStore);
			if (
				this.slots.getSlotNumber(transaction.timestamp) >
				this.slots.getSlotNumber()
			) {
				transactionResponse.status = 0;
				transactionResponse.errors.push(
					new TransactionError(
						'Invalid transaction timestamp. Timestamp is in the future',
						transaction.id,
						'.timestamp'
					)
				);
			}
			stateStore.restoreSnapshot();
			return transactionResponse;
		});

		const unverifiableTransactionsResponse = transactionsResponses.filter(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);

		updateTransactionResponseForExceptionTransactions(
			unverifiableTransactionsResponse,
			transactions,
			this.exceptions
		);

		return {
			transactionsResponses,
		};
	}

	async processSignature(transaction, signature) {
		// Get data required for processing signature
		const stateStore = new StateStore(this.storage, {
			mutate: false,
		});
		await transaction.prepare(stateStore);
		// Add multisignature to transaction and process
		return transaction.addMultisignature(stateStore, signature);
	}
}

module.exports = {
	Transactions,
};
