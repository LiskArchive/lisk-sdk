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
const BigNum = require('bignumber.js');
const roundInformation = require('../logic/rounds_information');
const StateStore = require('../logic/state_store');
const slots = require('../helpers/slots');
const checkTransactionExceptions = require('../logic/check_transaction_against_exceptions.js');

let library;

const updateTransactionResponseForExceptionTransactions = (
	unprocessableTransactionResponses,
	transactions
) => {
	const unprocessableTransactionAndResponsePairs = unprocessableTransactionResponses.map(
		unprocessableTransactionResponse => ({
			transactionResponse: unprocessableTransactionResponse,
			transaction: transactions.find(
				transaction => transaction.id === unprocessableTransactionResponse.id
			),
		})
	);

	const exceptionTransactionsAndResponsePairs = unprocessableTransactionAndResponsePairs.filter(
		({ transactionResponse, transaction }) =>
			checkTransactionExceptions.checkIfTransactionIsException(
				transactionResponse,
				transaction
			)
	);

	// Update the transaction response for exception transactions
	exceptionTransactionsAndResponsePairs.forEach(({ transactionResponse }) => {
		transactionResponse.status = TransactionStatus.OK;
		transactionResponse.errors = [];
	});
};

class ProcessTransactions {
	constructor(cb, scope) {
		library = {
			storage: scope.components.storage,
		};
		setImmediate(cb, null, this);
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
			transactions
		);

		return {
			transactionsResponses,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	async checkPersistedTransactions(transactions) {
		if (!transactions.length) {
			return {
				transactionsResponses: [],
			};
		}

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
	async applyGenesisTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(library.storage, {
			mutate: true,
			tx,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			const transactionResponse = transaction.apply(stateStore);

			roundInformation.apply(stateStore, transaction);
			stateStore.transaction.add(transaction);

			// We are overriding the status of transaction because it's from genesis block
			transactionResponse.status = TransactionStatus.OK;
			return transactionResponse;
		});

		return {
			transactionsResponses,
			stateStore,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	async applyTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(library.storage, {
			mutate: true,
			tx,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		// Verify total spending of per account accumulative
		const transactionsResponseWithSpendingErrors = ProcessTransactions.verifyTotalSpending(
			transactions,
			stateStore
		);

		const transactionsWithoutSpendingErrors = transactions.filter(
			transaction =>
				!transactionsResponseWithSpendingErrors
					.map(({ id }) => id)
					.includes(transaction.id)
		);

		const transactionsResponses = transactionsWithoutSpendingErrors.map(
			transaction => {
				stateStore.account.createSnapshot();
				const transactionResponse = transaction.apply(stateStore);
				if (transactionResponse.status !== TransactionStatus.OK) {
					// update transaction response mutates the transaction response object
					updateTransactionResponseForExceptionTransactions(
						[transactionResponse],
						transactionsWithoutSpendingErrors
					);
				}
				if (transactionResponse.status === TransactionStatus.OK) {
					roundInformation.apply(stateStore, transaction);
					stateStore.transaction.add(transaction);
				}

				if (transactionResponse.status !== TransactionStatus.OK) {
					stateStore.account.restoreSnapshot();
				}

				return transactionResponse;
			}
		);

		return {
			transactionsResponses: [
				...transactionsResponses,
				...transactionsResponseWithSpendingErrors,
			],
			stateStore,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	checkAllowedTransactions(transactions, context) {
		return {
			transactionsResponses: transactions.map(transaction => {
				const allowed =
					!transaction.matcher ||
					transaction.matcher(
						context || ProcessTransactions._getCurrentContext()
					);

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

	// eslint-disable-next-line class-methods-use-this
	async undoTransactions(transactions, tx = undefined) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(library.storage, {
			mutate: true,
			tx,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			const transactionResponse = transaction.undo(stateStore);
			roundInformation.undo(stateStore, transaction);
			return transactionResponse;
		});

		const unundoableTransactionsResponse = transactionsResponses.filter(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);

		updateTransactionResponseForExceptionTransactions(
			unundoableTransactionsResponse,
			transactions
		);

		return {
			transactionsResponses,
			stateStore,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	async verifyTransactions(transactions) {
		// Get data required for verifying transactions
		const stateStore = new StateStore(library.storage, {
			mutate: false,
		});

		await Promise.all(transactions.map(t => t.prepare(stateStore)));

		const transactionsResponses = transactions.map(transaction => {
			stateStore.createSnapshot();
			const transactionResponse = transaction.apply(stateStore);
			if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
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
			transactions
		);

		return { transactionsResponses };
	}

	// eslint-disable-next-line class-methods-use-this
	async processSignature(transaction, signature) {
		// Get data required for processing signature
		const stateStore = new StateStore(library.storage, {
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
	 * Verify user total spending
	 *
	 * One user can't spend more than its balance even thought if block contains
	 * credit transactions settling the balance. In one block total speding must be
	 * less than the total balance
	 *
	 * @param {Array.<Object>} transactions - List of transactions in a block
	 * @param {StateStore} stateStore - State store instance with prepared account
	 * @return {Array}
	 * @static
	 */
	// eslint-disable-next-line class-methods-use-this
	static verifyTotalSpending(transactions, stateStore) {
		const spendingErrors = [];

		// Group the transactions per senderId to calculate total spending
		const senderTransactions = transactions.reduce((rv, x) => {
			(rv[x.senderId] = rv[x.senderId] || []).push(x);
			return rv;
		}, {});

		// We need to get the transaction id which cause exceeding the sufficient balance
		// So we can't sum up all transactions together at once
		const senderSpending = {};
		Object.keys(senderTransactions).forEach(senderId => {
			// We don't need to perform spending check if account have only one transaction
			// Its balance check will be performed by transaction processing
			if (senderTransactions[senderId].length < 2) {
				return;
			}

			// Grab the sender balance
			const senderBalance = new BigNum(
				stateStore.account.get(senderId).balance
			);

			// Initialize the sender spending with zero
			senderSpending[senderId] = new BigNum(0);

			senderTransactions[senderId].forEach(transaction => {
				const senderTotalSpending = senderSpending[senderId]
					.plus(transaction.amount)
					.plus(transaction.fee);

				if (senderBalance.lt(senderTotalSpending)) {
					spendingErrors.push({
						id: transaction.id,
						status: TransactionStatus.FAIL,
						errors: [
							new TransactionError(
								`Account does not have enough LSK for total spending. balance: ${senderBalance.toString()}, spending: ${senderTotalSpending.toString()}`,
								transaction.id,
								'.amount'
							),
						],
					});
				} else {
					senderSpending[senderId] = senderTotalSpending;
				}
			});
		});

		return spendingErrors;
	}

	/**
	 * Get current state from modules.blocks.lastBlock
	 */
	static _getCurrentContext() {
		const {
			version,
			height,
			timestamp,
		} = library.modules.blocks.lastBlock.get();
		return {
			blockVersion: version,
			blockHeight: height,
			blockTimestamp: timestamp,
		};
	}
}

module.exports = ProcessTransactions;
