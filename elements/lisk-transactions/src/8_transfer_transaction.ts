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
import {
	isValidTransferAmount,
	validator,
} from '@liskhq/lisk-validator';

import { BaseTransaction, StateStore } from './base_transaction';
import { MAX_TRANSACTION_AMOUNT } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionMessage } from './types';
import { verifyMinRemainingBalance } from './utils';

export interface TransferAsset {
	readonly amount: bigint;
	readonly recipientAddress: string;
	readonly data: string;
}

export const transferAssetSchema = {
	$id: 'lisk/transfer-transaction',
	type: 'object',
	required: ['amount', 'recipientAddress', 'data'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
		},
	},
};

export class TransferTransaction extends BaseTransaction {
	public static TYPE = 8;
	public static ASSET_SCHEMA = transferAssetSchema;
	public readonly asset: TransferAsset;

	public constructor(transaction: TransactionMessage) {
		super(transaction);

		this.asset = transaction.asset as unknown as TransferAsset;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const schemaErrors = validator.validate(transferAssetSchema, this.asset);
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

		if (!this.asset.recipientAddress) {
			errors.push(
				new TransactionError(
					'`recipientAddress` must be provided.',
					this.id,
					'.asset.recipientAddress',
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
		const recipient = await store.account.getOrDefault(this.asset.recipientAddress);

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
		const recipient = await store.account.getOrDefault(this.asset.recipientAddress);
		recipient.balance -= this.asset.amount;

		store.account.set(recipient.address, recipient);

		return errors;
	}
}
