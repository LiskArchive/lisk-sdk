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

import { ModuleEndpointContext } from '../..';
import { BaseEndpoint } from '../base_endpoint';
import { DefaultReward, EndpointInitArgs, GetDefaultRewardParams } from './types';

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
		const { height } = (ctx.params as unknown) as GetDefaultRewardParams;

		if (height < this._offset) {
			return {
				reward: '0',
			};
		}

		const distance = Math.floor(this._distance);
		const location = Math.trunc((height - this._offset) / distance);
		const lastBracket = this._brackets[this._brackets.length - 1];

		let bracket;
		if (location > this._brackets.length - 1) {
			bracket = this._brackets.lastIndexOf(lastBracket);
		} else {
			bracket = location;
		}

		return {
			reward: this._brackets[bracket].toString(),
		};
	}
}
