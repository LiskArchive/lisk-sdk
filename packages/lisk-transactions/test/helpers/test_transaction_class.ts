import {
	BaseTransaction,
	EntityMap,
	RequiredState,
	TransactionResponse,
} from '../../src/transactions/base';
import { TransactionJSON, Status } from '../../src/transaction_types';

export class TestTransaction extends BaseTransaction {
	public assetToJSON(): object {
		return {};
	}

	public getAssetBytes(): Buffer {
		return Buffer.alloc(0);
	}

	public processRequiredState(_: EntityMap): RequiredState {
		return {
			sender: {
				address: '123L',
				balance: '10000000',
				publicKey:
					'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
			},
		};
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
