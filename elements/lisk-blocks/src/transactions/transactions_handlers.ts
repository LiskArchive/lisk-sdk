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

import {
	BaseTransaction,
	Status as TransactionStatus,
	TransactionError,
	TransactionJSON,
	TransactionResponse,
} from '@liskhq/lisk-transactions';

import { DataAccess } from '../data_access';
import { StateStore } from '../state_store';
import {
	Contexter,
	ExceptionOptions,
	MatcherTransaction,
	SignatureObject,
	Slots,
	WriteableTransactionResponse,
} from '../types';

import { TransactionHandledResult } from './compose_transaction_steps';
import * as exceptionsHandlers from './exceptions_handlers';
import * as votesWeight from './votes_weight';

export const validateTransactions = (exceptions?: ExceptionOptions) => (
	transactions: ReadonlyArray<BaseTransaction>,
): TransactionHandledResult => {
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
 */
export const verifyTotalSpending = (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
) => {
	const spendingErrors: TransactionResponse[] = [];

	// Group the transactions per senderId to calculate total spending
	const senderTransactions = transactions.reduce((rv, x) => {
		(rv[x.senderId] = rv[x.senderId] || []).push(x);

		return rv;
		// tslint:disable-next-line readonly-keyword no-object-literal-type-assertion
	}, {} as { [key: string]: BaseTransaction[] });

	// We need to get the transaction id which cause exceeding the sufficient balance
	// So we can't sum up all transactions together at once
	// tslint:disable-next-line readonly-keyword
	const senderSpending: { [key: string]: bigint } = {};
	Object.keys(senderTransactions).forEach(senderId => {
		// We don't need to perform spending check if account have only one transaction
		// Its balance check will be performed by transaction processing
		// tslint:disable-next-line no-magic-numbers
		if (senderTransactions[senderId].length < 2) {
			return;
		}

		// Grab the sender balance
		const senderBalance = BigInt(stateStore.account.get(senderId).balance);

		// Initialize the sender spending with zero
		senderSpending[senderId] = BigInt(0);

		senderTransactions[senderId].forEach((transaction: BaseTransaction) => {
			const senderTotalSpending =
				senderSpending[senderId] +
				// tslint:disable-next-line no-any
				BigInt((transaction.asset as any).amount || 0) +
				BigInt(transaction.fee);

			if (senderBalance < senderTotalSpending) {
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

export const applyGenesisTransactions = () => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
) => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	await votesWeight.prepare(stateStore, transactions);

	const transactionsResponses = transactions.map(transaction => {
		// Fee is handled by Elements now so we set it to zero here. LIP-0012
		transaction.fee = BigInt(0);
		const transactionResponse = transaction.apply(stateStore);

		votesWeight.apply(stateStore, transaction);
		stateStore.transaction.add(transaction as TransactionJSON);

		// We are overriding the status of transaction because it's from genesis block
		(transactionResponse as WriteableTransactionResponse).status =
			TransactionStatus.OK;

		return transactionResponse;
	});

	return {
		transactionsResponses,
	};
};

export const applyTransactions = (exceptions?: ExceptionOptions) => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
): Promise<TransactionHandledResult> => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	await votesWeight.prepare(stateStore, transactions);

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
				// Update transaction response mutates the transaction response object
				exceptionsHandlers.updateTransactionResponseForExceptionTransactions(
					[transactionResponse],
					transactionsWithoutSpendingErrors,
					exceptions,
				);
			}

			if (transactionResponse.status === TransactionStatus.OK) {
				votesWeight.apply(stateStore, transaction, exceptions);
				stateStore.transaction.add(transaction as TransactionJSON);
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
	};
};

export const checkPersistedTransactions = (dataAccess: DataAccess) => async (
	transactions: ReadonlyArray<BaseTransaction>,
) => {
	if (!transactions.length) {
		return {
			transactionsResponses: [],
		};
	}

	const confirmedTransactions = await dataAccess.getTransactionsByIDs(
		transactions.map(transaction => transaction.id),
	);

	const persistedTransactionIds = confirmedTransactions.map(
		(transaction: TransactionJSON) => transaction.id,
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

export const checkAllowedTransactions = (contexter: Contexter) => (
	transactions: ReadonlyArray<BaseTransaction>,
): TransactionHandledResult => ({
	transactionsResponses: transactions.map(transaction => {
		const context = typeof contexter === 'function' ? contexter() : contexter;
		const allowed =
			!(transaction as MatcherTransaction).matcher ||
			(transaction as MatcherTransaction).matcher(context);

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

export const undoTransactions = (exceptions?: ExceptionOptions) => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
): Promise<TransactionHandledResult> => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	await votesWeight.prepare(stateStore, transactions);

	const transactionsResponses = transactions.map(transaction => {
		const transactionResponse = transaction.undo(stateStore);
		votesWeight.undo(stateStore, transaction, exceptions);

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
	};
};

export const verifyTransactions = (
	slots: Slots,
	exceptions?: ExceptionOptions,
) => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
): Promise<TransactionHandledResult> => {
	await Promise.all(transactions.map(t => t.prepare(stateStore)));

	const transactionsResponses = transactions.map(transaction => {
		stateStore.createSnapshot();
		const transactionResponse = transaction.apply(stateStore);
		if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
			(transactionResponse as WriteableTransactionResponse).status =
				TransactionStatus.FAIL;
			(transactionResponse.errors as TransactionError[]).push(
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

export const processSignature = () => async (
	transaction: BaseTransaction,
	signature: SignatureObject,
	stateStore: StateStore,
) => {
	await transaction.prepare(stateStore);

	// Add multisignature to transaction and process
	return transaction.addMultisignature(stateStore, signature);
};
