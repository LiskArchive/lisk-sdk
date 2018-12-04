import { TransactionObject, Transaction } from '../../src/transaction_pool';

export const wrapTransferTransaction = (transferTransaction: TransactionObject): Transaction => {
	return {
		...transferTransaction,
		containsUniqueData: () => false,
		verifyTransactionAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 0
	};
};
