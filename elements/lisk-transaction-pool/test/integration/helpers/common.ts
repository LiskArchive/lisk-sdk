import {
	CheckerFunctionResponse,
	CheckTransactionsResponseWithPassAndFail,
	Status,
} from '../../../src/check_transactions';
import { Transaction } from '../../../src/transaction_pool';

export const checkerFunctionResponseGenerator = async (
	passedTransactions: ReadonlyArray<Transaction>,
	failedTransactions: ReadonlyArray<Transaction>,
): Promise<CheckerFunctionResponse> => {
	const passedTransactionsResponse = passedTransactions.map(transaction => {
		return {
			id: transaction.id,
			status: Status.OK,
			errors: [],
		};
	});

	const failedTransactionsResponse = failedTransactions.map(transaction => {
		return {
			id: transaction.id,
			status: Status.FAIL,
			errors: [new Error()],
		};
	});

	return {
		status: failedTransactions.length === 0 ? Status.OK : Status.FAIL,
		transactionsResponses: [
			...passedTransactionsResponse,
			...failedTransactionsResponse,
		],
	};
};

export const fakeCheckFunctionGenerator = (
	firstCharacterOfFailedTransactionsId: ReadonlyArray<String>,
) => {
	return (transactions: ReadonlyArray<Transaction>) => {
		return transactions.reduce(
			(
				checkedTransactions: CheckTransactionsResponseWithPassAndFail,
				transaction: Transaction,
			) => {
				if (!firstCharacterOfFailedTransactionsId.includes(transaction.id[0])) {
					checkedTransactions.passedTransactions = [
						...checkedTransactions.passedTransactions,
						transaction,
					];
				} else {
					checkedTransactions.failedTransactions = [
						...checkedTransactions.failedTransactions,
						transaction,
					];
				}
				return checkedTransactions;
			},
			{
				passedTransactions: [],
				failedTransactions: [],
			},
		);
	};
};

export const fakeCheckerFunctionGenerator = (
	checkFunction: (
		transactions: ReadonlyArray<Transaction>,
	) => CheckTransactionsResponseWithPassAndFail,
) => {
	return (transactions: ReadonlyArray<Transaction>) => {
		const { passedTransactions, failedTransactions } = checkFunction(
			transactions,
		);
		return checkerFunctionResponseGenerator(
			passedTransactions,
			failedTransactions,
		);
	};
};

export const wrapExpectationInNextTick = (expectations: Function) => {
	return new Promise(resolve => {
		process.nextTick(() => {
			expectations();
			resolve();
		});
	});
};
