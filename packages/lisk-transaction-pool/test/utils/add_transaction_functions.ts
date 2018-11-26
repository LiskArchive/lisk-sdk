import { Transaction } from '../../src/transaction_pool';

export const wrapTransferTransaction = (transferTransaction: Transaction) => {
	return {
		...transferTransaction,
		containsUnqiueData: () => false,
		verifyTransactionAgainstOtherTransactions: () => true,
	};
};
