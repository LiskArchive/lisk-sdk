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
 *
 */
import { Transaction } from './transaction_pool';

export type CheckerFunction = (
	transactions: ReadonlyArray<Transaction>,
) => Promise<CheckerFunctionResponse>;

export interface CheckerFunctionResponse {
	status: Status;
	transactionsResponses: ReadonlyArray<TransactionResponse>;
}

export interface TransactionResponse {
	readonly errors: ReadonlyArray<Error>;
	readonly id: string;
	readonly status: Status;
}

export enum Status {
	FAIL = 0,
	OK = 1,
}

export interface CheckTransactionsResponseWithPassAndFail {
	failedTransactions: ReadonlyArray<Transaction>;
	passedTransactions: ReadonlyArray<Transaction>;
}

const getTransactionByStatus = (
	transactions: ReadonlyArray<Transaction>,
	responses: ReadonlyArray<TransactionResponse>,
	status: Status,
): ReadonlyArray<Transaction> => {
	const transactionIdsByStatus = responses
		.filter(transactionResponse => transactionResponse.status === status)
		.map(transactionStatus => transactionStatus.id);

	const transactionsByStatus = transactions.filter(transaction =>
		transactionIdsByStatus.includes(transaction.id),
	);

	return transactionsByStatus;
};

export const checkTransactionsWithPassAndFail = async (
	transactions: ReadonlyArray<Transaction>,
	checkerFunction: CheckerFunction,
): Promise<CheckTransactionsResponseWithPassAndFail> => {
	// Process transactions and check their validity
	const { transactionsResponses } = await checkerFunction(transactions);

	const failedTransactions = getTransactionByStatus(
		transactions,
		transactionsResponses,
		Status.FAIL,
	);
	const passedTransactions = getTransactionByStatus(
		transactions,
		transactionsResponses,
		Status.OK,
	);

	return {
		failedTransactions,
		passedTransactions,
	};
};
