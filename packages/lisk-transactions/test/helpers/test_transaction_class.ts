import { BaseTransaction } from '../../src/base_transaction';
import { TransactionJSON, VerifyReturn } from '../../src/transaction_types';

export class Transaction extends BaseTransaction {
	public prepareTransaction(passphrase: string, secondPassphrase?: string) {
		const mockSignature = passphrase.toUpperCase();
		const secondMockSignature = secondPassphrase
			? secondPassphrase.toUpperCase()
			: undefined;
		return {
			...this.toJSON(),
			signature: mockSignature,
			signSignature: secondMockSignature,
		};
	}

	public containsUniqueData() {
		return true;
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): VerifyReturn {
		transactions.forEach(() => true);

		return { verified: true };
	}
}
