import {
	BaseTransaction,
	TransactionResponse,
} from '../../src/transactions/base';
import { TransactionJSON, Status } from '../../src/transaction_types';

export class TestTransaction extends BaseTransaction {
	public containsUniqueData(): boolean {
		return true;
	}

	public assetToJSON(): object {
		return {};
	}

	public getAssetBytes(): Buffer {
		return Buffer.alloc(0);
	}

	public testGetBasicBytes(): Buffer {
		return this.getBasicBytes();
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
