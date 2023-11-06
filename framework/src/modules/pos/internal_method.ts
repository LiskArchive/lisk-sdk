/*
 * Copyright © 2022 Lisk Foundation
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

import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { NamedRegistry } from '../named_registry';
import { MAX_NUMBER_BYTES_Q96 } from './constants';
import { RewardsAssignedEvent } from './events/rewards_assigned';
import { StakerStore } from './stores/staker';
import { ValidatorAccount, TokenMethod, StakeObject } from './types';
import { calculateStakeRewards } from './utils';

export class InternalMethod extends BaseMethod {
	private _tokenMethod!: TokenMethod;
	private readonly _moduleName!: string;

	public constructor(stores: NamedRegistry, events: NamedRegistry, moduleName: string) {
		super(stores, events);

		this._moduleName = moduleName;
	}
	public addDependencies(tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
	}

	public async assignStakeRewards(
		methodContext: MethodContext,
		stakerAddress: Buffer,
		sentStake: StakeObject,
		validatorData: ValidatorAccount,
	) {
		if (sentStake.validatorAddress.equals(stakerAddress)) {
			return;
		}

		for (const sharingCoefficient of validatorData.sharingCoefficients) {
			const stakeSharingCoefficient = sentStake.sharingCoefficients.find(coefficient =>
				coefficient.tokenID.equals(sharingCoefficient.tokenID),
			) ?? {
				tokenID: sharingCoefficient.tokenID,
				coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96),
			};

			const reward = calculateStakeRewards(
				stakeSharingCoefficient,
				sentStake.amount,
				sharingCoefficient,
			);

			if (reward > 0) {
				await this._tokenMethod.unlock(
					methodContext,
					sentStake.validatorAddress,
					this._moduleName,
					sharingCoefficient.tokenID,
					reward,
				);

				await this._tokenMethod.transfer(
					methodContext,
					sentStake.validatorAddress,
					stakerAddress,
					sharingCoefficient.tokenID,
					reward,
				);

				this.events.get(RewardsAssignedEvent).log(methodContext, {
					stakerAddress,
					validatorAddress: sentStake.validatorAddress,
					tokenID: sharingCoefficient.tokenID,
					amount: reward,
				});
			}
		}
	}

	public async getLockedStakedAmount(
		ctx: ImmutableMethodContext,
		address: Buffer,
	): Promise<bigint> {
		const staker = await this.stores.get(StakerStore).getOrDefault(ctx, address);
		let lockedAmount = BigInt(0);
		for (const stakes of staker.stakes) {
			lockedAmount += stakes.amount;
		}
		for (const unlock of staker.pendingUnlocks) {
			lockedAmount += unlock.amount;
		}
		return lockedAmount;
	}
}
