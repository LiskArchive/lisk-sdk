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
import { ErrorObject } from 'ajv';
import BigNum from 'browserify-bignum';
import { BYTESIZES } from './constants';
import { TransactionError } from './errors';
import {
	Account,
	StateReturn,
	TransactionAsset,
	TransactionJSON,
	ValidateReturn,
	VerifyReturn,
} from './transaction_types';
import { checkBalance, validator, verifyTransaction } from './utils';
import * as schemas from './utils/validation/schema';

interface CheckTransactionTypesResult {
	readonly message: string;
	readonly dataPath: string;
}

const checkTransactionTypes = (
	tx: TransactionJSON,
): CheckTransactionTypesResult | undefined => {
	const typeValidator = validator.compile(schemas.transaction);
	typeValidator(tx);

	const result = typeValidator.errors
		? typeValidator.errors.reduce(
				(object: CheckTransactionTypesResult, error: ErrorObject) => {
					const message = `${object.message} ${object.message ? ':' : ''} '${
						error.dataPath
					}' ${error.message}`;

					const dataPath = `${object.dataPath} : ${error.dataPath}`;

					return {
						message,
						dataPath,
					};
				},
				{ message: '', dataPath: '' },
		  )
		: undefined;

	return result;
};

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
			const { message, dataPath } = result;
			throw new TransactionError(message, dataPath);
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

	public getBytes(): Buffer {
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

		const amountBigNum = new BigNum(this.amount);

		const transactionAmount = amountBigNum.toBuffer({
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

	public abstract containsUniqueData(): boolean;

	public checkSchema = (): ValidateReturn => {
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
			: undefined;

		return {
			valid,
			errors,
		};
	};

	public validate(): ValidateReturn {
		const transaction = this.toJSON();

		const errors = Object.entries(transaction).reduce(
			(
				errorArray: ReadonlyArray<TransactionError>,
				property: ReadonlyArray<string>,
			): ReadonlyArray<TransactionError> => {
				const [key, value] = property;
				if (key === 'signature' && !value) {
					return [
						...errorArray,
						new TransactionError(
							'Cannot validate transaction without signature.',
							this.id,
						),
					];
				}
				if (key === 'senderPublicKey' && !value) {
					return [
						...errorArray,
						new TransactionError('`senderPublicKey` is missing.', this.id),
					];
				}
				if (key === 'senderId' && !value) {
					return [
						...errorArray,
						new TransactionError('`senderId` is missing.', this.id),
					];
				}

				return errorArray;
			},
			[],
		);

		if (errors.length > 0) {
			return {
				valid: false,
				errors,
			};
		}

		if (
			this.senderPublicKey &&
			this.senderId &&
			this.senderId.toUpperCase() !==
				cryptography.getAddressFromPublicKey(this.senderPublicKey).toUpperCase()
		) {
			return {
				valid: false,
				errors: [new TransactionError('Invalid senderId', this.id)],
			};
		}

		const transactionHash = cryptography.hash(this.getBytes());

		const valid = cryptography.verifyData(
			transactionHash,
			this.signature as string,
			this.senderPublicKey,
		);

		if (!valid) {
			return {
				valid: false,
				errors: [new TransactionError('Invalid signature.', this.id)],
			};
		}

		return {
			valid,
		};
	}

	public getRequiredAttributes(): object {
		return {
			ACCOUNTS: [cryptography.getAddressFromPublicKey(this.senderPublicKey)],
		};
	}

	public verify(sender: Account): VerifyReturn {
		// Check sender balance
		const { verified: balanceVerified, errors } = checkBalance(
			sender,
			this.fee,
		);

		// TODO: Check multisignatures

		// Check secondPublicKey
		const signSignatureVerified = sender.secondPublicKey
			? verifyTransaction(this.toJSON(), sender.secondPublicKey)
			: true;

		return {
			verified: balanceVerified && signSignatureVerified,
			errors,
		};
	}

	public abstract verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): VerifyReturn;

	public apply(sender: Account): StateReturn {
		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			sender: updatedAccount,
		};
	}

	public undo(sender: Account): StateReturn {
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			sender: updatedAccount,
		};
	}
}
