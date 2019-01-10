import { TransactionObject, SignatureObject } from '../../src/transaction_pool';

export const wrapTransferTransaction = (
	transferTransaction: TransactionObject,
) => {
	return {
		...transferTransaction,
		containsUniqueData: () => false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 0,
		isReady: () => true,
		addSignature: (signatureObject: SignatureObject) =>
			signatureObject.signature.length === 32,
	};
};
