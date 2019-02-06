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
// tslint:disable-next-line no-reference
/// <reference path="../../types/browserify-bignum/index.d.ts" />

import {
	bigNumberToBuffer,
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	hash,
	hexToBuffer,
	signData,
} from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} from '../constants';
import {
	TransactionError,
	TransactionMultiError,
	TransactionPendingError,
} from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import {
	checkTypes,
	convertBeddowsToLSK,
	getId,
	getTimeWithOffset,
	validator,
	verifyBalance,
	verifyMultisignatures,
	verifySignature,
} from '../utils';
import * as schemas from '../utils/validation/schema';

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
	readonly state?: { readonly sender: Account; readonly recipient?: Account };
}

export interface Attributes {
	readonly [entity: string]: {
		readonly [property: string]: ReadonlyArray<string>;
	};
}

export interface StateStoreGetter<T> {
	get(key: string): T;
	find(func: (item: T) => boolean): T | undefined;
}

export interface StateStoreSetter<T> {
	set(key: string, value: T): void;
}

export interface StateStore {
	readonly account: StateStoreGetter<Account> & StateStoreSetter<Account>;
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
}

export const ENTITY_ACCOUNT = 'account';
export const ENTITY_TRANSACTION = 'transaction';
export interface CreateBaseTransactionInput {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

export const createBaseTransaction = ({
	passphrase,
	timeOffset,
}: CreateBaseTransactionInput) => {
	const { address: senderId, publicKey: senderPublicKey } = passphrase
		? getAddressAndPublicKeyFromPassphrase(passphrase)
		: { address: undefined, publicKey: undefined };
	const timestamp = getTimeWithOffset(timeOffset);

	return {
		amount: '0',
		recipientId: '',
		senderId,
		senderPublicKey,
		timestamp,
	};
};

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly recipientId: string;
	public readonly recipientPublicKey?: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signatures: string[];
	public readonly timestamp: number;
	public readonly type: number;
	public readonly receivedAt: Date;
	public readonly containsUniqueData?: boolean;

	protected _fee: BigNum;
	private _id?: string;
	private _multisignatureStatus: MultisignatureStatus =
		MultisignatureStatus.UNKNOWN;
	private _signature?: string;
	private _signSignature?: string;

	public abstract assetToJSON(): object;
	public abstract prepareTransaction(store: StateStorePrepare): Promise<void>;
	protected abstract getAssetBytes(): Buffer;
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

	public constructor(rawTransaction: TransactionJSON) {
		const { valid, errors } = checkTypes(rawTransaction);
		if (!valid) {
			throw new TransactionMultiError(
				'Invalid field types',
				rawTransaction.id,
				errors,
			);
		}

		this.amount = new BigNum(rawTransaction.amount);
		this._fee = new BigNum(rawTransaction.fee);
		this._id = rawTransaction.id;
		this.recipientId = rawTransaction.recipientId;
		this.recipientPublicKey = rawTransaction.recipientPublicKey;
		this.senderId =
			rawTransaction.senderId ||
			getAddressFromPublicKey(rawTransaction.senderPublicKey);
		this.senderPublicKey = rawTransaction.senderPublicKey;
		this._signature = rawTransaction.signature;
		this.signatures = (rawTransaction.signatures as string[]) || [];
		this._signSignature = rawTransaction.signSignature;
		this.timestamp = rawTransaction.timestamp;
		this.type = rawTransaction.type;
		this.receivedAt = rawTransaction.receivedAt || new Date();
	}

