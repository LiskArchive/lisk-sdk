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

import { ImmutableMethodContext, BlockHeader, BlockAssets } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { calculateDefaultReward } from './calculate_reward';
import {
	REWARD_NO_REDUCTION,
	REWARD_REDUCTION_FACTOR_BFT,
	REWARD_REDUCTION_MAX_PREVOTES,
	REWARD_REDUCTION_SEED_REVEAL,
} from './constants';
import { MethodInitArgs, RandomMethod } from './types';

export class RewardMethod extends BaseMethod {
	private _randomMethod!: RandomMethod;
	private _brackets!: ReadonlyArray<bigint>;
	private _offset!: number;
	private _distance!: number;

	public init(args: MethodInitArgs) {
		this._brackets = args.config.brackets;
		this._offset = args.config.offset;
		this._distance = args.config.distance;
	}

	public addDependencies(randomMethod: RandomMethod): void {
		this._randomMethod = randomMethod;
	}

	public async getBlockReward(
		context: ImmutableMethodContext,
		header: BlockHeader,
		assets: BlockAssets,
		impliesMaximalPrevotes: boolean,
	): Promise<[bigint, number]> {
		const defaultReward = calculateDefaultReward({
			height: header.height,
			brackets: this._brackets,
			distance: this._distance,
			offset: this._offset,
		});
		if (defaultReward === BigInt(0)) {
			return [defaultReward, REWARD_NO_REDUCTION];
		}

		const isValidSeedReveal = await this._randomMethod.isSeedRevealValid(
			context,
			header.generatorAddress,
			assets,
		);
		if (!isValidSeedReveal) {
			return [BigInt(0), REWARD_REDUCTION_SEED_REVEAL];
		}

		if (!impliesMaximalPrevotes) {
			return [defaultReward / BigInt(REWARD_REDUCTION_FACTOR_BFT), REWARD_REDUCTION_MAX_PREVOTES];
		}

		return [defaultReward, REWARD_NO_REDUCTION];
	}
}
