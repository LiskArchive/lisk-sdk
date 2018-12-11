import { TransactionObject } from '../../src/transaction_pool';

export const wrapTransferTransaction = (
	transferTransaction: TransactionObject,
) => {
	return {
		...transferTransaction,
		containsUniqueData: () => false,
		verifyTransactionAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 0,
	};
};
