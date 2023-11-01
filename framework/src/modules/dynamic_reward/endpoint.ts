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
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { ModuleEndpointContext } from '../../types';
import { RewardEndpoint } from '../reward/endpoint';
import {
	GetExpectedValidatorRewardsResponse,
	ModuleConfig,
	PoSMethod,
	ValidatorsMethod,
} from './types';
import { calculateDefaultReward } from '../reward/calculate_reward';
import { getMinimalRewardActiveValidators, getStakeRewardActiveValidators } from './utils';

export class DynamicRewardEndpoint extends RewardEndpoint {
	private _validatorMethod!: ValidatorsMethod;
	private _posMethod!: PoSMethod;

	protected _config!: ModuleConfig;

	public init(config: ModuleConfig, blockTime: number) {
		super.init(config, blockTime);
		this._config = config;
	}

	public addDependencies(validatorMethod: ValidatorsMethod, posMethod: PoSMethod) {
		this._validatorMethod = validatorMethod;
		this._posMethod = posMethod;
	}

	public async getExpectedValidatorRewards(
		context: ModuleEndpointContext,
	): Promise<GetExpectedValidatorRewardsResponse> {
		const { validatorAddress } = context.params;

		if (typeof validatorAddress !== 'string') {
			throw new Error('Parameter validatorAddress must be a string.');
		}
		cryptoAddress.validateLisk32Address(validatorAddress);

		const address = cryptoAddress.getAddressFromLisk32Address(validatorAddress);
		const validatorParams = await this._validatorMethod.getValidatorsParams(context);
		const totalBFTWeight = validatorParams.validators.reduce(
			(prev, curr) => prev + curr.bftWeight,
			BigInt(0),
		);
		const validator = validatorParams.validators.find(v => v.address.equals(address));
		if (!validator) {
			return {
				blockReward: '0',
				dailyReward: '0',
				monthlyReward: '0',
				yearlyReward: '0',
			};
		}

		const defaultReward = calculateDefaultReward(this._config, context.header.height);
		const minimalRewardActiveValidators = getMinimalRewardActiveValidators(
			this._config,
			defaultReward,
		);
		const stakeRewardActiveValidators = await getStakeRewardActiveValidators(
			context,
			this._validatorMethod,
			defaultReward,
			minimalRewardActiveValidators,
		);

		const additionalReward = (validator.bftWeight * stakeRewardActiveValidators) / totalBFTWeight;

		const blockReward =
			validator.bftWeight > BigInt(0)
				? minimalRewardActiveValidators + additionalReward
				: defaultReward;

		const roundLength = this._posMethod.getRoundLength(context);
		const rewardPerSec = blockReward / BigInt(roundLength * this._blockTime);

		return {
			blockReward: blockReward.toString(),
			dailyReward: (BigInt(86400) * rewardPerSec).toString(),
			monthlyReward: (BigInt(2592000) * rewardPerSec).toString(),
			yearlyReward: (BigInt(31536000) * rewardPerSec).toString(),
		};
	}
}
