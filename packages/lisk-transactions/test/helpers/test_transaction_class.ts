import * as cryptography from '@liskhq/lisk-cryptography';
import {
	BaseTransaction,
	TransactionResponse,
} from '../../src/transactions/base';
import { TransactionJSON, Status } from '../../src/transaction_types';

export class TestTransaction extends BaseTransaction {
	public containsUniqueData() {
		return true;
	}

	public assetToJSON() {
		return {};
	}

	public getAssetBytes() {
		return Buffer.alloc(0);
	}

	public testGetBasicBytes() {
		return this.getBasicBytes();
	} 

	public getBytes() {
		const transactionBytes = Buffer.concat([
			this.getBasicBytes(),
			this.signature
				? cryptography.hexToBuffer(this.signature)
				: Buffer.alloc(0),
			this.signSignature
				? cryptography.hexToBuffer(this.signSignature)
				: Buffer.alloc(0),
		]);
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
