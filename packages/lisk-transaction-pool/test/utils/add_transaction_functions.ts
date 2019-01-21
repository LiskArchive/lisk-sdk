import { TransactionObject, Transaction } from '../../src/transaction_pool';
import { TransactionResponse, Status } from '../../src/check_transactions';

export const wrapTransferTransaction = (
	transferTransaction: TransactionObject,
): Transaction => {
	return {
		...transferTransaction,
		containsUniqueData: false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() > 0,
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
