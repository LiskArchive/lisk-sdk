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
import { codec } from '@liskhq/lisk-codec';
import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	hexToBuffer,
	intToBuffer,
	signData,
} from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';

import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	MIN_FEE_PER_BYTE,
} from './constants';
import { convertToTransactionError, TransactionError } from './errors';
import { createResponse, TransactionResponse } from './response';
import { baseTransactionSchema } from './schema';
import { Account, BlockHeader, TransactionMessage } from './types';
import {
	buildPublicKeyPassphraseDict,
	isMultisignatureAccount,
	sortKeysAscending,
	validateSenderIdAndPublicKey,
	validateSignature,
	verifyAccountNonce,
	verifyMinRemainingBalance,
	verifyMultiSignatureTransaction,
	verifySenderPublicKey,
} from './utils';

// Disabling method-signature-style otherwise type is not compatible with lisk-chain
/* eslint-disable @typescript-eslint/method-signature-style */
export interface AccountState {
	get(key: string): Promise<Account>;
	getOrDefault(key: string): Promise<Account>;
	find(func: (item: Account) => boolean): Account | undefined;
	set(key: string, value: Account): void;
}
/* eslint-enable @typescript-eslint/method-signature-style */

export interface ChainState {
	readonly lastBlockHeader: BlockHeader;
	readonly lastBlockReward: bigint;
	readonly networkIdentifier: string;
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

	public readonly transaction: TransactionMessage;
	public readonly id: Buffer;
	public readonly type: number;
	public readonly asset: object;
	public nonce: bigint;
	public fee: bigint;
	public senderPublicKey: Buffer;
	public signatures: Buffer[];

	protected _minFee?: bigint;

	public constructor(transaction: TransactionMessage) {
		this.transaction = transaction;
		this.id = transaction.id;
		this.type = transaction.type;
		this.asset = transaction.asset;
		this.nonce = transaction.nonce;
		this.fee = transaction.fee;
		this.senderPublicKey = transaction.senderPublicKey;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.signatures = (transaction.signatures as Buffer[]) || [];
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

	public getBytes(): Buffer {
		const transactionBytes = Buffer.concat([
			this.getBasicBytes(),
			this.signatures,
		]);

		return transactionBytes;
	}

	public validate(): TransactionResponse {
		const errors = [...this._validateSchema(), ...this.validateAsset()];
		if (errors.length > 0) {
			return createResponse(this.id, errors);
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
		sender.publicKey = sender.publicKey ?? this.senderPublicKey;

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
		const transactionBytes = this.getBasicBytes();
		if (networkIdentifier === undefined || networkIdentifier === '') {
			throw new Error(
				'Network identifier is required to validate a transaction ',
			);
		}
		const networkIdentifierBytes = hexToBuffer(networkIdentifier);
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

	public sign(
		networkIdentifier: string,
		senderPassphrase?: string,
		passphrases?: ReadonlyArray<string>,
		keys?: {
			readonly mandatoryKeys: Array<Readonly<string>>;
			readonly optionalKeys: Array<Readonly<string>>;
		},
	): void {
		if (!networkIdentifier) {
			throw new Error('Network identifier is required to sign a transaction');
		}

		const networkIdentifierBytes = hexToBuffer(networkIdentifier);

		// If senderPassphrase is passed in assume only one signature required
		if (senderPassphrase) {
			const { publicKey } = getAddressAndPublicKeyFromPassphrase(
				senderPassphrase,
			);

			if (this.senderPublicKey !== '' && this.senderPublicKey !== publicKey) {
				throw new Error(
					'Transaction senderPublicKey does not match public key from passphrase',
				);
			}

			this.senderPublicKey = publicKey;

			const transactionWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifierBytes,
				this.getBasicBytes(),
			]);

			const signature = signData(
				transactionWithNetworkIdentifierBytes,
				senderPassphrase,
			);
			// Reset signatures when only one passphrase is provided
			this.signatures = [];
			this.signatures.push(signature);
			return;
		}

		if (passphrases && keys) {
			if (!this.senderPublicKey) {
				throw new Error(
					'Transaction senderPublicKey needs to be set before signing',
				);
			}

			const transactionWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifierBytes,
				this.getBasicBytes(),
			]);

			const keysAndPassphrases = buildPublicKeyPassphraseDict(passphrases);
			sortKeysAscending(keys.mandatoryKeys);
			sortKeysAscending(keys.optionalKeys);
			// Sign with all keys
			for (const aKey of [...keys.mandatoryKeys, ...keys.optionalKeys]) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (keysAndPassphrases[aKey]) {
					const { passphrase } = keysAndPassphrases[aKey];
					this.signatures.push(
						signData(transactionWithNetworkIdentifierBytes, passphrase),
					);
				} else {
					// Push an empty signature if a passphrase is missing
					this.signatures.push(Buffer.from(''));
				}
			}
		}
	}

	public getBasicBytes(): Buffer {
		const assetBytes = codec.encode({}, this.asset);
		const transactionBytes = codec.encode(BaseTransaction.BASE_SCHEMA, {
			...this.transaction,
			asset: assetBytes,
			signatures: this.signatures,
		});

		return transactionBytes;
	}

	private _validateSchema(): ReadonlyArray<TransactionError> {
		const schemaErrors = validator.validate(BaseTransaction.BASE_SCHEMA, this.transaction);
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

	protected abstract validateAsset(): ReadonlyArray<TransactionError>;
	protected abstract applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>>;
	protected abstract undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>>;
}
