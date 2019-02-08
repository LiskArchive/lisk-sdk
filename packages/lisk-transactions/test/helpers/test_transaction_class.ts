import { BaseTransaction } from '../../src/transactions/base';
import { TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';

export class TestTransaction extends BaseTransaction {
	public assetToJSON(): object {
		return {};
	}

	public async prepareTransaction() {
		return;
	}

	public getAssetBytes(): Buffer {
		return Buffer.alloc(0);
	}

	public validateAsset() {
		return [];
	}

	public applyAsset() {
		return [];
	}

	public undoAsset() {
		return [];
	}

	public verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		transactions.forEach(() => true);

		return [];
	}
}
