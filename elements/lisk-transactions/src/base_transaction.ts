/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import * as BigNum from '@liskhq/bignum';
import {
	bigNumberToBuffer,
	getAddressFromPublicKey,
	hash,
	hexToBuffer,
	signData,
} from '@liskhq/lisk-cryptography';
import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} from './constants';
import { SignatureObject } from './create_signature_object';
import {
	convertToTransactionError,
	TransactionError,
	TransactionPendingError,
} from './errors';
import { createResponse, Status } from './response';
import { Account, TransactionJSON } from './transaction_types';
import {
	getId,
	isValidNumber,
	validateSenderIdAndPublicKey,
	validateSignature,
	validateTransactionId,
	validator,
	verifyBalance,
	verifyMultiSignatures,
	verifySecondSignature,
	verifySenderId,
	verifySenderPublicKey,
} from './utils';
import * as schemas from './utils/validation/schema';

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
}

export interface StateStoreGetter<T> {
	get(key: string): T;
	find(func: (item: T) => boolean): T | undefined;
}

export interface StateStoreDefaultGetter<T> {
	getOrDefault(key: string): T;
}

export interface StateStoreSetter<T> {
	set(key: string, value: T): void;
}

export interface StateStore {
	readonly account: StateStoreGetter<Account> &
		StateStoreDefaultGetter<Account> &
		StateStoreSetter<Account>;
	readonly transaction: StateStoreGetter<TransactionJSON>;
}

export interface StateStoreCache<T> {
	cache(
		filterArray: ReadonlyArray<{ readonly [key: string]: string }>,
	): Promise<ReadonlyArray<T>>;
}

export interface StateStorePrepare {
	readonly account: StateStoreCache<Account>;
	readonly transaction: StateStoreCache<TransactionJSON>;
}

export enum MultisignatureStatus {
	UNKNOWN = 0,
	NONMULTISIGNATURE = 1,
	PENDING = 2,
	READY = 3,
	FAIL = 4,
}

