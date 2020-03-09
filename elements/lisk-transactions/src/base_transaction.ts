/*
 * Copyright © 2019 Lisk Foundation
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
import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	hash,
	hexToBuffer,
	intToBuffer,
	signData,
} from '@liskhq/lisk-cryptography';
import { isValidFee, isValidNonce, validator } from '@liskhq/lisk-validator';

import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	MIN_FEE_PER_BYTE,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} from './constants';
import { convertToTransactionError, TransactionError } from './errors';
import { createResponse, Status } from './response';
import * as schemas from './schema';
import { Account, TransactionJSON } from './transaction_types';
import {
	buildPublicKeyPassphraseDict,
	getId,
	isMultisignatureAccount,
	serializeSignatures,
	validateSenderIdAndPublicKey,
	validateSignature,
	verifyAccountNonce,
	verifyMinRemainingBalance,
	verifyMultiSignatureTransaction,
	verifySenderPublicKey,
} from './utils';

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
}

export interface StateStoreGetter<T> {
	get(key: string): Promise<T>;
	find(func: (item: T) => boolean): T | undefined;
}

export interface StateStoreDefaultGetter<T> {
	getOrDefault(key: string): Promise<T>;
}

export interface StateStoreSetter<T> {
	set(key: string, value: T): void;
}

export interface StateStoreTransactionGetter<T> {
	get(key: string): T;
	find(func: (item: T) => boolean): T | undefined;
}

export interface StateStore {
	readonly account: StateStoreGetter<Account> &
		StateStoreDefaultGetter<Account> &
		StateStoreSetter<Account>;
	readonly transaction: StateStoreTransactionGetter<TransactionJSON>;
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

export const ENTITY_ACCOUNT = 'account';
export const ENTITY_TRANSACTION = 'transaction';

export abstract class BaseTransaction {
	public readonly blockId?: string;
	public readonly height?: number;
	public readonly confirmations?: number;
	public readonly type: number;
	public readonly containsUniqueData?: boolean;
	public readonly asset: object;
	public nonce: bigint;
	public fee: bigint;
	public receivedAt?: Date;
	public senderPublicKey: string;
	public signatures: string[];

	public static TYPE: number;
	// Minimum remaining balance requirement for any account to perform a transaction
	public static MIN_REMAINING_BALANCE = BigInt('500000'); // 0.5 LSK
	public static MIN_FEE_PER_BYTE = MIN_FEE_PER_BYTE;
	public static NAME_FEE = BigInt(0);

	protected _id?: string;
	protected _networkIdentifier: string;
	protected _minFee?: bigint;

	protected abstract validateAsset(): ReadonlyArray<TransactionError>;
	protected abstract applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>>;
	protected abstract undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>>;

	public constructor(rawTransaction: unknown) {
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.senderPublicKey = tx.senderPublicKey || '';
		this.signatures = (tx.signatures as string[]) || [];
		this.nonce =
			tx.nonce && isValidNonce(tx.nonce) ? BigInt(tx.nonce) : BigInt(0);
		this.fee = tx.fee && isValidFee(tx.fee) ? BigInt(tx.fee) : BigInt(0);
		this.type =
			typeof tx.type === 'number'
				? tx.type
				: (this.constructor as typeof BaseTransaction).TYPE;

		this._id = tx.id;

		this._networkIdentifier = tx.networkIdentifier || '';

		// Additional data not related to the protocol
		this.confirmations = tx.confirmations;
		this.blockId = tx.blockId;
		this.height = tx.height;
		this.receivedAt = tx.receivedAt ? new Date(tx.receivedAt) : undefined;
		this.asset = tx.asset || {};
	}

	public get id(): string {
		return this._id || 'incalculable-id';
	}

	public get minFee(): bigint {
		if (!this._minFee) {
			// Include nameFee in minFee for delegate registration transactions
			this._minFee =
				(this.constructor as typeof BaseTransaction).NAME_FEE +
				BigInt((this.constructor as typeof BaseTransaction).MIN_FEE_PER_BYTE) *
					BigInt(this.getBytes().length);
		}

		return this._minFee;
	}

	public get senderId(): string {
		return getAddressFromPublicKey(this.senderPublicKey);
	}

	/**
	 * This method is using private versions of _id, _senderPublicKey and _signature
	 * as we should allow for it to be called at any stage of the transaction construction
	 */

	public toJSON(): TransactionJSON {
		const transaction = {
			id: this._id,
			blockId: this.blockId,
			height: this.height,
			confirmations: this.confirmations,
			type: this.type,
			senderPublicKey: this.senderPublicKey,
			senderId: this.senderPublicKey ? this.senderId : '',
			nonce: this.nonce.toString(),
			fee: this.fee.toString(),
			signatures: this.signatures,
			asset: this.assetToJSON(),
			receivedAt: this.receivedAt ? this.receivedAt.toISOString() : undefined,
		};

		return transaction;
	}

	public stringify(): string {
		return JSON.stringify(this.toJSON());
	}

	public getBytes(): Buffer {
		const transactionBytes = Buffer.concat([
			this.getBasicBytes(),
			serializeSignatures(this.signatures),
		]);

		return transactionBytes;
	}

	public validate(): TransactionResponse {
		const errors = [...this._validateSchema(), ...this.validateAsset()];
		if (errors.length > 0) {
			return createResponse(this.id, errors);
		}

		this._id = getId(this.getBytes());

		if (this.type !== (this.constructor as typeof BaseTransaction).TYPE) {
			errors.push(
				new TransactionError(
					`Invalid transaction type`,
					this.id,
					'.type',
					this.type,
					(this.constructor as typeof BaseTransaction).TYPE,
				),
			);
		}

		if (this.fee < this.minFee) {
			errors.push(
				new TransactionError(
					`Insufficient transaction fee. Minimum required fee is: ${this.minFee.toString()}`,
					this.id,
					'.fee',
					this.fee.toString(),
				),
			);
		}

		return createResponse(this.id, errors);
	}

	// tslint:disable-next-line prefer-function-over-method
	protected verifyAgainstTransactions(
		_: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		return [];
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const errors = this.verifyAgainstTransactions(transactions);

		return createResponse(this.id, errors);
	}

	public async apply(store: StateStore): Promise<TransactionResponse> {
		const sender = await store.account.getOrDefault(this.senderId);
		const errors = [];
		const senderPublicKeyError = verifySenderPublicKey(
			this.id,
			sender,
			this.senderPublicKey,
		);
		if (senderPublicKeyError) {
			errors.push(senderPublicKeyError);
		}

		// Verify Account Nonce
		const accountNonceError = verifyAccountNonce(this.id, sender, this.nonce);
		if (accountNonceError) {
			errors.push(accountNonceError);
		}

		// Verify Signatures
		const { errors: signaturesErr } = await this.verifySignatures(store);
		if (signaturesErr) {
			errors.push(...signaturesErr);
		}

		// Update sender balance
		sender.balance -= this.fee;
		sender.publicKey = sender.publicKey || this.senderPublicKey;

		// Increment sender nonce
		sender.nonce += BigInt(1);

		// Update account state
		store.account.set(sender.address, sender);

		const assetErrors = await this.applyAsset(store);
		errors.push(...assetErrors);

		// Get updated state for sender account, which may be modified in last step
		const updatedSender = await store.account.get(this.senderId);

		// Validate minimum remaining balance
		const minRemainingBalanceError = verifyMinRemainingBalance(
			this.id,
			updatedSender,
			(this.constructor as typeof BaseTransaction).MIN_REMAINING_BALANCE,
		);
		if (minRemainingBalanceError) {
			errors.push(minRemainingBalanceError);
		}

		return createResponse(this.id, errors);
	}

	public async undo(store: StateStore): Promise<TransactionResponse> {
		const sender = await store.account.getOrDefault(this.senderId);
		const updatedBalance = sender.balance + this.fee;
		sender.balance = updatedBalance;
		sender.publicKey = sender.publicKey || this.senderPublicKey;
		const errors =
			updatedBalance <= BigInt(MAX_TRANSACTION_AMOUNT)
				? []
				: [
						new TransactionError(
							'Invalid balance amount',
							this.id,
							'.balance',
							sender.balance.toString(),
							updatedBalance.toString(),
						),
				  ];

		// Decrement account nonce
		sender.nonce -= BigInt(1);

		store.account.set(sender.address, sender);

		const assetErrors = await this.undoAsset(store);
		errors.push(...assetErrors);

		return createResponse(this.id, errors);
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
		]);
	}

	public async verifySignatures(
		store: StateStore,
	): Promise<TransactionResponse> {
		const sender = await store.account.get(this.senderId);
		const transactionBytes = this.getBasicBytes();
		if (
			this._networkIdentifier === undefined ||
			this._networkIdentifier === ''
		) {
			throw new Error(
				'Network identifier is required to validate a transaction ',
			);
		}
		const networkIdentifierBytes = hexToBuffer(this._networkIdentifier);
		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifierBytes,
			transactionBytes,
		]);

		if (!isMultisignatureAccount(sender)) {
			const { error } = validateSignature(
				this.senderPublicKey,
				this.signatures[0],
				transactionWithNetworkIdentifierBytes,
				this.id,
			);

			if (error) {
				return createResponse(this.id, [error]);
			}

			return createResponse(this.id, []);
		}

		const errors = verifyMultiSignatureTransaction(
			this.id,
			sender,
			this.signatures,
			transactionWithNetworkIdentifierBytes,
		);

		return createResponse(this.id, errors);
	}

	public isExpired(date: Date = new Date()): boolean {
		if (!this.receivedAt) {
			this.receivedAt = new Date();
		}
		// tslint:disable-next-line no-magic-numbers
		const timeNow = Math.floor(date.getTime() / 1000);
		const timeElapsed =
			// tslint:disable-next-line no-magic-numbers
			timeNow - Math.floor(this.receivedAt.getTime() / 1000);

		return timeElapsed > UNCONFIRMED_TRANSACTION_TIMEOUT;
	}

	public sign(passphrase: string): void {
		const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

		if (this.senderPublicKey !== '' && this.senderPublicKey !== publicKey) {
			throw new Error(
				'Transaction senderPublicKey does not match public key from passphrase',
			);
		}

		this.senderPublicKey = publicKey;
		this.signatures = [];

		if (
			this._networkIdentifier === undefined ||
			this._networkIdentifier === ''
		) {
			throw new Error('Network identifier is required to sign a transaction ');
		}

		const networkIdentifierBytes = hexToBuffer(this._networkIdentifier);
		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifierBytes,
			this.getBasicBytes(),
		]);

		this.signatures.push(
			signData(hash(transactionWithNetworkIdentifierBytes), passphrase),
		);

		this._id = getId(this.getBytes());
	}

	public signAll(
		networkIdentifier: string,
		senderPassphrase?: string,
		passphrases?: ReadonlyArray<string>,
		keys?: {
			readonly mandatoryKeys: ReadonlyArray<string>;
			readonly optionalKeys: ReadonlyArray<string>;
			readonly numberOfSignatures: number;
		},
	): void {
		// Set network identifier if it was previously not set in the transaction
		if (!this._networkIdentifier) {
			this._networkIdentifier = networkIdentifier;
		}

		const networkIdentifierBytes = hexToBuffer(this._networkIdentifier);
		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifierBytes,
			this.getBasicBytes(),
		]);

		if (passphrases && keys) {
			const allPassphrases = [...passphrases];
			// For regular transactions all passphrases are the same
			if (senderPassphrase) {
				allPassphrases.push(senderPassphrase);
			}
			const keysAndPassphrases = buildPublicKeyPassphraseDict(allPassphrases);

			// Sign with all keys
			for (const aKey of [...keys.mandatoryKeys, ...keys.optionalKeys]) {
				if (keysAndPassphrases[aKey]) {
					const { passphrase } = keysAndPassphrases[aKey];
					this.signatures.push(
						signData(hash(transactionWithNetworkIdentifierBytes), passphrase),
					);
				} else {
					// Push an empty signature if a passphrase is missing
					this.signatures.push('');
				}
			}
		}
		this._id = getId(this.getBytes());
	}

	public getBasicBytes(): Buffer {
		const transactionType = Buffer.alloc(BYTESIZES.TYPE, this.type);
		const transactionNonce = intToBuffer(
			this.nonce.toString(),
			BYTESIZES.NONCE,
		);
		const transactionSenderPublicKey = hexToBuffer(this.senderPublicKey);
		const transactionFee = intToBuffer(this.fee.toString(), BYTESIZES.FEE);

		return Buffer.concat([
			transactionType,
			transactionNonce,
			transactionSenderPublicKey,
			transactionFee,
			this.assetToBytes(),
		]);
	}

	public assetToJSON(): object {
		return this.asset;
	}

	protected assetToBytes(): Buffer {
		/**
		 * FixMe: The following method is not sufficient enough for more sophisticated cases,
		 * i.e. properties in the asset object need to be sent always in the same right order to produce a deterministic signature.
		 *
		 * We are currently conducting a research to specify an optimal generic way of changing asset to bytes.
		 * You can expect this enhanced implementation to be included in the next releases.
		 */

		return Buffer.from(JSON.stringify(this.asset), 'utf-8');
	}

	private _validateSchema(): ReadonlyArray<TransactionError> {
		const transaction = this.toJSON();
		const schemaErrors = validator.validate(
			schemas.baseTransaction,
			transaction,
		);
		const errors = convertToTransactionError(
			this.id,
			schemaErrors,
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
