/*
 * Copyright © 2020 Lisk Foundation
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
import { intToBuffer } from '@liskhq/lisk-cryptography';
import { isNumberString, validator } from '@liskhq/lisk-validator';

import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { convertToAssetError, TransactionError } from './errors';
import { Account, TransactionJSON } from './transaction_types';

export interface Unlock {
	readonly delegateAddress: string;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export interface UnlockAsset {
	readonly unlockingObjects: ReadonlyArray<Unlock>;
}

const voteAssetFormatSchema = {
	type: 'object',
	required: ['unlockingObjects'],
	properties: {
		unlockingObjects: {
			type: 'array',
			minItems: 1,
			maxItems: 20,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
				properties: {
					delegateAddress: {
						type: 'string',
						format: 'address',
					},
					amount: {
						type: 'string',
						format: 'int64',
					},
					unvoteHeight: {
						type: 'integer',
						minimum: 0,
					},
				},
			},
		},
	},
};

const SIZE_UINT32 = 4;
const SIZE_INT64 = 8;
const SIZE_UINT64 = SIZE_INT64;
// tslint:disable-next-line no-magic-numbers
const TEN_UNIT = BigInt(10) * BigInt(10) ** BigInt(8);
const WAIT_TIME_VOTE = 2000;
const WAIT_TIME_SELF_VOTE = 260000;
const PUNISH_TIME_VOTE = 260000;
const PUNISH_TIME_SELF_VOTE = 780000;

export interface RawAssetUnlock {
	readonly delegateAddress: string;
	readonly amount: string;
	readonly unvoteHeight: number;
}

interface RawAsset {
	readonly unlockingObjects: ReadonlyArray<RawAssetUnlock>;
}

const hasWaited = (
	sender: Account,
	delegateAccount: Account,
	lastBlockHeight: number,
	unlockObject: Unlock,
): boolean => {
	const currentHeight = lastBlockHeight + 1;
	const waitTime =
		sender.address === delegateAccount.address
			? WAIT_TIME_SELF_VOTE
			: WAIT_TIME_VOTE;
	if (currentHeight - unlockObject.unvoteHeight < waitTime) {
		return false;
	}

	return true;
};

const isPunished = (
	sender: Account,
	delegateAccount: Account,
	lastBlockHeight: number,
): boolean => {
	if (delegateAccount.delegate.pomHeights.length === 0) {
		return false;
	}
	const lastPomHeight = Math.max(...delegateAccount.delegate.pomHeights);
	const currentHeight = lastBlockHeight + 1;
	const punishTime =
		sender.address === delegateAccount.address
			? PUNISH_TIME_SELF_VOTE
			: PUNISH_TIME_VOTE;
	if (currentHeight - lastPomHeight < punishTime) {
		return true;
	}

	return false;
};

export class UnlockTransaction extends BaseTransaction {
	public readonly asset: UnlockAsset;
	public static TYPE = 14;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		if (tx.asset) {
			const rawAsset = tx.asset as RawAsset;
			this.asset = {
				unlockingObjects: rawAsset.unlockingObjects.map(unlock => {
					const amount = isNumberString(unlock.amount)
						? BigInt(unlock.amount)
						: BigInt(0);

					return {
						delegateAddress: unlock.delegateAddress,
						amount,
						unvoteHeight: unlock.unvoteHeight,
					};
				}),
			};
		} else {
			// tslint:disable-next-line no-object-literal-type-assertion
			this.asset = { unlockingObjects: [] };
		}
	}

	public assetToJSON(): object {
		return {
			unlockingObjects: this.asset.unlockingObjects.map(unlock => ({
				delegateAddress: unlock.delegateAddress,
				amount: unlock.amount.toString(),
				unvoteHeight: unlock.unvoteHeight,
			})),
		};
	}

	protected assetToBytes(): Buffer {
		const bufferArray = [];
		for (const unlock of this.asset.unlockingObjects) {
			const addressBuffer = intToBuffer(
				unlock.delegateAddress.slice(0, -1),
				SIZE_UINT64,
			);
			bufferArray.push(addressBuffer);
			const amountBuffer = intToBuffer(
				unlock.amount.toString(),
				SIZE_INT64,
				'big',
				true,
			);
			bufferArray.push(amountBuffer);
			const unvoteHeightBuffer = intToBuffer(unlock.unvoteHeight, SIZE_UINT32);
			bufferArray.push(unvoteHeightBuffer);
		}

		return Buffer.concat(bufferArray);
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		const addressArray = this.asset.unlockingObjects.map(unlock => ({
			address: unlock.delegateAddress,
		}));
		const filterArray = [
			{
				address: this.senderId,
			},
			...addressArray,
		];

		await store.account.cache(filterArray);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const asset = this.assetToJSON();
		const schemaErrors = validator.validate(voteAssetFormatSchema, asset);
		const errors = convertToAssetError(
			this.id,
			schemaErrors,
		) as TransactionError[];

		for (const unlock of this.asset.unlockingObjects) {
			if (unlock.amount <= BigInt(0)) {
				errors.push(
					new TransactionError(
						'Amount cannot be less than zero',
						this.id,
						'.asset.votes.amount',
						unlock.amount.toString(),
					),
				);
			}

			if (unlock.amount % TEN_UNIT !== BigInt(0)) {
				errors.push(
					new TransactionError(
						'Amount should be multiple of 10 * 10^8',
						this.id,
						'.asset.votes.amount',
						unlock.amount.toString(),
					),
				);
			}
		}

		return errors;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors = [];

		for (const unlock of this.asset.unlockingObjects) {
			const sender = await store.account.get(this.senderId);
			const delegate = await store.account.get(unlock.delegateAddress);
			if (
				!hasWaited(sender, delegate, store.chain.lastBlockHeader.height, unlock)
			) {
				errors.push(
					new TransactionError(
						'Unlocking object has not waited locking period',
						this.id,
						'.asset.unlockingObjects.unvoteHeight',
						unlock.unvoteHeight,
					),
				);
			}
			if (isPunished(sender, delegate, store.chain.lastBlockHeader.height)) {
				errors.push(
					new TransactionError(
						'Delegate is currently being punished',
						this.id,
						'.asset.unlockingObjects.delegateAddress',
						unlock.unvoteHeight,
					),
				);
			}
			const unlockIndex = sender.unlocking.findIndex(
				obj =>
					obj.amount === unlock.amount &&
					obj.delegateAddress === unlock.delegateAddress &&
					obj.unvoteHeight === unlock.unvoteHeight,
			);
			if (unlockIndex < 0) {
				errors.push(
					new TransactionError(
						'Corresponding unlocking object not found',
						this.id,
						'.asset.unlockingObjects',
					),
				);
				continue;
			}
			sender.unlocking.splice(unlockIndex, 1);
			sender.balance += unlock.amount;
			store.account.set(sender.address, sender);
		}

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		for (const unlock of this.asset.unlockingObjects) {
			const sender = await store.account.get(this.senderId);

			sender.balance -= unlock.amount;
			sender.unlocking.push(unlock);
			// Resort the unlocking since it's pushed to the end
			sender.unlocking.sort((a, b) =>
				a.delegateAddress.localeCompare(b.delegateAddress, 'en'),
			);
			store.account.set(sender.address, sender);
		}

		return [];
	}
}
