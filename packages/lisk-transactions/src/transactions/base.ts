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

import * as cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	Status,
	TransactionAsset,
	TransactionJSON,
} from '../transaction_types';
import {
	checkTypes,
	getId,
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
	readonly [attribute: string]: string[];
}

export enum MultisignatureStatus {
	TRUE = 1,
	FALSE,
	UNKNOWN,
}

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly fee: BigNum;
	public readonly id: string;
	public readonly recipientId: string;
	public readonly recipientPublicKey: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signature: string = '';
	public readonly signatures: ReadonlyArray<string> = [];
	public readonly signSignature?: string;
	public readonly timestamp: number;
	public readonly type: number;
	public readonly asset: TransactionAsset = {};
	public readonly receivedAt: Date = new Date();
	public isMultisignature?: MultisignatureStatus = MultisignatureStatus.UNKNOWN;

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
		this.asset = rawTransaction.asset;
		this.fee = new BigNum(rawTransaction.fee);
		this.id = rawTransaction.id;
		this.recipientId = rawTransaction.recipientId;
		this.recipientPublicKey = rawTransaction.recipientPublicKey;
		this.senderId = rawTransaction.senderId;
		this.senderPublicKey = rawTransaction.senderPublicKey;
		this.signature = rawTransaction.signature as string;
		this.signatures = rawTransaction.signatures;
		this.signSignature = rawTransaction.signSignature;
		this.timestamp = rawTransaction.timestamp;
		this.type = rawTransaction.type;
		this.receivedAt = rawTransaction.receivedAt;
	}

	public abstract assetToJSON(): TransactionAsset;

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

	protected abstract getAssetBytes(): Buffer;

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

		const transactionAmount = this.amount.toBuffer({
			endian: 'little',
			size: BYTESIZES.AMOUNT,
		});

		const transactionAsset =
			this.asset && Object.keys(this.asset).length
				? this.getAssetBytes()
				: Buffer.alloc(0);

		return Buffer.concat([
			transactionType,
			transactionTimestamp,
			transactionSenderPublicKey,
			transactionRecipientID,
			transactionAmount,
			transactionAsset,
		]);
	}

	public getBytes(): Buffer {
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

		if (!errors.find(err => err.dataPath === '.senderPublicKey')) {
			// `senderPublicKey` passed format check, safely check equality to senderId
			if (
				this.senderId.toUpperCase() !==
				cryptography.getAddressFromPublicKey(this.senderPublicKey).toUpperCase()
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

		return {
			id: this.id,
			status: !valid || errors.length > 0 ? Status.FAIL : Status.OK,
			errors,
		};
	}

	public validate(): TransactionResponse {
		const errors: TransactionError[] = [];
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

	public getRequiredAttributes(): Attributes {
		return {
			ACCOUNTS: [cryptography.getAddressFromPublicKey(this.senderPublicKey)],
		};
	}

	public verify(sender: Account): TransactionResponse {
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
					cryptography.hexToBuffer(this.signature),
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
			Array.isArray(sender.multisignatures) &&
			sender.multisignatures.length > 0 &&
			sender.multimin
		) {
			this.isMultisignature = MultisignatureStatus.TRUE;
			const transactionBytes = this.signSignature
				? Buffer.concat([
						this.getBasicBytes(),
						Buffer.from(this.signature, 'hex'),
				  ])
				: this.getBasicBytes();

			const {
				verified: multisignaturesVerified,
				errors: multisignatureErrors,
			} = verifyMultisignatures(
				sender.multisignatures,
				this.signatures,
				sender.multimin,
				transactionBytes,
				this.id,
			);

			if (
				!multisignaturesVerified &&
				multisignatureErrors &&
				multisignatureErrors.length > 0
			) {
				multisignatureErrors.forEach(error => {
					errors.push(error);
				});
			}
		} else {
			this.isMultisignature = MultisignatureStatus.FALSE;
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public abstract verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse;

	public apply(sender: Account): TransactionResponse {
		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };
		const errors = updatedBalance.gte(0)
			? []
			: [
					new TransactionError(
						`Account does not have enough LSK: ${sender.address}, balance: ${
							sender.balance
						}`,
						this.id,
					),
			  ];
		
		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state: errors.length > 0 ? { sender } : { sender: updatedAccount },
			errors,
		};
	}

	public undo(sender: Account): TransactionResponse {
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };
		const errors = updatedBalance.lte(MAX_TRANSACTION_AMOUNT)
			? []
			: [
					new TransactionError(
						'Invalid balance amount',
						this.id,
					),
			  ];

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state: errors.length > 0 ? { sender } : { sender: updatedAccount },
			errors,
		};
	}

	public isExpired(date: Date = new Date()): boolean {
		// tslint:disable-next-line no-magic-numbers
		const timeNow = Math.floor(date.getTime() / 1000);
		const timeOut =
			this.isMultisignature === MultisignatureStatus.TRUE
				? UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT
				: UNCONFIRMED_TRANSACTION_TIMEOUT;
		const timeElapsed =
			// tslint:disable-next-line no-magic-numbers
			timeNow - Math.floor(this.receivedAt.getTime() / 1000);

		return timeElapsed > timeOut;
	}
}
