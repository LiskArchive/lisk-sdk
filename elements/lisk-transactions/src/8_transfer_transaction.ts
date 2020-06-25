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

import { BaseTransaction, StateStore } from './base_transaction';
import { MAX_TRANSACTION_AMOUNT } from './constants';
import { TransactionError } from './errors';
import { verifyMinRemainingBalance } from './utils';
import { BaseTransactionInput } from './types';

export interface TransferAsset {
	readonly amount: bigint;
	readonly recipientAddress: Buffer;
	readonly data: string;
}

export const transferAssetSchema = {
	$id: 'lisk/transfer-transaction',
	title: 'Transfer transaction asset',
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
			minLength: 20,
			maxLength: 20,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};

export class TransferTransaction extends BaseTransaction {
	public static TYPE = 8;
	public static ASSET_SCHEMA = transferAssetSchema;
	public readonly asset: TransferAsset;

	public constructor(transaction: BaseTransactionInput<TransferAsset>) {
		super(transaction);

		this.asset = transaction.asset;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get(this.senderId);

		sender.balance -= this.asset.amount;
		store.account.set(sender.address, sender);
		const recipient = await store.account.getOrDefault(
			this.asset.recipientAddress,
		);

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
}
