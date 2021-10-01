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
 */

import { BaseAsset } from '../../base_asset';
import { ApplyAssetContext, ValidateAssetContext } from '../../../types';
import { ValidationError } from '../../../errors';
import { AMOUNT_MULTIPLIER_FOR_VOTES } from '../constants';
import { DPOSAccountProps, UnlockTransactionAssetContext } from '../types';
import { getMinPunishedHeight, getMinWaitingHeight } from '../utils';

export class UnlockTransactionAsset extends BaseAsset<UnlockTransactionAssetContext> {
	public name = 'unlockToken';
	public id = 2;
	public schema = {
		$id: 'lisk/dpos/unlock',
		type: 'object',
		required: ['unlockObjects'],
		properties: {
			unlockObjects: {
				type: 'array',
				minItems: 1,
				maxItems: 20,
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

	private readonly _unlockFixHeight: number;

	public constructor(unlockFixHeight?: number) {
		super();
		this._unlockFixHeight = unlockFixHeight ?? 0;
	}

	public validate({ asset }: ValidateAssetContext<UnlockTransactionAssetContext>): void {
		for (const unlock of asset.unlockObjects) {
			if (unlock.unvoteHeight <= 0) {
				throw new ValidationError(
					'Height cannot be less than or equal to zero',
					unlock.unvoteHeight.toString(),
				);
			}

			if (unlock.amount <= BigInt(0)) {
				throw new ValidationError(
					'Amount cannot be less than or equal to zero.',
					unlock.amount.toString(),
				);
			}

			if (unlock.amount % AMOUNT_MULTIPLIER_FOR_VOTES !== BigInt(0)) {
				throw new ValidationError(
					'Amount should be multiple of 10 * 10^8.',
					unlock.amount.toString(),
				);
			}
		}
	}

	public async apply({
		asset,
		transaction,
		stateStore: store,
		reducerHandler,
	}: ApplyAssetContext<UnlockTransactionAssetContext>): Promise<void> {
		for (const unlock of asset.unlockObjects) {
			const sender = await store.account.get<DPOSAccountProps>(transaction.senderAddress);
			const delegate = await store.account.get<DPOSAccountProps>(unlock.delegateAddress);

			if (delegate.dpos.delegate.username === '') {
				throw new Error('Voted account is not registered as delegate.');
			}

			const unlockIndex = sender.dpos.unlocking.findIndex(
				obj =>
					obj.amount === unlock.amount &&
					obj.delegateAddress.equals(unlock.delegateAddress) &&
					obj.unvoteHeight === unlock.unvoteHeight,
			);
			if (unlockIndex < 0) {
				throw new Error('Corresponding unlocking object not found.');
			}

			const currentHeight = store.chain.lastBlockHeaders[0].height + 1;
			const minWaitingHeight = getMinWaitingHeight(sender.address, delegate.address, unlock);

			if (minWaitingHeight > currentHeight) {
				throw new Error('Unlocking is not permitted as it is still within the waiting period.');
			}

			const minUnlockDelay = getMinPunishedHeight(sender, delegate);
			const lastPomHeight =
				delegate.dpos.delegate.pomHeights.length === 0
					? undefined
					: Math.max(...delegate.dpos.delegate.pomHeights);

			if (currentHeight >= this._unlockFixHeight) {
				if (
					minUnlockDelay > currentHeight &&
					lastPomHeight !== undefined &&
					lastPomHeight < minWaitingHeight
				) {
					throw new Error(
						'Unlocking is not permitted as the delegate is currently being punished.',
					);
				}
				// unlocking condition before hard fork, to be deprecated
			} else if (currentHeight < this._unlockFixHeight) {
				if (minUnlockDelay > currentHeight) {
					throw new Error(
						'Unlocking is not permitted as the delegate is currently being punished.',
					);
				}
			}

			sender.dpos.unlocking.splice(unlockIndex, 1);

			await reducerHandler.invoke('token:credit', {
				address: transaction.senderAddress,
				amount: unlock.amount,
			});

			await store.account.set(sender.address, sender);
		}
	}
}
