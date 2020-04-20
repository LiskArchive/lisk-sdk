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
import { intToBuffer, stringToBuffer } from '@liskhq/lisk-cryptography';
import {
	isPositiveNumberString,
	isValidTransferAmount,
	validator,
} from '@liskhq/lisk-validator';

import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { verifyMinRemainingBalance } from './utils';

export interface TransferAsset {
	readonly data?: string;
	readonly recipientId: string;
	readonly amount: bigint;
}

export const transferAssetFormatSchema = {
	type: 'object',
	required: ['recipientId', 'amount'],
	properties: {
		recipientId: {
			type: 'string',
			format: 'address',
		},
		amount: {
			type: 'string',
			format: 'amount',
		},
		data: {
			type: 'string',
			format: 'transferData',
			maxLength: 64,
		},
	},
};

interface RawAsset {
	readonly data?: string;
	readonly recipientId: string;
	readonly amount: number | string;
}

export class TransferTransaction extends BaseTransaction {
	public static TYPE = 8;
	public readonly asset: TransferAsset;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		// Initializes to empty object if it doesn't exist
		if (tx.asset) {
			const rawAsset = tx.asset as RawAsset;
			this.asset = {
				data: rawAsset.data,
				recipientId: rawAsset.recipientId,
				amount: BigInt(
					isPositiveNumberString(rawAsset.amount) ? rawAsset.amount : '0',
				),
			};
		} else {
			this.asset = {
				amount: BigInt('0'),
				recipientId: '',
			} as TransferAsset;
		}
	}

	public assetToJSON(): object {
		return {
			data: this.asset.data,
			amount: this.asset.amount.toString(),
			recipientId: this.asset.recipientId,
		};
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
			{
				address: this.asset.recipientId,
			},
		]);
	}

	protected assetToBytes(): Buffer {
		const transactionAmount = intToBuffer(
			this.asset.amount.toString(),
			BYTESIZES.AMOUNT,
			'big',
		);
		const transactionRecipientID = this.asset.recipientId
			? intToBuffer(
					this.asset.recipientId.slice(0, -1),
					BYTESIZES.RECIPIENT_ID,
			  ).slice(0, BYTESIZES.RECIPIENT_ID)
			: Buffer.alloc(0);

		const dataBuffer = this.asset.data
			? stringToBuffer(this.asset.data)
			: Buffer.alloc(0);

		return Buffer.concat([
			transactionAmount,
			transactionRecipientID,
			dataBuffer,
		]);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const asset = this.assetToJSON();
		const schemaErrors = validator.validate(transferAssetFormatSchema, asset);
		const errors = convertToAssetError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		if (!isValidTransferAmount(this.asset.amount.toString())) {
			errors.push(
				new TransactionError(
					'Amount must be a valid number in string format.',
					this.id,
					'.asset.amount',
					this.asset.amount.toString(),
				),
			);
		}

		if (!this.asset.recipientId) {
			errors.push(
				new TransactionError(
					'`recipientId` must be provided.',
					this.id,
					'.asset.recipientId',
				),
			);
		}

		return errors;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get(this.senderId);

		sender.balance -= this.asset.amount;
		store.account.set(sender.address, sender);
		const recipient = await store.account.getOrDefault(this.asset.recipientId);

		recipient.balance += this.asset.amount;

		if (recipient.balance > BigInt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(
				new TransactionError(
					'Invalid amount',
					this.id,
					'.amount',
					this.asset.amount.toString(),
				),
			);
		}

		// Validate minimum remaining balance
		const minRemainingBalanceError = verifyMinRemainingBalance(
			this.id,
			recipient,
			(this.constructor as typeof BaseTransaction).MIN_REMAINING_BALANCE,
		);
		if (minRemainingBalanceError) {
			errors.push(minRemainingBalanceError);
		}

		store.account.set(recipient.address, recipient);

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get(this.senderId);
		const updatedSenderBalance = sender.balance + this.asset.amount;

		if (updatedSenderBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(
				new TransactionError(
					'Invalid amount',
					this.id,
					'.amount',
					this.asset.amount.toString(),
				),
			);
		}

		sender.balance = updatedSenderBalance;
		store.account.set(sender.address, sender);
		const recipient = await store.account.getOrDefault(this.asset.recipientId);
		recipient.balance -= this.asset.amount;

		store.account.set(recipient.address, recipient);

		return errors;
	}
}
