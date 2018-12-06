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
/// <reference path="../../../types/browserify-bignum/index.d.ts" />

import * as cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { MultiError } from 'verror';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from './constants';
import { TransactionError } from './errors';
import {
	Account,
	Status,
	TransactionAsset,
	TransactionJSON,
} from './transaction_types';
import { checkBalance, getTransactionBytes, validator } from './utils';
import * as schemas from './utils/validation/schema';

const checkTransactionTypes = (
	tx: TransactionJSON,
): ReadonlyArray<Error> | undefined => {
	const typeValidator = validator.compile(schemas.transaction);
	typeValidator(tx);
	const transactionErrors = typeValidator.errors
		? typeValidator.errors.map(
				error =>
					new TransactionError(
						`'${error.dataPath}' ${error.message}`,
						undefined,
						error.dataPath,
					),
		  )
		: undefined;

	return transactionErrors;
};

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
	readonly state?: Account;
}

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly fee: BigNum;
	public readonly id: string;
	public readonly recipientId: string;
	public readonly recipientPublicKey: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signature?: string;
	public readonly signatures?: ReadonlyArray<string> = [];
	public readonly signSignature?: string;
	public readonly timestamp: number;
	public readonly type: number;
	public readonly asset: TransactionAsset = {};
	public readonly receivedAt?: number;
	public readonly isMultiSignature?: boolean;

	public constructor(rawTransaction: TransactionJSON) {
		const result = checkTransactionTypes(rawTransaction);
		if (result) {
			// tslint:disable-next-line readonly-array
			throw new MultiError(result as Error[]);
		}

		this.amount = new BigNum(rawTransaction.amount);
		this.asset = rawTransaction.asset;
		this.fee = new BigNum(rawTransaction.fee);
		this.id = rawTransaction.id;
		this.recipientId = rawTransaction.recipientId;
		this.recipientPublicKey = rawTransaction.recipientPublicKey;
		this.senderId = rawTransaction.senderId;
		this.senderPublicKey = rawTransaction.senderPublicKey;
		this.signature = rawTransaction.signature;
		this.signatures = rawTransaction.signatures;
		this.signSignature = rawTransaction.signSignature;
		this.timestamp = rawTransaction.timestamp;
		this.type = rawTransaction.type;
	}

	// TODO: Deserialization of asset
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
			signatures: this.signatures,
			asset: this.asset,
		};

		if (!this.signature) {
			return transaction;
		}

		const singleSignedTransaction = {
			...transaction,
			signature: this.signature,
		};

		if (!this.signSignature) {
			return singleSignedTransaction;
		}

		const signedTransaction = {
			...singleSignedTransaction,
			signSignature: this.signSignature,
		};

		return signedTransaction;
	}

	protected getBasicBytes(): Buffer {
		const transactionType = Buffer.alloc(BYTESIZES.TYPE, this.type);
		const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
		transactionTimestamp.writeIntLE(this.timestamp, 0, BYTESIZES.TIMESTAMP);

		const transactionSenderPublicKey = cryptography.hexToBuffer(
			this.senderPublicKey,
		);

		const transactionRecipientID = this.recipientId
			? cryptography.bigNumberToBuffer(
					this.recipientId.slice(0, -1),
					BYTESIZES.RECIPIENT_ID,
			  )
			: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

		if (this.amount.lt(0)) {
			throw new Error('Transaction amount must not be negative.');
		}
		// BUG in browserify-bignum prevents us using `.gt` directly.
		// See https://github.com/bored-engineer/browserify-bignum/pull/2
		if (this.amount.gte(new BigNum(MAX_TRANSACTION_AMOUNT).add(1))) {
			throw new Error('Transaction amount is too large.');
		}

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
		]);
	}

	public abstract getBytes(): Buffer;

	public abstract containsUniqueData(): boolean;

	public checkSchema(): TransactionResponse {
		const transaction = this.toJSON();
		const baseTransactionValidator = validator.compile(schemas.baseTransaction);
		const valid = baseTransactionValidator(transaction) as boolean;

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

		return {
			id: this.id,
			status: valid ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public validate(): TransactionResponse {
		const transaction = this.toJSON();
		const transactionHash = cryptography.hash(this.getBasicBytes());

		const validateErrors = Object.entries(transaction).reduce(
			(
				errorArray: ReadonlyArray<TransactionError>,
				property: ReadonlyArray<string & ReadonlyArray<string>>,
			): ReadonlyArray<TransactionError> => {
				const [key, value] = property;
				if (key === 'id') {
					const transactionBytesWithSignatures = getTransactionBytes(
						this.toJSON(),
					);
					const transactionHashWithSignatures = cryptography.hash(
						transactionBytesWithSignatures,
					);
					const bufferFromFirstEntriesReversed = cryptography.getFirstEightBytesReversed(
						transactionHashWithSignatures,
					);
					const transactionId = cryptography.bufferToBigNumberString(
						bufferFromFirstEntriesReversed,
					);
					if (value !== transactionId) {
						return [
							...errorArray,
							new TransactionError('Invalid transaction id', this.id, '.id'),
						];
					}
				}
				if (key === 'senderId') {
					if (
						value.toUpperCase() !==
						cryptography
							.getAddressFromPublicKey(this.senderPublicKey)
							.toUpperCase()
					) {
						return [
							...errorArray,
							new TransactionError(
								'`senderId` does not match `senderPublicKey`',
								this.id,
								'.senderId',
							),
						];
					}
				}
				if (key === 'signature') {
					const signatureVerified = cryptography.verifyData(
						transactionHash,
						value,
						this.senderPublicKey,
					);

					if (!signatureVerified) {
						return [
							...errorArray,
							new TransactionError(
								'Failed to verify signature',
								this.id,
								'.signature',
							),
						];
					}
				}
				if (key === 'signatures' && Array.isArray(value) && value.length > 0) {
					// Check that signatures are unique
					const uniqueSignatures: ReadonlyArray<string> = [...new Set(value)];
					if (uniqueSignatures.length !== value.length) {
						return [
							...errorArray,
							new TransactionError(
								'Encountered duplicate signature in transaction',
								this.id,
								'.signatures',
							),
						];
					}
				}

				return errorArray;
			},
			[],
		);

		return {
			id: this.id,
			status: validateErrors.length === 0 ? Status.OK : Status.FAIL,
			errors: validateErrors,
		};
	}

	public getRequiredAttributes(): object {
		return {
			ACCOUNTS: [cryptography.getAddressFromPublicKey(this.senderPublicKey)],
		};
	}

	public verify(sender: Account): TransactionResponse {
		// Balance verification
		const { errors: balanceError } = checkBalance(sender, this.fee);

		// Check transaction fields against account
		const transactionErrors = Object.entries(sender).reduce(
			(
				errorArray: ReadonlyArray<TransactionError>,
				property: ReadonlyArray<string>,
			): ReadonlyArray<TransactionError> => {
				const [key, value] = property;

				// Check sender publicKey
				if (key === 'publicKey' && value !== this.senderPublicKey) {
					return [
						...errorArray,
						new TransactionError(
							'Invalid sender publicKey',
							this.id,
							'.senderPublicKey',
						),
					];
				}

				// Check for missing signSignature on transaction
				if (key === 'secondPublicKey' && value && !this.signSignature) {
					return [
						...errorArray,
						new TransactionError(
							'Missing signSignature',
							this.id,
							'.signSignature',
						),
					];
				}

				// Check for missing multisignatures on transaction
				if (
					key === 'multisignatures' &&
					Array.isArray(value) &&
					value.length > 0 &&
					(!this.signatures ||
						(this.signatures && this.signatures.length === 0))
				) {
					return [
						...errorArray,
						new TransactionError('Missing signatures', this.id, '.signatures'),
					];
				}

				// Check sender address
				if (
					key === 'address' &&
					value.toUpperCase() !== this.senderId.toUpperCase()
				) {
					return [
						...errorArray,
						new TransactionError(
							'Invalid sender address',
							this.id,
							'.senderId',
						),
					];
				}

				return errorArray;
			},
			[],
		);

		// Check missing secondPublicKey on account
		const missingSecondPublicKeyError =
			this.signSignature && !sender.secondPublicKey
				? [
						new TransactionError(
							'Sender does not have a secondPublicKey',
							this.id,
						),
				  ]
				: [];

		// Signature verifications

		const transactionHash = cryptography.hash(this.getBasicBytes());

		// Verify signSignature
		const signSignatureError =
			sender.secondPublicKey &&
			!cryptography.verifyData(
				transactionHash,
				this.signSignature as string,
				sender.secondPublicKey,
			)
				? [
						new TransactionError(
							'Failed to verify second signature',
							this.id,
							'.signSignature',
						),
				  ]
				: [];

		// Verify multisignatures
		const transactionSignatures = this.signatures as ReadonlyArray<string>;
		const multisignatureKeys = sender.multisignatures || [];
		// tslint:disable-next-line no-let
		let checkedKeys: ReadonlyArray<string> = [];

		const multisignatureErrors =
			Array.isArray(sender.multisignatures) && sender.multisignatures.length > 0
				? transactionSignatures.reduce(
						(
							errorArray: ReadonlyArray<TransactionError>,
							signature: string,
						): ReadonlyArray<TransactionError> => {
							multisignatureKeys.forEach((publicKey, index, signatureArray) => {
								if (checkedKeys.includes(publicKey)) {
									return errorArray;
								}

								if (
									cryptography.verifyData(transactionHash, signature, publicKey)
								) {
									checkedKeys = [...checkedKeys, publicKey];

									return errorArray;
								}

								const multisignatureVerificationErrors =
									index === signatureArray.length - 1
										? [
												...errorArray,
												new TransactionError(
													`Failed to verify multisignature: ${signature}`,
													this.id,
													'.signatures',
												),
										  ]
										: errorArray;

								return multisignatureVerificationErrors;
							});

							return errorArray;
						},
						[],
				  )
				: [];

		const verifyErrors: ReadonlyArray<TransactionError> = [
			...balanceError,
			...transactionErrors,
			...missingSecondPublicKeyError,
			...signSignatureError,
			...multisignatureErrors,
		];

		return {
			id: this.id,
			status: verifyErrors.length === 0 ? Status.OK : Status.FAIL,
			errors: verifyErrors,
		};
	}

	public abstract verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse;

	public apply(sender: Account): TransactionResponse {
		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			id: this.id,
			status: Status.OK,
			state: updatedAccount,
			errors: [],
		};
	}

	public undo(sender: Account): TransactionResponse {
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			id: this.id,
			status: Status.OK,
			state: updatedAccount,
			errors: [],
		};
	}
}
