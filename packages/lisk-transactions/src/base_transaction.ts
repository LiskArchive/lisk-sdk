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
// tslint:disable member-ordering
import cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { TransactionError } from './errors';
import { IAccount, ITransactionJSON } from './transaction_types';
import {
	checkBalance,
	getTransactionBytes,
	getTransactionId,
	isNumberString,
	secondSignTransaction,
	signTransaction,
	validateTransaction,
	verifyTransaction,
} from './utils';

const normalizeInput = (rawTransaction: ITransactionJSON): void => {
	const {
		amount,
		fee,
		signSignature,
		signatures,
		...strippedTransaction
	} = rawTransaction;

	Object.entries({ amount, fee }).forEach(field => {
		const [key, value] = field;

		if (
			!((value as unknown) instanceof BigNum) &&
			(!isNumberString(value) || !Number.isSafeInteger(parseInt(value, 10)))
		) {
			throw new TransactionError(
				`\`${key}\` must be a valid string or BigNum.`,
			);
		}
	});

	Object.entries(strippedTransaction).forEach(field => {
		const [key, value] = field;
		if (['timestamp', 'type'].includes(key)) {
			if (typeof value !== 'number') {
				throw new TransactionError(`\`${key}\` must be a number.`);
			}
		}
		if (typeof value !== 'string') {
			throw new TransactionError(`\`${key}\` must be a string.`);
		}
	});
};

export class BaseTransaction {
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

	public constructor(rawTransaction: ITransactionJSON) {
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

	public prepareTransaction(
		passphrase: string,
		secondPassphrase?: string,
	): ITransactionJSON {
		const transaction = this.toJSON();
		const singleSignedTransaction = {
			...transaction,
			signature: signTransaction(transaction, passphrase),
		};

		const signedTransaction =
			typeof secondPassphrase === 'string' && transaction.type !== 1
				? secondSignTransaction(singleSignedTransaction, secondPassphrase)
				: singleSignedTransaction;

		const transactionWithId = {
			...signedTransaction,
			id: getTransactionId(signedTransaction),
		};

		return transactionWithId;
	}

	public toJSON(): ITransactionJSON {
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
		const {
			signature,
			signatures,
			signSignature,
			...transaction
		} = this.toJSON();

		return getTransactionBytes(transaction);
	}

	// tslint:disable-next-line prefer-function-over-method
	public containsUniqueData(): boolean {
		// Always false for base transaction
		return false;
	}

	public validate(): {
		readonly validated: boolean;
		readonly errors?: ReadonlyArray<TransactionError>;
	} {
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

	public verifyAgainstState(
		sender: IAccount,
	): {
		readonly verified: boolean;
		readonly errors?: ReadonlyArray<TransactionError>;
	} {
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

	// tslint:disable-next-line prefer-function-over-method
	public verifyAgainstTransactions(
		transactions: ReadonlyArray<ITransactionJSON>,
	): {
		readonly verified: boolean;
		readonly errors?: ReadonlyArray<TransactionError>;
	} {
		// Only check argument type for base transaction
		const verified = Array.isArray(transactions);

		return { verified };
	}

	public apply(
		sender: IAccount,
	): { readonly sender: IAccount; readonly recipient?: IAccount } {
		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			sender: updatedAccount,
		};
	}

	public undo(
		sender: IAccount,
	): { readonly sender: IAccount; readonly recipient?: IAccount } {
		const updatedBalance = new BigNum(sender.balance).plus(this.fee);
		const updatedAccount = { ...sender, balance: updatedBalance.toString() };

		return {
			sender: updatedAccount,
		};
	}
}
