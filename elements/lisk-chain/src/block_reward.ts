/*
 * Copyright © 2019 Lisk Foundation
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
import { BlockRewardOptions } from './types';

export const calculateMilestone = (height: number, blockRewardArgs: BlockRewardOptions): number => {
	const distance = Math.floor(blockRewardArgs.distance);

	const location = Math.trunc((height - blockRewardArgs.rewardOffset) / distance);
	const lastMile = blockRewardArgs.milestones[blockRewardArgs.milestones.length - 1];

	if (location > blockRewardArgs.milestones.length - 1) {
		return blockRewardArgs.milestones.lastIndexOf(lastMile);
	}

	return location;
};

export const calculateReward = (height: number, blockRewardArgs: BlockRewardOptions): bigint => {
	if (height < blockRewardArgs.rewardOffset) {
		return BigInt(0);
	}

	return blockRewardArgs.milestones[calculateMilestone(height, blockRewardArgs)];
};
