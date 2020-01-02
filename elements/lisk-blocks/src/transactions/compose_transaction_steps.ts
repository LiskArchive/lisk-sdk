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
	TransactionResponse,
} from '@liskhq/lisk-transactions';

import { StateStore } from '../state_store';

type TransactionAsyncFn = (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore: StateStore,
) => Promise<TransactionHandledResult>;

type TransactionSyncFn = (
	transactions: ReadonlyArray<BaseTransaction>,
) => TransactionHandledResult;

type TransactionFn = TransactionAsyncFn | TransactionSyncFn;

export interface TransactionHandledResult {
	readonly transactionsResponses: ReadonlyArray<TransactionResponse>;
}

export const composeTransactionSteps = (
	...steps: ReadonlyArray<TransactionFn>
) => async (
	transactions: ReadonlyArray<BaseTransaction>,
	stateStore?: StateStore,
): Promise<TransactionHandledResult> => {
	const successfulResponses: TransactionResponse[] = [];
	const failedResponses: TransactionResponse[] = [];

	for (const fn of steps) {
		const filteredTransactions =
			failedResponses.length > 0
				? transactions.filter(
						transaction =>
							!failedResponses.map(res => res.id).includes(transaction.id),
				  )
				: transactions;
		const { transactionsResponses } = stateStore
			? await fn(filteredTransactions, stateStore)
			: (fn as TransactionSyncFn)(filteredTransactions);
		for (const response of transactionsResponses) {
			if (response.status !== TransactionStatus.OK) {
				failedResponses.push(response);
			} else {
				successfulResponses.push(response);
			}
		}
	}

	return {
		transactionsResponses: [...failedResponses, ...successfulResponses],
	};
};
