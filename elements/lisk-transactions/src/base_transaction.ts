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
import { codec, MinimalSchema } from '@liskhq/lisk-codec';
import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	signData,
	bufferToHex,
	hash,
} from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';

import { MAX_TRANSACTION_AMOUNT, MIN_FEE_PER_BYTE } from './constants';
import { convertToTransactionError, TransactionError } from './errors';
import { createResponse, TransactionResponse } from './response';
import { baseTransactionSchema } from './schema';
import { Account, BlockHeader, BaseTransactionInput } from './types';
import {
	buildPublicKeyPassphraseDict,
	isMultisignatureAccount,
	sortKeysAscending,
	validateSignature,
	verifyAccountNonce,
	verifyMinRemainingBalance,
	verifyMultiSignatureTransaction,
	verifySenderPublicKey,
} from './utils';

// Disabling method-signature-style otherwise type is not compatible with lisk-chain
/* eslint-disable @typescript-eslint/method-signature-style */
export interface AccountState {
	get<T>(key: Buffer): Promise<Account<T>>;
	getOrDefault<T>(key: Buffer): Promise<Account<T>>;
	set<T>(key: Buffer, value: Account<T>): void;
}
/* eslint-enable @typescript-eslint/method-signature-style */

export interface ChainState {
	readonly lastBlockHeader: BlockHeader;
	readonly lastBlockReward: bigint;
	readonly networkIdentifier: Buffer;
	get(key: string): Promise<Buffer | undefined>;
	set(key: string, value: Buffer): void;
}

export interface StateStore {
	readonly account: AccountState;
	readonly chain: ChainState;
}

export const ENTITY_ACCOUNT = 'account';
export const ENTITY_TRANSACTION = 'transaction';

export abstract class BaseTransaction {
	public static TYPE: number;
	// Minimum remaining balance requirement for any account to perform a transaction
	public static MIN_REMAINING_BALANCE = BigInt('5000000'); // 0.05 LSK
	public static MIN_FEE_PER_BYTE = MIN_FEE_PER_BYTE;
	public static NAME_FEE = BigInt(0);
	public static BASE_SCHEMA = baseTransactionSchema;
	public static ASSET_SCHEMA = {};

	public readonly type: number;
	public asset: object;
	public nonce: bigint;
	public fee: bigint;
	public senderPublicKey: Buffer;
	public signatures: Array<Readonly<Buffer>>;

	protected _minFee?: bigint;
	protected _id: Buffer;

	private _idStr?: string;
	private readonly _senderPublicKeyStr: string;
	private readonly _senderIdStr: Buffer;

	public constructor(transaction: BaseTransactionInput) {
		this._id = transaction.id ?? Buffer.alloc(0);
		this.type =
			transaction.type ?? (this.constructor as typeof BaseTransaction).TYPE;
		this.asset = transaction.asset;
		this.nonce = transaction.nonce;
		this.fee = transaction.fee;
		this.senderPublicKey = transaction.senderPublicKey;
		this.signatures = transaction.signatures ?? [];
		this._idStr = bufferToHex(this._id);
		this._senderPublicKeyStr = bufferToHex(this.senderPublicKey);
		this._senderIdStr = getAddressFromPublicKey(this.senderPublicKey);
	}

	/* Begin Getters */
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

	public get id(): Buffer {
		return this._id;
	}

	public get idStr(): string {
		if (!this._idStr) {
			this._idStr = this._id.toString('hex');
		}
		return this._idStr;
	}

	public get senderId(): Buffer {
		return this._senderIdStr;
	}

	public get senderPublicKeyStr(): string {
		return this._senderPublicKeyStr;
	}

	public get senderIdStr(): string {
		return bufferToHex(this.senderId);
	}
	/* End Getters */

	public getBytes(): Buffer {
		const transactionBytes = codec.encode(BaseTransaction.BASE_SCHEMA, {
			...this,
			asset: this._getAssetBytes(),
		});

		return transactionBytes;
	}

	public getSigningBytes(): Buffer {
		const transactionBytes = codec.encode(BaseTransaction.BASE_SCHEMA, {
			...this,
			asset: this._getAssetBytes(),
			signatures: [],
		});

		return transactionBytes;
	}

