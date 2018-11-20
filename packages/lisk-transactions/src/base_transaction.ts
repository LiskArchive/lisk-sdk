import cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { TransactionError } from './errors';
import {
	IAccount,
	IBaseTransaction,
	IKeyPair,
	ITransactionJSON,
} from './transaction_types';
import { getTransactionBytes } from './utils/get_transaction_bytes';
import { getTransactionHash } from './utils/get_transaction_hash';
import { getTransactionId } from './utils/get_transaction_id';
import { verifyTransaction } from './utils/sign_and_verify';
import { validateTransaction } from './utils/validation/validate_transaction';

export class BaseTransaction implements IBaseTransaction {
	public amount: BigNum;
	public blockId: string;
	public confirmations: BigNum;
	public fee: BigNum;
	public height: string;
	public id: string;
	public rawTransaction: object;
	public recipientId: string;
	public recipientPublicKey: string;
	public senderId: string;
	public senderPublicKey: string;
	public signature: string;
	public signatures?: ReadonlyArray<string>;
	public signSignature?: string;
	public timestamp: number;
	public transactionJSON: ITransactionJSON;
	public type: number;

	public constructor(rawTransaction: ITransactionJSON) {
		this.amount = new BigNum(rawTransaction.amount);
		this.blockId = rawTransaction.blockId;
		this.confirmations = new BigNum(rawTransaction.confirmations);
		this.fee = new BigNum(0);
		this.height = rawTransaction.height;
		this.id = rawTransaction.id;
		this.rawTransaction = rawTransaction;
		this.recipientId = rawTransaction.recipientId;
		this.recipientPublicKey = rawTransaction.recipientPublicKey;
		this.senderId = rawTransaction.senderId;
		this.senderPublicKey = rawTransaction.senderPublicKey;
		this.signature = rawTransaction.signature;
		this.signatures = rawTransaction.signatures;
		this.signSignature = rawTransaction.signSignature;
		this.timestamp = rawTransaction.timestamp;
		this.transactionJSON = this.createJSON();
		this.type = rawTransaction.type;
	}

	public checkBalance(
		sender: IAccount,
	): {
		readonly exceeded: boolean;
		readonly errors: ReadonlyArray<TransactionError> | undefined;
	} {
		const exceeded = new BigNum(sender.balance).lt(this.amount);

		return {
			exceeded,
			errors: exceeded
				? [
						new TransactionError(
							`Account does not have enough LSK: ${
								sender.address
							} balance: ${new BigNum(sender.balance.toString() || '0').div(
								// tslint:disable-next-line:no-magic-numbers
								Math.pow(10, 8),
							)}`,
						),
				  ]
				: undefined,
		};
	}

	public createJSON(): ITransactionJSON {
		const transaction = {
			id: this.id,
			amount: this.amount.toNumber(),
			height: this.height,
			blockId: this.blockId,
			confirmations: this.confirmations.toNumber(),
			type: this.type,
			timestamp: this.timestamp,
			senderPublicKey: this.senderPublicKey,
			senderId: this.senderId,
			recipientId: this.recipientId,
			recipientPublicKey: this.recipientPublicKey,
			fee: this.fee.toNumber(),
			signature: this.signature,
			signSignature: this.signSignature,
		};

		return transaction;
	}

	public getBytes(): Buffer {
		return getTransactionBytes(this.transactionJSON);
	}

	public getId(): string {
		return getTransactionId(this.transactionJSON);
	}

	public sign(keyPair: IKeyPair): string {
		const transactionHash = getTransactionHash(this.transactionJSON);

		return cryptography.signDataWithPrivateKey(
			transactionHash,
			cryptography.hexToBuffer(keyPair.privateKey),
		);
	}

	public validate(): {
		readonly validated: boolean;
		readonly errors: ReadonlyArray<TransactionError> | undefined;
	} {
		// Schema check
		const { valid, errors } = validateTransaction(this.transactionJSON);
		const transactionErrors = errors
			? errors.map(error => new TransactionError(error.message, error.dataPath))
			: undefined;

		// Signatures check
		const verified = verifyTransaction(this.transactionJSON);

		return {
			validated: valid && verified,
			errors: transactionErrors,
		};
	}
}
