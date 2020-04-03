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
	TransactionResponse,
} from '@liskhq/lisk-transactions';

import { DataAccess } from '../data_access';
import { StateStore } from '../state_store';
import {
	Contexter,
	MatcherTransaction,
	WriteableTransactionResponse,
} from '../types';

export const validateTransactions = () => (
	transactions: ReadonlyArray<BaseTransaction>,
): ReadonlyArray<TransactionResponse> =>
	transactions.map(transaction => transaction.validate());

export const applyGenesisTransactions = () => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
) => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	const transactionsResponses: TransactionResponse[] = [];
	for (const transaction of transactions) {
		const transactionResponse = await transaction.apply(stateStore);

		// We are overriding the status of transaction because it's from genesis block
		(transactionResponse as WriteableTransactionResponse).status =
			TransactionStatus.OK;
		transactionsResponses.push(transactionResponse);
	}

	return transactionsResponses;
};

export const applyTransactions = () => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
): Promise<ReadonlyArray<TransactionResponse>> => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	const transactionsResponses: TransactionResponse[] = [];
	for (const transaction of transactions) {
		stateStore.account.createSnapshot();
		const transactionResponse = await transaction.apply(stateStore);

		if (transactionResponse.status !== TransactionStatus.OK) {
			stateStore.account.restoreSnapshot();
		}
		transactionsResponses.push(transactionResponse);
	}

	return [...transactionsResponses];
};

export const checkPersistedTransactions = (dataAccess: DataAccess) => async (
	transactions: ReadonlyArray<BaseTransaction>,
) => {
	if (!transactions.length) {
		return [];
	}

	const confirmedTransactions = await dataAccess.getTransactionsByIDs(
		transactions.map(transaction => transaction.id),
	);

	const persistedTransactionIds = confirmedTransactions.map(
		(transaction: BaseTransaction) => transaction.id,
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

	return transactionsResponses;
};

export const checkAllowedTransactions = (contexter: Contexter) => (
	transactions: ReadonlyArray<BaseTransaction>,
): ReadonlyArray<TransactionResponse> =>
	transactions.map(transaction => {
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
	});

export const undoTransactions = () => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
): Promise<ReadonlyArray<TransactionResponse>> => {
	// Avoid merging both prepare statements into one for...of loop as this slows down the call dramatically
	for (const transaction of transactions) {
		await transaction.prepare(stateStore);
	}

	const transactionsResponses = [];
	for (const transaction of transactions) {
		const transactionResponse = await transaction.undo(stateStore);
		transactionsResponses.push(transactionResponse);
	}

	return transactionsResponses;
};
