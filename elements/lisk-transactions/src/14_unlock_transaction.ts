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

import { BaseTransaction, StateStore } from './base_transaction';
import { TransactionError } from './errors';
import { Account } from './types';
import { getPunishmentPeriod, sortUnlocking } from './utils';

export interface Unlock {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export interface UnlockAsset {
	readonly unlockObjects: ReadonlyArray<Unlock>;
}

const unlockAssetSchema = {
	$id: 'lisk/unlock-transaction',
	type: 'object',
	required: ['unlockObjects'],
	properties: {
		unlockObjects: {
			type: 'array',
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: 20,
						maxLength: 20,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					unvoteHeight: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
			fieldNumber: 1,
		},
	},
};

const AMOUNT_MULTIPLIER_FOR_VOTES = BigInt(10) * BigInt(10) ** BigInt(8);
const WAIT_TIME_VOTE = 2000;
const WAIT_TIME_SELF_VOTE = 260000;

const getWaitingPeriod = (
	sender: Account,
	delegateAccount: Account,
	lastBlockHeight: number,
	unlockObject: Unlock,
): number => {
	const currentHeight = lastBlockHeight + 1;
	const waitTime =
		sender.address === delegateAccount.address
			? WAIT_TIME_SELF_VOTE
			: WAIT_TIME_VOTE;

	return waitTime - (currentHeight - unlockObject.unvoteHeight);
};

export class UnlockTransaction extends BaseTransaction {
	public static TYPE = 14;
	public static ASSET_SCHEMA = unlockAssetSchema;
	public readonly asset: UnlockAsset;

	public constructor(transaction: UnlockTransaction) {
		super(transaction);

		this.asset = transaction.asset;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const errors = [];

		for (const unlock of this.asset.unlockObjects) {
			if (unlock.amount <= BigInt(0)) {
				errors.push(
					new TransactionError(
						'Amount cannot be less than or equal to zero',
						this.id,
						'.asset.votes.amount',
						unlock.amount.toString(),
					),
				);
			}

			if (unlock.amount % AMOUNT_MULTIPLIER_FOR_VOTES !== BigInt(0)) {
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

		for (const unlock of this.asset.unlockObjects) {
			const sender = await store.account.get(this.senderId);
			const delegate = await store.account.getOrDefault(unlock.delegateAddress);
			if (!delegate.username) {
				errors.push(
					new TransactionError(
						'Voted account is not registered as delegate',
						this.id,
						'.asset.unlockObjects.delegateAddress',
					),
				);
				// eslint-disable-next-line no-continue
				continue;
			}

			const waitingPeriod = getWaitingPeriod(
				sender,
				delegate,
				store.chain.lastBlockHeader.height,
				unlock,
			);
			if (waitingPeriod > 0) {
				errors.push(
					new TransactionError(
						'Unlocking is not permitted as it is still within the waiting period',
						this.id,
						'.asset.unlockObjects.unvoteHeight',
						waitingPeriod,
						0,
					),
				);
			}
			const punishmentPeriod = getPunishmentPeriod(
				sender,
				delegate,
				store.chain.lastBlockHeader.height,
			);
			if (punishmentPeriod > 0) {
				errors.push(
					new TransactionError(
						'Unlocking is not permitted as delegate is currently being punished',
						this.id,
						'.asset.unlockObjects.delegateAddress',
						punishmentPeriod,
						0,
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
						'.asset.unlockObjects',
					),
				);
				// eslint-disable-next-line no-continue
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
		for (const unlock of this.asset.unlockObjects) {
			const sender = await store.account.get(this.senderId);

			sender.balance -= unlock.amount;
			sender.unlocking.push(unlock);
			// Resort the unlocking since it's pushed to the end
			sortUnlocking(sender.unlocking);
			store.account.set(sender.address, sender);
		}

		return [];
	}
}
