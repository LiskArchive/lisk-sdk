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
import { DefaultReward, EndpointInitArgs } from './types';

export class RewardEndpoint extends BaseEndpoint {
	private _brackets!: ReadonlyArray<bigint>;
	private _offset!: number;
	private _distance!: number;

	public init(args: EndpointInitArgs) {
		this._brackets = args.config.brackets;
		this._offset = args.config.offset;
		this._distance = args.config.distance;
	}

	public getDefaultRewardAtHeight(ctx: ModuleEndpointContext): DefaultReward {
		const { height } = ctx.params;

		if (typeof height !== 'number') {
			throw new Error('Parameter height must be a number.');
		}

		if (height < 0) {
			throw new Error('Parameter height cannot be smaller than 0.');
		}

		const reward = calculateDefaultReward({
			height,
			brackets: this._brackets,
			distance: this._distance,
			offset: this._offset,
		});

		return { reward: reward.toString() };
	}
}