	public validate(): TransactionResponse {
		const errors = [...this._validateSchema()];
		if (errors.length > 0) {
			return createResponse(this.id, errors);
		}

		const assetErrors = this.validateAsset();
		if (assetErrors.length > 0) {
			errors.push(...assetErrors);
		}

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

	public async apply(store: StateStore): Promise<TransactionResponse> {
		const sender = await store.account.getOrDefault(this.senderId);
		const errors = [];

		// Verify sender against publicKey
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
		if (signaturesErr.length) {
			errors.push(...signaturesErr);
		}

		// Update sender balance
		sender.balance -= this.fee;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		sender.publicKey = sender.publicKey ?? this.senderPublicKey;

		// Increment sender nonce
		sender.nonce += BigInt(1);

		// Update account state
		store.account.set(sender.address, sender);

		// Update account asset based on transaction type
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		sender.publicKey = sender.publicKey ?? this.senderPublicKey;
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

	public async verifySignatures(
		store: StateStore,
	): Promise<TransactionResponse> {
		const sender = await store.account.get(this.senderId);
		const { networkIdentifier } = store.chain;
		const transactionBytes = this.getSigningBytes();
		if (networkIdentifier === undefined || !networkIdentifier.length) {
			throw new Error(
				'Network identifier is required to validate a transaction ',
			);
		}
		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifier,
			transactionBytes,
		]);

		if (!isMultisignatureAccount(sender)) {
			const { error } = validateSignature(
				this.senderPublicKey,
				this.signatures[0] as Buffer,
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

	public sign(
		networkIdentifier: Buffer,
		senderPassphrase?: string,
		passphrases?: ReadonlyArray<string>,
		keys?: {
			readonly mandatoryKeys: Array<Readonly<Buffer>>;
			readonly optionalKeys: Array<Readonly<Buffer>>;
		},
	): void {
		if (!networkIdentifier.length) {
			throw new Error('Network identifier is required to sign a transaction');
		}

		// If senderPassphrase is passed in assume only one signature required
		if (senderPassphrase) {
			const { publicKey } = getAddressAndPublicKeyFromPassphrase(
				senderPassphrase,
			);

			if (!this.senderPublicKey.equals(publicKey)) {
				throw new Error(
					'Transaction senderPublicKey does not match public key from passphrase',
				);
			}

			this.senderPublicKey = publicKey;

			const transactionWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifier,
				this.getSigningBytes(),
			]);

			const signature = signData(
				transactionWithNetworkIdentifierBytes,
				senderPassphrase,
			);
			// Reset signatures when only one passphrase is provided
			this.signatures = [];
			this.signatures.push(signature);
			this._id = hash(this.getBytes());
			return;
		}

		if (passphrases && keys) {
			const transactionWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifier,
				this.getSigningBytes(),
			]);

			const keysAndPassphrases = buildPublicKeyPassphraseDict(passphrases);
			sortKeysAscending(keys.mandatoryKeys);
			sortKeysAscending(keys.optionalKeys);
			// Sign with all keys
			for (const aKey of [...keys.mandatoryKeys, ...keys.optionalKeys]) {
				const publicKeyStr = bufferToHex(aKey as Buffer);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (keysAndPassphrases[publicKeyStr]) {
					const { passphrase } = keysAndPassphrases[publicKeyStr];
					this.signatures.push(
						signData(transactionWithNetworkIdentifierBytes, passphrase),
					);
				} else {
					// Push an empty signature if a passphrase is missing
					this.signatures.push(Buffer.alloc(0));
				}
			}
			this._id = hash(this.getBytes());
		}
	}

	// eslint-disable-next-line class-methods-use-this
	protected validateAsset(): ReadonlyArray<TransactionError> {
		return [];
	}

	private _getAssetBytes(): Buffer {
		const assetSchema = (this.constructor as typeof BaseTransaction)
			.ASSET_SCHEMA;
		return codec.encode(assetSchema as MinimalSchema, this.asset);
	}

	private _validateSchema(): ReadonlyArray<TransactionError> {
		const valueWithoutAsset = {
			...this,
			asset: Buffer.alloc(0),
		};
		const schemaErrors = validator.validate(
			BaseTransaction.BASE_SCHEMA,
			valueWithoutAsset,
		);
		const errors = convertToTransactionError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		const assetSchemaErrors = validator.validate(
			(this.constructor as typeof BaseTransaction).ASSET_SCHEMA,
			this.asset,
		);
		const assetErrors = convertToTransactionError(
			this.id,
			assetSchemaErrors,
		) as TransactionError[];

		return [...errors, ...assetErrors];
	}

	protected abstract applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>>;
	protected abstract undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>>;
}
