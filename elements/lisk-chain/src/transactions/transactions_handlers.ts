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

export const applyGenesisTransactions = () => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
) => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	await votesWeight.prepare(stateStore, transactions);

	const transactionsResponses: TransactionResponse[] = [];
	for (const transaction of transactions) {
		const transactionResponse = await transaction.apply(stateStore);

		await votesWeight.apply(stateStore, transaction);
		stateStore.transaction.add(transaction.toJSON());

		// We are overriding the status of transaction because it's from genesis block
		(transactionResponse as WriteableTransactionResponse).status =
			TransactionStatus.OK;
		transactionsResponses.push(transactionResponse);
	}

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

	const transactionsResponses: TransactionResponse[] = [];
	for (const transaction of transactions) {
		stateStore.account.createSnapshot();
		const transactionResponse = await transaction.apply(stateStore);
		if (transactionResponse.status !== TransactionStatus.OK) {
			// Update transaction response mutates the transaction response object
			exceptionsHandlers.updateTransactionResponseForExceptionTransactions(
				[transactionResponse],
				transactions,
				exceptions,
			);
		}
		if (transactionResponse.status === TransactionStatus.OK) {
			await votesWeight.apply(stateStore, transaction, exceptions);
			stateStore.transaction.add(transaction.toJSON());
		}

		if (transactionResponse.status !== TransactionStatus.OK) {
			stateStore.account.restoreSnapshot();
		}
		transactionsResponses.push(transactionResponse);
	}

	return {
		transactionsResponses: [...transactionsResponses],
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

	const transactionsResponses = [];
	for (const transaction of transactions) {
		const transactionResponse = await transaction.undo(stateStore);
		await votesWeight.undo(stateStore, transaction, exceptions);
		transactionsResponses.push(transactionResponse);
	}

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

export const processSignature = () => async (
	transaction: BaseTransaction,
	signature: SignatureObject,
	stateStore: StateStore,
) => {
	await transaction.prepare(stateStore);

	// Add multisignature to transaction and process
	return transaction.addMultisignature(stateStore, signature);
};
