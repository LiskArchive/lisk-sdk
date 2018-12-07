import {
	BaseTransaction,
	TransactionResponse,
} from '../../src/base_transaction';
import { TransactionJSON, Status } from '../../src/transaction_types';

export class TestTransaction extends BaseTransaction {
	public containsUniqueData() {
		return true;
	}

	public assetToJSON() {
		return {};
	}

	public getBytes() {
		const transactionBytes = this.getBasicBytes();

		return transactionBytes;
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		transactions.forEach(() => true);

		return {
			id: this.id,
			status: Status.OK,
			errors: [],
		};
	}
}
