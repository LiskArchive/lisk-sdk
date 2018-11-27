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
import cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from './constants';
import { TransactionError } from './errors';
import {
	Account,
	StateReturn,
	TransactionJSON,
	ValidateReturn,
	VerifyReturn,
} from './transaction_types';
import {
	checkBalance,
	normalizeInput,
	validateTransaction,
	verifyTransaction,
} from './utils';

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly fee: BigNum;
	public readonly id: string;
	public readonly recipientId: string;
	public readonly recipientPublicKey: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signature?: string;
	public readonly signatures?: ReadonlyArray<string>;
	public readonly signSignature?: string;
	public readonly timestamp: number;
	public readonly type: number;

	public constructor(rawTransaction: TransactionJSON) {
		normalizeInput(rawTransaction);
		this.amount = new BigNum(rawTransaction.amount);
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

	public abstract prepareTransaction(
		passphrase: string,
		secondPassphrase?: string,
	): TransactionJSON;

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
			signSignature: this.signSignature,
		};

		return transaction;
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
		if (amountBigNum.lt(0)) {
			throw new TransactionError(
				'Transaction amount must not be negative.',
				this.id,
			);
		}
		// BUG in browserify-bignum prevents us using `.gt` directly.
		// See https://github.com/bored-engineer/b rowserify-bignum/pull/2
		if (amountBigNum.gte(new BigNum(MAX_TRANSACTION_AMOUNT).add(1))) {
			throw new TransactionError('Transaction amount is too large.', this.id);
		}
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

	public validate(): ValidateReturn {
		// Schema validation
		const { valid, errors } = validateTransaction(this.toJSON());
		const transactionErrors = errors
			? errors.map(error => new TransactionError(error.message, error.dataPath))
			: undefined;

		// Single signature validation
		const verified = verifyTransaction(this.toJSON());

		return {
			validated: valid && verified,
			errors: transactionErrors,
		};
	}

	public getRequiredAttributes(): object {
		return {
			ACCOUNTS: [cryptography.getAddressFromPublicKey(this.senderPublicKey)],
		};
	}

	public verifyAgainstState(sender: Account): VerifyReturn {
		// Check sender balance
		const { exceeded, errors } = checkBalance(sender, this.fee);

		// Check multisig
		const verified = sender.secondPublicKey
			? verifyTransaction(this.toJSON(), sender.secondPublicKey)
			: true;

		return {
			verified: !exceeded && verified,
			errors,
		};
	}

	public abstract verifyAgainstTransactions(
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
		const updatedBalance = new BigNum(sender.balance).plus(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			sender: updatedAccount,
		};
	}
}
