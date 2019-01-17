import { TransactionObject, Transaction } from '../../src/transaction_pool';

export const wrapTransactionWithoutUniqueData = (
	transaction: TransactionObject,
): Transaction => {
	return {
		...transaction,
		containsUniqueData: () => false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 1000,
	};
};

export const wrapTransactionWithUniqueData =  (
	transaction: TransactionObject,
): Transaction => {
	return {
		...transaction,
		containsUniqueData: () => true,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 1000,
	};
};

export const wrapTransaction = (transaction: TransactionObject): Transaction => {
	return [0, 1].includes(transaction.type) ? wrapTransactionWithoutUniqueData(transaction) : wrapTransactionWithUniqueData(transaction);
}
