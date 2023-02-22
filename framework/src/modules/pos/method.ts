/*
 * Copyright © 2021 Lisk Foundation
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

import { math } from '@liskhq/lisk-utils';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { EMPTY_KEY, MAX_LENGTH_NAME } from './constants';
import { GenesisDataStore } from './stores/genesis';
import { StakerStore } from './stores/staker';
import { ModuleConfig, StakerData, TokenMethod } from './types';
import { ValidatorAccount, ValidatorStore } from './stores/validator';
import { NameStore } from './stores/name';
import { isUsername } from './utils';
import { InternalMethod } from './internal_method';

export class PoSMethod extends BaseMethod {
	private _config!: ModuleConfig;
	private _moduleName!: string;
	private _tokenMethod!: TokenMethod;
	private _internalMethod!: InternalMethod;

	public init(
		moduleName: string,
		config: ModuleConfig,
		internalMethod: InternalMethod,
		tokenMethod: TokenMethod,
	) {
		this._moduleName = moduleName;
		this._config = config;
		this._tokenMethod = tokenMethod;
		this._internalMethod = internalMethod;
	}
	public async isNameAvailable(
		methodContext: ImmutableMethodContext,
		name: string,
	): Promise<boolean> {
		const nameSubStore = this.stores.get(NameStore);
		if (name.length > MAX_LENGTH_NAME || name.length < 1 || !isUsername(name)) {
			return false;
		}

		const isRegistered = await nameSubStore.has(methodContext, Buffer.from(name));
		if (isRegistered) {
			return false;
		}

		return true;
	}

	public async getStaker(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<StakerData> {
		const stakerSubStore = this.stores.get(StakerStore);
		const stakerData = await stakerSubStore.get(methodContext, address);

		return stakerData;
	}

	public async getValidator(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<ValidatorAccount> {
		const validatorSubStore = this.stores.get(ValidatorStore);
		const validator = await validatorSubStore.get(methodContext, address);

		return validator;
	}

	public getRoundLength(_methodContext: ImmutableMethodContext): number {
		return this._config.roundLength;
	}

	public getNumberOfActiveValidators(_methodContext: ImmutableMethodContext): number {
		return this._config.numberActiveValidators;
	}

	public async updateSharedRewards(
		context: MethodContext,
		generatorAddress: Buffer,
		tokenID: Buffer,
		reward: bigint,
	): Promise<void> {
		const validatorStore = this.stores.get(ValidatorStore);
		const validator = await validatorStore.get(context, generatorAddress);
		if (validator.totalStake === BigInt(0)) {
			return;
		}

		const { q96 } = math;
		const rewardQ = q96(reward);
		const commissionQ = q96(BigInt(validator.commission));
		const rewardFractionQ = q96(BigInt(1)).sub(commissionQ.div(q96(BigInt(10000))));
		const selfStakeQ = q96(validator.selfStake);
		const totalStakesQ = q96(validator.totalStake);

		const matchingCoefficientIndex = validator.sharingCoefficients.findIndex(coefficient =>
			coefficient.tokenID.equals(tokenID),
		);
		const index =
			matchingCoefficientIndex > -1
				? matchingCoefficientIndex
				: validator.sharingCoefficients.length;
		if (matchingCoefficientIndex < 0) {
			validator.sharingCoefficients[index] = { tokenID, coefficient: q96(BigInt(0)).toBuffer() };
		}

		const oldSharingCoefficient = q96(validator.sharingCoefficients[index].coefficient);
		const sharingCoefficientIncrease = rewardQ.muldiv(rewardFractionQ, totalStakesQ);
		const sharedRewards = sharingCoefficientIncrease.mul(totalStakesQ.sub(selfStakeQ)).ceil();
		// it should not lock more than the original reward. This might happen because of ceil above
		const cappedSharedRewards = sharedRewards > reward ? reward : sharedRewards;

		await this._tokenMethod.lock(
			context,
			generatorAddress,
			this._moduleName,
			tokenID,
			cappedSharedRewards,
		);

		const newSharingCoefficient = oldSharingCoefficient.add(sharingCoefficientIncrease);
		validator.sharingCoefficients[index].coefficient = newSharingCoefficient.toBuffer();

		validator.sharingCoefficients.sort((a, b) => a.tokenID.compare(b.tokenID));
		await validatorStore.set(context, generatorAddress, validator);
	}

	public async isEndOfRound(
		methodContext: ImmutableMethodContext,
		height: number,
	): Promise<boolean> {
		const { height: genesisHeight } = await this.stores
			.get(GenesisDataStore)
			.get(methodContext, EMPTY_KEY);
		return (height - genesisHeight) % this._config.roundLength === 0;
	}

	public async unbanValidator(methodContext: MethodContext, address: Buffer): Promise<void> {
		const validatorSubStore = this.stores.get(ValidatorStore);
		const validator = await validatorSubStore.get(methodContext, address);
		if (!validator.isBanned) {
			return;
		}
		validator.isBanned = false;
		await validatorSubStore.set(methodContext, address, validator);
	}

	public async getLockedStakedAmount(
		ctx: ImmutableMethodContext,
		address: Buffer,
	): Promise<bigint> {
		return this._internalMethod.getLockedStakedAmount(ctx, address);
	}
}
