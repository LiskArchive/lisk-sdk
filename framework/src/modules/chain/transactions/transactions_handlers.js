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

const BigNum = require('@liskhq/bignum');
const {
	Status: TransactionStatus,
	TransactionError,
} = require('@liskhq/lisk-transactions');
const votes = require('./votes');
const exceptionsHandlers = require('./exceptions_handlers');
const StateStore = require('../state_store');

const validateTransactions = exceptions => transactions => {
	const transactionsResponses = transactions.map(transaction =>
		transaction.validate(),
	);

	const invalidTransactionResponses = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);
	exceptionsHandlers.updateTransactionResponseForExceptionTransactions(
		invalidTransactionResponses,
		transactions,
		exceptions,
	);

	return {
		transactionsResponses,
	};
};

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
 */
const verifyTotalSpending = (transactions, stateStore) => {
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
		const senderBalance = new BigNum(stateStore.account.get(senderId).balance);

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
							'.amount',
						),
					],
				});
			} else {
				senderSpending[senderId] = senderTotalSpending;
			}
		});
	});

	return spendingErrors;
};

const applyGenesisTransactions = storage => async (
	transactions,
	tx = undefined,
) => {
	// Get data required for verifying transactions
	const stateStore = new StateStore(storage, {
		mutate: true,
		tx,
	});

	await Promise.all(transactions.map(t => t.prepare(stateStore)));

	const transactionsResponses = transactions.map(transaction => {
		const transactionResponse = transaction.apply(stateStore);

		votes.apply(stateStore, transaction);
		stateStore.transaction.add(transaction);

		// We are overriding the status of transaction because it's from genesis block
		transactionResponse.status = TransactionStatus.OK;
		return transactionResponse;
	});

	return {
		transactionsResponses,
		stateStore,
	};
};

const applyTransactions = (storage, exceptions) => async (transactions, tx) => {
	// Get data required for verifying transactions
	const stateStore = new StateStore(storage, {
		mutate: true,
		tx,
	});

	await Promise.all(transactions.map(t => t.prepare(stateStore)));

	// Verify total spending of per account accumulative
	const transactionsResponseWithSpendingErrors = verifyTotalSpending(
		transactions,
		stateStore,
	);

	const transactionsWithoutSpendingErrors = transactions.filter(
		transaction =>
			!transactionsResponseWithSpendingErrors
				.map(({ id }) => id)
				.includes(transaction.id),
	);

	const transactionsResponses = transactionsWithoutSpendingErrors.map(
		transaction => {
			stateStore.account.createSnapshot();
			const transactionResponse = transaction.apply(stateStore);
			if (transactionResponse.status !== TransactionStatus.OK) {
				// update transaction response mutates the transaction response object
				exceptionsHandlers.updateTransactionResponseForExceptionTransactions(
					[transactionResponse],
					transactionsWithoutSpendingErrors,
					exceptions,
				);
			}
			if (transactionResponse.status === TransactionStatus.OK) {
				votes.apply(stateStore, transaction, exceptions);
				stateStore.transaction.add(transaction);
			}

			if (transactionResponse.status !== TransactionStatus.OK) {
				stateStore.account.restoreSnapshot();
			}

			return transactionResponse;
		},
	);

	return {
		transactionsResponses: [
			...transactionsResponses,
			...transactionsResponseWithSpendingErrors,
		],
		stateStore,
	};
};

const checkPersistedTransactions = storage => async transactions => {
	if (!transactions.length) {
		return {
			transactionsResponses: [],
		};
	}

	const confirmedTransactions = await storage.entities.Transaction.get({
		id_in: transactions.map(transaction => transaction.id),
	});

	const persistedTransactionIds = confirmedTransactions.map(
		transaction => transaction.id,
	);
	const persistedTransactions = transactions.filter(transaction =>
		persistedTransactionIds.includes(transaction.id),
	);
	const nonPersistedTransactions = transactions.filter(
		transaction => !persistedTransactionIds.includes(transaction.id),
	);
	const transactionsResponses = [
		...nonPersistedTransactions.map(transaction => ({
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
					'.id',
				),
			],
		})),
	];

	return {
		transactionsResponses,
	};
};

const checkAllowedTransactions = contexter => transactions => ({
	transactionsResponses: transactions.map(transaction => {
		const context = typeof contexter === 'function' ? contexter() : contexter;
		const allowed = !transaction.matcher || transaction.matcher(context);

		return {
			id: transaction.id,
			status: allowed ? TransactionStatus.OK : TransactionStatus.FAIL,
			errors: allowed
				? []
				: [
						new TransactionError(
							`Transaction type ${transaction.type} is currently not allowed.`,
							transaction.id,
						),
				  ],
		};
	}),
});

const undoTransactions = (storage, exceptions) => async (
	transactions,
	tx = undefined,
) => {
	// Get data required for verifying transactions
	const stateStore = new StateStore(storage, {
		mutate: true,
		tx,
	});

	await Promise.all(transactions.map(t => t.prepare(stateStore)));

	const transactionsResponses = transactions.map(transaction => {
		const transactionResponse = transaction.undo(stateStore);
		votes.undo(stateStore, transaction, this.exceptions);
		return transactionResponse;
	});

	const nonUndoableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	exceptionsHandlers.updateTransactionResponseForExceptionTransactions(
		nonUndoableTransactionsResponse,
		transactions,
		exceptions,
	);

	return {
		transactionsResponses,
		stateStore,
	};
};

const verifyTransactions = (
	storage,
	slots,
	exceptions,
) => async transactions => {
	// Get data required for verifying transactions
	const stateStore = new StateStore(storage, {
		mutate: false,
	});

	await Promise.all(transactions.map(t => t.prepare(stateStore)));

	const transactionsResponses = transactions.map(transaction => {
		stateStore.createSnapshot();
		const transactionResponse = transaction.apply(stateStore);
		if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
			transactionResponse.status = TransactionStatus.FAIL;
			transactionResponse.errors.push(
				new TransactionError(
					'Invalid transaction timestamp. Timestamp is in the future',
					transaction.id,
					'.timestamp',
				),
			);
		}
		stateStore.restoreSnapshot();
		return transactionResponse;
	});

	const unverifiableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	exceptionsHandlers.updateTransactionResponseForExceptionTransactions(
		unverifiableTransactionsResponse,
		transactions,
		exceptions,
	);

	return {
		transactionsResponses,
	};
};

const processSignature = storage => async (transaction, signature) => {
	// Get data required for processing signature
	const stateStore = new StateStore(storage, {
		mutate: false,
	});
	await transaction.prepare(stateStore);
	// Add multisignature to transaction and process
	return transaction.addMultisignature(stateStore, signature);
};

module.exports = {
	validateTransactions,
	applyTransactions,
	checkPersistedTransactions,
	checkAllowedTransactions,
	undoTransactions,
	verifyTransactions,
	processSignature,
	applyGenesisTransactions,
	verifyTotalSpending,
};
