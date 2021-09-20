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

import { ImmutableAPIContext, BlockHeader, BlockAssets } from '../../node/state_machine';
import { BaseAPI } from '../base_api';
import { calculateDefaultReward } from './calculate_reward';
import { REWARD_REDUCTION_FACTOR_BFT } from './constants';
import { APIInitArgs, BFTAPI, RandomAPI } from './types';

export class RewardAPI extends BaseAPI {
	private _bftAPI!: BFTAPI;
	private _randomAPI!: RandomAPI;
	private _brackets!: ReadonlyArray<bigint>;
	private _offset!: number;
	private _distance!: number;

	public init(args: APIInitArgs) {
		this._brackets = args.config.brackets;
		this._offset = args.config.offset;
		this._distance = args.config.distance;
	}

	public addDependencies(bftAPI: BFTAPI, randomAPI: RandomAPI): void {
		this._bftAPI = bftAPI;
		this._randomAPI = randomAPI;
	}

	public async getBlockReward(
		context: ImmutableAPIContext,
		header: BlockHeader,
		assets: BlockAssets,
	): Promise<bigint> {
		const isValidSeedReveal = await this._randomAPI.isValidSeedReveal(
			context,
			header.generatorAddress,
			assets,
		);
		if (!isValidSeedReveal) {
			return BigInt(0);
		}

		const defaultReward = calculateDefaultReward({
			height: header.height,
			brackets: this._brackets,
			distance: this._distance,
			offset: this._offset,
		});

		const impliesMaximalPrevotes = await this._bftAPI.impliesMaximalPrevotes(context, header);
		if (!impliesMaximalPrevotes) {
			return defaultReward / BigInt(REWARD_REDUCTION_FACTOR_BFT);
		}

		return defaultReward;
	}
}
