import { TransactionObject } from '../../src/transaction_pool';

export const wrapTransferTransaction = (
	transferTransaction: TransactionObject,
) => {
	return {
		...transferTransaction,
		containsUniqueData: () => false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 0,
	};
};
