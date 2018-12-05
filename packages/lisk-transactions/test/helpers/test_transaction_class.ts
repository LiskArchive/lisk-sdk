import { BaseTransaction } from '../../src/base_transaction';
import { TransactionJSON, VerifyReturn } from '../../src/transaction_types';

export class TestTransaction extends BaseTransaction {
	public containsUniqueData() {
		return true;
	}

	public getBytes() {
		const transactionBytes = this.getBasicBytes();
		
		return transactionBytes
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): VerifyReturn {
		transactions.forEach(() => true);

		return { verified: true };
	}
}