	public get fee(): BigNum {
		if (!this._fee) {
			throw new Error('fee is required to be set before use');
		}

		return this._fee;
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
			receivedAt: this.receivedAt,
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
		const errors = [...this.validateAsset()];

		const transactionBytes = this.getBasicBytes();

		const {
			verified: signatureVerified,
			error: verificationError,
		} = verifySignature(
			this.senderPublicKey,
			this.signature,
			transactionBytes,
			this.id,
		);

		if (!signatureVerified) {
			errors.push(verificationError as TransactionError);
		}

		if (Array.isArray(this.signatures) && this.signatures.length > 0) {
			// Check that signatures are unique
			const uniqueSignatures: ReadonlyArray<string> = [
				...new Set(this.signatures),
			];
			if (uniqueSignatures.length !== this.signatures.length) {
				errors.push(
					new TransactionError(
						'Encountered duplicate signature in transaction',
						this.id,
						'.signatures',
					),
				);
			}
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public verify(store: StateStore): TransactionResponse {
		const sender = store.account.get(this.senderId);
		const errors: TransactionError[] = [];
		// Check senderPublicKey
		if (sender.publicKey !== this.senderPublicKey) {
			errors.push(
				new TransactionError(
					'Invalid sender publicKey',
					this.id,
					'.senderPublicKey',
				),
			);
		}

		// Check senderId
		if (
			typeof sender.address === 'string' &&
			sender.address.toUpperCase() !== this.senderId.toUpperCase()
		) {
			errors.push(
				new TransactionError('Invalid sender address', this.id, '.senderId'),
			);
		}

		// Check missing secondPublicKey on account
		if (this.signSignature && !sender.secondPublicKey) {
			errors.push(
				new TransactionError('Sender does not have a secondPublicKey', this.id),
			);
		}

		// Balance verification
		const { verified: balanceVerified, error: balanceError } = verifyBalance(
			sender,
			this.fee,
		);

		if (!balanceVerified && balanceError) {
			errors.push(balanceError);
		}

		// Signature verifications

		// Verify secondPublicKey
		if (sender.secondPublicKey) {
			// Check for missing signSignature
			if (!this.signSignature) {
				errors.push(
					new TransactionError(
						'Missing signSignature',
						this.id,
						'.signSignature',
					),
				);
			} else {
				const transactionBytes = Buffer.concat([
					this.getBasicBytes(),
					hexToBuffer(this.signature),
				]);

				const {
					verified: signatureVerified,
					error: verificationError,
				} = verifySignature(
					sender.secondPublicKey,
					this.signSignature,
					transactionBytes,
					this.id,
				);

				if (!signatureVerified) {
					errors.push(verificationError as TransactionError);
				}
			}
		}
		// Verify multisignatures
		if (
			!(
				sender.multisignatures &&
				sender.multisignatures.length > 0 &&
				sender.multimin
			)
		) {
			this._multisignatureStatus = MultisignatureStatus.NONMULTISIGNATURE;

			return {
				id: this.id,
				status: errors.length === 0 ? Status.OK : Status.FAIL,
				errors,
			};
		}
		this._multisignatureStatus = MultisignatureStatus.PENDING;
		const {
			status,
			errors: multisignatureErrors,
		} = this.processMultisignatures(sender);

		if (status === Status.PENDING && errors.length === 0) {
			return {
				id: this.id,
				status,
				errors: multisignatureErrors,
			};
		}

		if (multisignatureErrors.length > 0) {
			errors.push(...multisignatureErrors);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const errors = this.verifyAgainstTransactions(transactions);

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply(store: StateStore): TransactionResponse {
		const sender = store.account.get(this.senderId);
		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };
		const errors = updatedBalance.gte(0)
			? []
			: [
					new TransactionError(
						`Account does not have enough LSK: ${
							sender.address
						}, balance: ${convertBeddowsToLSK(sender.balance)}`,
						this.id,
					),
			  ];
		store.account.set(updatedAccount.address, updatedAccount);
		const assetErrors = this.applyAsset(store);
		errors.push(...assetErrors);

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state: { sender: updatedAccount },
			errors,
		};
	}

	public undo(store: StateStore): TransactionResponse {
		const sender = store.account.get(this.senderId);
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };
		const errors = updatedBalance.lte(MAX_TRANSACTION_AMOUNT)
			? []
			: [new TransactionError('Invalid balance amount', this.id)];
		store.account.set(updatedAccount.address, updatedAccount);
		const assetErrors = this.undoAsset(store);
		errors.push(...assetErrors);

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state: { sender: updatedAccount },
			errors,
		};
	}

	public addVerifiedMultisignature(signature: string): TransactionResponse {
		if (!this.signatures.includes(signature)) {
			this.signatures.push(signature);

			return {
				id: this.id,
				status: Status.OK,
				errors: [],
			};
		}

		return {
			id: this.id,
			status: Status.FAIL,
			errors: [
				new TransactionError(
					'Failed to add signature.',
					this.id,
					'.signatures',
				),
			],
		};
	}

	public processMultisignatures(sender: Account): TransactionResponse {
		const transactionBytes = this.signSignature
			? Buffer.concat([this.getBasicBytes(), hexToBuffer(this.signature)])
			: this.getBasicBytes();

		if (!sender.multimin) {
			return {
				id: this.id,
				status: Status.FAIL,
				errors: [
					new TransactionError('Sender does not have valid multimin', this.id),
				],
			};
		}

		const { verified, errors } = verifyMultisignatures(
			sender.multisignatures,
			this.signatures,
			sender.multimin,
			transactionBytes,
			this.id,
		);

		if (verified) {
			this._multisignatureStatus = MultisignatureStatus.READY;
		}

		return {
			id: this.id,
			status:
				Array.isArray(errors) &&
				errors.length > 0 &&
				errors[0] instanceof TransactionPendingError
					? Status.PENDING
					: verified
						? Status.OK
						: Status.FAIL,
			errors: (errors as ReadonlyArray<TransactionError>) || [],
		};
	}

	public isExpired(date: Date = new Date()): boolean {
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

	protected getBasicBytes(): Buffer {
		const transactionType = Buffer.alloc(BYTESIZES.TYPE, this.type);
		const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
		transactionTimestamp.writeIntLE(this.timestamp, 0, BYTESIZES.TIMESTAMP);

		const transactionSenderPublicKey = hexToBuffer(this.senderPublicKey);

		const transactionRecipientID = this.recipientId
			? bigNumberToBuffer(this.recipientId.slice(0, -1), BYTESIZES.RECIPIENT_ID)
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
			this.getAssetBytes(),
		]);
	}

	public validateSchema(): ReadonlyArray<TransactionError> {
		const transaction = this.toJSON();
		const baseTransactionValidator = validator.compile(schemas.baseTransaction);
		const errors = baseTransactionValidator.errors
			? baseTransactionValidator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							transaction.id,
							error.dataPath,
						),
			  )
			: [];

		if (!errors.find(err => err.dataPath === '.senderPublicKey')) {
			// `senderPublicKey` passed format check, safely check equality to senderId
			if (
				this.senderId.toUpperCase() !==
				getAddressFromPublicKey(this.senderPublicKey).toUpperCase()
			) {
				errors.push(
					new TransactionError(
						'`senderId` does not match `senderPublicKey`',
						this.id,
						'.senderId',
					),
				);
			}
		}
		if (this.id !== getId(this.getBytes())) {
			errors.push(
				new TransactionError('Invalid transaction id', this.id, '.id'),
			);
		}

		return errors;
	}
}
