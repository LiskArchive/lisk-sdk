import {
	BaseTransaction,
	TransactionResponse,
} from '../../src/transactions/base';
import { TransactionJSON, Status } from '../../src/transaction_types';
import { getBytes } from '../../src/transactions/helpers';

export class TestTransaction extends BaseTransaction {
	public containsUniqueData() {
		return true;
	}

	public assetToJSON() {
		return {};
	}

	public getBytes() {
		const transactionBytes = getBytes(this.toJSON());

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
