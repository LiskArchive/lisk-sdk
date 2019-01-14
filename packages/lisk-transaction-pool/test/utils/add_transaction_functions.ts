import { TransactionObject, Transaction } from '../../src/transaction_pool';

export const wrapTransferTransaction = (
	transferTransaction: TransactionObject,
): Transaction => {
	return {
		...transferTransaction,
		containsUniqueData: false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 0,
		isReady: () => true,
		addSignature: (signature: string, _: string) =>
			signature.length === 32,
	};
};
