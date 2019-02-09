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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { MAX_TRANSACTION_AMOUNT, TRANSFER_FEE } from './constants';
import { TransactionError, TransactionMultiError } from './errors';
import { Account, TransactionJSON, TransferAsset } from './transaction_types';
import { validateAddress, validateTransferAmount, validator, verifyBalance } from './utils';

const TRANSACTION_TRANSFER_TYPE = 0;

export interface RequiredTransferState {
	readonly sender: Account;
	readonly recipient: Account;
}

export interface TransferAsset {
	readonly data: string;
}

export const transferAssetTypeSchema = {
	type: 'object',
	properties: {
		data: {
			type: 'string',
		},
	},
};

export const transferAssetFormatSchema = {
	type: 'object',
	properties: {
		data: {
			type: 'string',
			maxLength: 64,
		},
	},
};

export class TransferTransaction extends BaseTransaction {
	public readonly asset: TransferAsset;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(transferAssetTypeSchema, tx.asset);
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							tx.id,
							error.dataPath,
						),
			  )
			: [];
		if (!typeValid || errors.length > 0) {
			throw new TransactionMultiError('Invalid asset types', tx.id, errors);
		}
		this.asset = tx.asset as TransferAsset;
		this._fee = new BigNum(TRANSFER_FEE);
	}

	protected getAssetBytes(): Buffer {
		const { data } = this.asset;

		return data ? Buffer.from(data, 'utf8') : Buffer.alloc(0);
	}

	public assetToJSON(): TransferAsset {
		return {
			...this.asset,
		};
	}

	public async prepareTransaction(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
			{
				address: this.recipientId,
			},
		]);
	}

	// tslint:disable-next-line prefer-function-over-method
	protected verifyAgainstTransactions(
		_: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		return [];
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(transferAssetFormatSchema, this.asset);
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							this.id,
							error.dataPath,
						),
			  )
			: [];

		if (this.type !== TRANSACTION_TRANSFER_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (!validateTransferAmount(this.amount.toString())) {
			errors.push(
				new TransactionError(
					'Amount must be a valid number in string format.',
					this.id,
					'.recipientId',
				),
			);
		}

		if (!this.fee.eq(TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${TRANSFER_FEE}`,
					this.id,
					'.fee',
				),
			);
		}

		if (!this.recipientId) {
			errors.push(
				new TransactionError(
					'`recipientId` must be provided.',
					this.id,
					'.recipientId',
				),
			);
		}

		try {
			validateAddress(this.recipientId);
		} catch (error) {
			errors.push(new TransactionError(error.message, this.id, '.recipientId'));
		}

		if (
			this.recipientPublicKey &&
			this.recipientId !== getAddressFromPublicKey(this.recipientPublicKey)
		) {
			errors.push(
				new TransactionError(
					'recipientId does not match recipientPublicKey.',
					this.id,
					'.recipientId',
				),
			);
		}

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);

		const balanceError = verifyBalance(this.id, sender, this.amount);
		if (balanceError) {
			errors.push(balanceError);
		}
		const updatedSenderBalance = new BigNum(sender.balance).sub(this.amount);

		const updatedSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};
		store.account.set(updatedSender.address, updatedSender);
		const recipient = store.account.get(this.recipientId);

		const updatedRecipientBalance = new BigNum(recipient.balance).add(
			this.amount,
		);

		if (updatedRecipientBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid amount', this.id, '.amount'));
		}

		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};
		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);
		const updatedSenderBalance = new BigNum(sender.balance).add(this.amount);

		if (updatedSenderBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid amount', this.id, '.amount'));
		}

		const updatedSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};
		store.account.set(updatedSender.address, updatedSender);
		const recipient = store.account.get(this.recipientId);

		const balanceError = verifyBalance(this.id, recipient, this.amount);

		if (balanceError) {
			errors.push(balanceError);
		}

		const updatedRecipientBalance = new BigNum(recipient.balance).sub(
			this.amount,
		);

		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}
}
