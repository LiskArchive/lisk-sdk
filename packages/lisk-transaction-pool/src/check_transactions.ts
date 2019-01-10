import { Transaction } from './transaction_pool';

export type CheckerFunction = (
	transactions: ReadonlyArray<Transaction>,
) => CheckerFunctionResponse;

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
	PENDING = 2,
}

export interface CheckTransactionsResponseWithPassAndFail {
	failedTransactions: ReadonlyArray<Transaction>;
	passedTransactions: ReadonlyArray<Transaction>;
}

export interface CheckTransactionsResponseWithPassFailAndPending {
	failedTransactions: ReadonlyArray<Transaction>;
	passedTransactions: ReadonlyArray<Transaction>;
	pendingTransactions: ReadonlyArray<Transaction>;
}

export const checkTransactionsWithPassAndFail = async (
	transactions: ReadonlyArray<Transaction>,
	checkerFunction: CheckerFunction,
): Promise<CheckTransactionsResponseWithPassAndFail> => {
	// Process transactions and check their validity
	const { transactionsResponses } = await checkerFunction(transactions);

	// Get ids of failed transactions from the response
	const failedTransactionIds = transactionsResponses
		.filter(transactionResponse => transactionResponse.status === Status.FAIL)
		.map(transactionStatus => transactionStatus.id);

	// Filter transactions which were failed
	const failedTransactions = transactions.filter(transaction =>
		failedTransactionIds.includes(transaction.id),
	);
	// Filter transactions which were ok
	const passedTransactions = transactions.filter(
		transaction => !failedTransactionIds.includes(transaction.id),
	);

	return {
		failedTransactions,
		passedTransactions,
	};
};

export const checkTransactionsWithPassFailAndPending = async (
	transactions: ReadonlyArray<Transaction>,
	checkerFunction: CheckerFunction,
): Promise<CheckTransactionsResponseWithPassFailAndPending> => {
	// Process transactions and check their validity
	const { transactionsResponses } = await checkerFunction(transactions);

	// Get ids of failed transactions from the response
	const failedTransactionIds = transactionsResponses
		.filter(transactionResponse => transactionResponse.status === Status.FAIL)
		.map(transactionStatus => transactionStatus.id);

	// Get ids of passed transactions from the response
	const passedTransactionIds = transactionsResponses
		.filter(transactionResponse => transactionResponse.status === Status.OK)
		.map(transactionStatus => transactionStatus.id);

	// Get ids of passed transactions from the response
	const pendingTransactionIds = transactionsResponses
		.filter(
			transactionResponse => transactionResponse.status === Status.PENDING,
		)
		.map(transactionStatus => transactionStatus.id);

	// Filter transactions which were failed
	const failedTransactions = transactions.filter(transaction =>
		failedTransactionIds.includes(transaction.id),
	);

	// Filter transactions which were ok
	const pendingTransactions = transactions.filter(transaction =>
		pendingTransactionIds.includes(transaction.id),
	);

	// Filter transactions which were ok
	const passedTransactions = transactions.filter(transaction =>
		passedTransactionIds.includes(transaction.id),
	);

	return {
		failedTransactions,
		passedTransactions,
		pendingTransactions,
	};
};
