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
import { BYTESIZES, MAX_TRANSACTION_AMOUNT, TRANSFER_FEE } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { verifyAmountBalance, verifyBalance } from './utils';

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
	public readonly asset: TransferAsset;
	public static TYPE = 8;
	public static FEE = TRANSFER_FEE.toString();

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
			// tslint:disable-next-line no-object-literal-type-assertion
			this.asset = {
				amount: BigInt('0'),
				recipientId: '',
			} as TransferAsset;
		}
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

		const balanceError = verifyAmountBalance(
			this.id,
			sender,
			this.asset.amount,
			this.fee,
		);
		if (balanceError) {
			errors.push(balanceError);
		}

		const updatedSenderBalance =
			BigInt(sender.balance) - BigInt(this.asset.amount);

		const updatedSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};
		store.account.set(updatedSender.address, updatedSender);
		const recipient = await store.account.getOrDefault(this.asset.recipientId);

		const updatedRecipientBalance =
			BigInt(recipient.balance) + BigInt(this.asset.amount);

		if (updatedRecipientBalance > BigInt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(
				new TransactionError(
					'Invalid amount',
					this.id,
					'.amount',
					this.asset.amount.toString(),
				),
			);
		}

		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};
		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get(this.senderId);
		const updatedSenderBalance =
			BigInt(sender.balance) + BigInt(this.asset.amount);

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

		const updatedSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};
		store.account.set(updatedSender.address, updatedSender);
		const recipient = await store.account.getOrDefault(this.asset.recipientId);

		const balanceError = verifyBalance(this.id, recipient, this.asset.amount);

		if (balanceError) {
			errors.push(balanceError);
		}

		const updatedRecipientBalance =
			BigInt(recipient.balance) - BigInt(this.asset.amount);

		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}
}
