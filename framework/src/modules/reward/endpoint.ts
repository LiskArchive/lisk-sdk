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

import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { calculateDefaultReward } from './calculate_reward';
import { DefaultReward, InflationRate, ModuleConfig } from './types';

export class RewardEndpoint extends BaseEndpoint {
	protected _config!: ModuleConfig;
	private _blockTime!: number;

	public init(config: ModuleConfig, blockTime: number) {
		this._config = config;
		this._blockTime = blockTime;
	}

	public getDefaultRewardAtHeight(context: ModuleEndpointContext): DefaultReward {
		const { height } = context.params;

		if (typeof height !== 'number') {
			throw new Error('Parameter height must be a number.');
		}

		if (height < 0) {
			throw new Error('Parameter height cannot be smaller than 0.');
		}

		const reward = calculateDefaultReward(this._config, height);

		return { reward: reward.toString() };
	}

	public getRewardTokenID(): { tokenID: string } {
		return { tokenID: this._config.tokenID.toString('hex') };
	}

	public getAnnualInflationRate(context: ModuleEndpointContext): InflationRate {
		const reward = BigInt(this.getDefaultRewardAtHeight(context).reward);
		const blocksPerYear = BigInt(Math.floor((365 * 24 * 60 * 60) / this._blockTime));
		const rate = blocksPerYear * reward;

		return { tokenID: this._config.tokenID.toString('hex'), rate: rate.toString() };
	}
}