export const ENTITY_ACCOUNT = 'account';
export const ENTITY_TRANSACTION = 'transaction';

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly recipientId: string;
	public readonly blockId?: string;
	public readonly height?: number;
	public readonly relays?: number;
	public readonly confirmations?: number;
	public readonly recipientPublicKey?: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signatures: string[];
	public readonly timestamp: number;
	public readonly type: number;
	public readonly containsUniqueData?: boolean;
	public readonly fee: BigNum;
	public readonly asset: object;
	public receivedAt?: Date;

	public static TYPE: number;

	protected _id?: string;
	protected _signature?: string;
	protected _signSignature?: string;
	protected _multisignatureStatus: MultisignatureStatus =
		MultisignatureStatus.UNKNOWN;

	public abstract prepare(store: StateStorePrepare): Promise<void>;
	protected abstract validateAsset(): ReadonlyArray<TransactionError>;
	protected abstract applyAsset(
		store: StateStore,
	): ReadonlyArray<TransactionError>;
	protected abstract undoAsset(
		store: StateStore,
	): ReadonlyArray<TransactionError>;
	protected abstract verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError>;
	// tslint:disable-next-line no-any
	protected abstract assetFromSync(raw: any): object | undefined;

	// tslint:disable-next-line cyclomatic-complexity
	public constructor(rawTransaction: unknown) {
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.amount = new BigNum(
			isValidNumber(tx.amount) ? (tx.amount as string | number) : '0',
		);
		this.fee = new BigNum(
			isValidNumber(tx.fee) ? (tx.fee as string | number) : '0',
		);

		this._id = tx.id;
		this.recipientId = tx.recipientId || '';
		this.recipientPublicKey = tx.recipientPublicKey || undefined;
		this.senderPublicKey = tx.senderPublicKey || '';
		try {
			this.senderId = tx.senderId
				? tx.senderId
				: getAddressFromPublicKey(this.senderPublicKey);
		} catch (error) {
			this.senderId = '';
		}

		this._signature = tx.signature;
		this.signatures = (tx.signatures as string[]) || [];
		this._signSignature = tx.signSignature;
		// Infinity is invalid for these types
		this.timestamp = typeof tx.timestamp === 'number' ? tx.timestamp : Infinity;
		this.type = typeof tx.type === 'number' ? tx.type : Infinity;

		// Additional data not related to the protocol
		this.confirmations = tx.confirmations;
		this.blockId = tx.blockId;
		this.height = tx.height;
		this.receivedAt = tx.receivedAt ? new Date(tx.receivedAt) : undefined;
		this.relays = typeof tx.relays === 'number' ? tx.relays : undefined;
		this.asset = tx.asset || {};
	}

	public get id(): string {
		if (!this._id) {
			throw new Error('id is required to be set before use');
		}

		return this._id;
	}

	public get signature(): string {
		if (!this._signature) {
			throw new Error('signature is required to be set before use');
		}

		return this._signature;
	}

	public get signSignature(): string | undefined {
		return this._signSignature;
	}

	public toJSON(): TransactionJSON {
		const transaction = {
			id: this.id,
			blockId: this.blockId,
			height: this.height,
			relays: this.relays,
			confirmations: this.confirmations,
			amount: this.amount.toString(),
			type: this.type,
			timestamp: this.timestamp,
			senderPublicKey: this.senderPublicKey,
			senderId: this.senderId,
			recipientId: this.recipientId,
			recipientPublicKey: this.recipientPublicKey,
			fee: this.fee.toString(),
			signature: this.signature,
			signSignature: this.signSignature ? this.signSignature : undefined,
			signatures: this.signatures,
			asset: this.assetToJSON(),
			receivedAt: this.receivedAt ? this.receivedAt.toISOString() : undefined,
		};

		return transaction;
	}

	public isReady(): boolean {
		return (
			this._multisignatureStatus === MultisignatureStatus.READY ||
			this._multisignatureStatus === MultisignatureStatus.NONMULTISIGNATURE
		);
	}

	public getBytes(): Buffer {
		const transactionBytes = Buffer.concat([
			this.getBasicBytes(),
			this._signature ? hexToBuffer(this._signature) : Buffer.alloc(0),
			this._signSignature ? hexToBuffer(this._signSignature) : Buffer.alloc(0),
		]);

		return transactionBytes;
	}

	public validate(): TransactionResponse {
		const errors = [...this._validateSchema(), ...this.validateAsset()];
		if (errors.length > 0) {
			return createResponse(this.id, errors);
		}
		const transactionBytes = this.getBasicBytes();

		const {
			valid: signatureValid,
			error: verificationError,
		} = validateSignature(
			this.senderPublicKey,
			this.signature,
			transactionBytes,
			this.id,
		);

		if (!signatureValid && verificationError) {
			errors.push(verificationError);
		}

		const idError = validateTransactionId(this.id, this.getBytes());

		if (idError) {
			errors.push(idError);
		}

		if (this.type !== (this.constructor as typeof BaseTransaction).TYPE) {
			errors.push(
				new TransactionError(
					`Invalid type`,
					this.id,
					'.type',
					this.type,
					(this.constructor as typeof BaseTransaction).TYPE,
				),
			);
		}

		return createResponse(this.id, errors);
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const errors = this.verifyAgainstTransactions(transactions);

		return createResponse(this.id, errors);
	}

	public apply(store: StateStore): TransactionResponse {
		const sender = store.account.getOrDefault(this.senderId);
		const errors = this._verify(sender) as TransactionError[];

		// Verify MultiSignature
		const { errors: multiSigError } = this.processMultisignatures(store);
		if (multiSigError) {
			errors.push(...multiSigError);
		}

		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedSender = {
			...sender,
			balance: updatedBalance.toString(),
			publicKey: sender.publicKey || this.senderPublicKey,
		};
		store.account.set(updatedSender.address, updatedSender);
		const assetErrors = this.applyAsset(store);

		errors.push(...assetErrors);

		if (
			this._multisignatureStatus === MultisignatureStatus.PENDING &&
			errors.length === 1 &&
			errors[0] instanceof TransactionPendingError
		) {
			return {
				id: this.id,
				status: Status.PENDING,
				errors,
			};
		}

		return createResponse(this.id, errors);
	}

	public undo(store: StateStore): TransactionResponse {
		const sender = store.account.getOrDefault(this.senderId);
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = {
			...sender,
			balance: updatedBalance.toString(),
			publicKey: sender.publicKey || this.senderPublicKey,
		};
		const errors = updatedBalance.lte(MAX_TRANSACTION_AMOUNT)
			? []
			: [
					new TransactionError(
						'Invalid balance amount',
						this.id,
						'.balance',
						sender.balance,
						updatedBalance.toString(),
					),
			  ];
		store.account.set(updatedAccount.address, updatedAccount);
		const assetErrors = this.undoAsset(store);
		errors.push(...assetErrors);

		return createResponse(this.id, errors);
	}

	public addMultisignature(
		store: StateStore,
		signatureObject: SignatureObject,
	): TransactionResponse {
		// Get the account
		const account = store.account.get(this.senderId);
		// Validate signature key belongs to account's multisignature group
		if (
			account.membersPublicKeys &&
			!account.membersPublicKeys.includes(signatureObject.publicKey)
		) {
			return createResponse(this.id, [
				new TransactionError(
					`Public Key '${
						signatureObject.publicKey
					}' is not a member for account '${account.address}'.`,
					this.id,
				),
			]);
		}

		// Check if signature is not already there
		if (this.signatures.includes(signatureObject.signature)) {
			return createResponse(this.id, [
				new TransactionError(
					`Signature '${
						signatureObject.signature
					}' already present in transaction.`,
					this.id,
				),
			]);
		}

		// Validate the signature using the signature sender and transaction details
		const { valid } = validateSignature(
			signatureObject.publicKey,
			signatureObject.signature,
			this.getBasicBytes(),
			this.id,
		);
		// If the signature is valid for the sender push it to the signatures array
		if (valid) {
			this.signatures.push(signatureObject.signature);

			return this.processMultisignatures(store);
		}
		// Else populate errors
		const errors = valid
			? []
			: [
					new TransactionError(
						`Failed to add signature '${signatureObject.signature}'.`,
						this.id,
						'.signatures',
					),
			  ];

		return createResponse(this.id, errors);
	}

	public addVerifiedMultisignature(signature: string): TransactionResponse {
		if (!this.signatures.includes(signature)) {
			this.signatures.push(signature);

			return createResponse(this.id, []);
		}

		return createResponse(this.id, [
			new TransactionError('Failed to add signature.', this.id, '.signatures'),
		]);
	}

	public processMultisignatures(store: StateStore): TransactionResponse {
		const sender = store.account.get(this.senderId);
		const transactionBytes = this.getBasicBytes();

		const { status, errors } = verifyMultiSignatures(
			this.id,
			sender,
			this.signatures,
			transactionBytes,
		);
		this._multisignatureStatus = status;
		if (this._multisignatureStatus === MultisignatureStatus.PENDING) {
			return {
				id: this.id,
				status: Status.PENDING,
				errors,
			};
		}

		return createResponse(this.id, errors);
	}

	public isExpired(date: Date = new Date()): boolean {
		if (!this.receivedAt) {
			this.receivedAt = new Date();
		}
		// tslint:disable-next-line no-magic-numbers
		const timeNow = Math.floor(date.getTime() / 1000);
		const timeOut =
			this._multisignatureStatus === MultisignatureStatus.PENDING ||
			this._multisignatureStatus === MultisignatureStatus.READY
				? UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT
				: UNCONFIRMED_TRANSACTION_TIMEOUT;
		const timeElapsed =
			// tslint:disable-next-line no-magic-numbers
			timeNow - Math.floor(this.receivedAt.getTime() / 1000);

		return timeElapsed > timeOut;
	}

	public sign(passphrase: string, secondPassphrase?: string): void {
		this._signature = undefined;
		this._signSignature = undefined;
		this._signature = signData(hash(this.getBytes()), passphrase);
		if (secondPassphrase) {
			this._signSignature = signData(hash(this.getBytes()), secondPassphrase);
		}
		this._id = getId(this.getBytes());
	}

	/* tslint:disable:next-line: no-any no-null-keyword */
	public fromSync(raw: any): TransactionJSON | null {
		const transactionJSON: TransactionJSON & {
			readonly requesterPublicKey: string;
			readonly [key: string]: string | number | object | null;
		} = {
			id: raw.t_id,
			height: raw.b_height,
			blockId: raw.b_id || raw.t_blockId,
			type: parseInt(raw.t_type, 10),
			timestamp: parseInt(raw.t_timestamp, 10),
			senderPublicKey: raw.t_senderPublicKey,
			requesterPublicKey: raw.t_requesterPublicKey,
			senderId: raw.t_senderId,
			recipientId: raw.t_recipientId,
			recipientPublicKey: raw.m_recipientPublicKey || null,
			amount: raw.t_amount,
			fee: raw.t_fee,
			signature: raw.t_signature,
			signSignature: raw.t_signSignature,
			signatures: raw.t_signatures ? raw.t_signatures.split(',') : [],
			confirmations: parseInt(raw.confirmations || 0, 10),
			asset: {},
		};

		const transaction = {
			...transactionJSON,
			asset: this.assetFromSync(raw) || {},
		};

		return transaction;
	}

	protected getBasicBytes(): Buffer {
		const transactionType = Buffer.alloc(BYTESIZES.TYPE, this.type);
		const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
		transactionTimestamp.writeIntLE(this.timestamp, 0, BYTESIZES.TIMESTAMP);

		const transactionSenderPublicKey = hexToBuffer(this.senderPublicKey);

		const transactionRecipientID = this.recipientId
			? bigNumberToBuffer(
					this.recipientId.slice(0, -1),
					BYTESIZES.RECIPIENT_ID,
			  ).slice(0, BYTESIZES.RECIPIENT_ID)
			: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

		const transactionAmount = this.amount.toBuffer({
			endian: 'little',
			size: BYTESIZES.AMOUNT,
		});

		return Buffer.concat([
			transactionType,
			transactionTimestamp,
			transactionSenderPublicKey,
			transactionRecipientID,
			transactionAmount,
			this.assetToBytes(),
		]);
	}

	public assetToJSON(): object {
		return this.asset;
	}

	protected assetToBytes(): Buffer {
		// Sort the content to obtain the same asset's signature, despite on the properties or values order.
		return Buffer.from(JSON.stringify(this.asset).split('').sort().toString(), 'utf-8');
	}

	private _verify(sender: Account): ReadonlyArray<TransactionError> {
		const secondSignatureTxBytes = Buffer.concat([
			this.getBasicBytes(),
			hexToBuffer(this.signature),
		]);

		// Verify Basic state
		return [
			verifySenderPublicKey(this.id, sender, this.senderPublicKey),
			verifySenderId(this.id, sender, this.senderId),
			verifyBalance(this.id, sender, this.fee),
			verifySecondSignature(
				this.id,
				sender,
				this.signSignature,
				secondSignatureTxBytes,
			),
		].filter(Boolean) as ReadonlyArray<TransactionError>;
	}

	private _validateSchema(): ReadonlyArray<TransactionError> {
		const transaction = this.toJSON();
		validator.validate(schemas.baseTransaction, transaction);
		const errors = convertToTransactionError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (
			!errors.find(
				(err: TransactionError) => err.dataPath === '.senderPublicKey',
			)
		) {
			// `senderPublicKey` passed format check, safely check equality to senderId
			const senderIdError = validateSenderIdAndPublicKey(
				this.id,
				this.senderId,
				this.senderPublicKey,
			);
			if (senderIdError) {
				errors.push(senderIdError);
			}
		}

		return errors;
	}
}
