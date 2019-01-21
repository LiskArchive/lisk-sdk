import { TransactionObject, Transaction } from '../../src/transaction_pool';
import { TransactionResponse, Status } from '../../src/check_transactions';

export const wrapTransactionWithoutUniqueData = (
	transaction: TransactionObject,
): Transaction => {
	return {
		...transaction,
		containsUniqueData: false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() < 0,
		isReady: () => true,
		addVerifiedSignature: (signature: string): TransactionResponse => {
			return {
				status: Status.OK,
				errors: [],
				id: signature,
			};
		},
	};
};

export const wrapTransactionWithUniqueData = (
	transaction: TransactionObject,
): Transaction => {
	return {
		...transaction,
		containsUniqueData: true,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() < 0,
		isReady: () => true,
		addVerifiedSignature: (signature: string): TransactionResponse => {
			return {
				status: Status.OK,
				errors: [],
				id: signature,
			};
		},
	};
};

export const wrapTransaction = (
	transaction: TransactionObject,
): Transaction => {
	return [0, 1].includes(transaction.type)
		? wrapTransactionWithoutUniqueData(transaction)
		: wrapTransactionWithUniqueData(transaction);
};
