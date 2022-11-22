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

import { ModuleConfig } from './types';

export const calculateDefaultReward = (config: ModuleConfig, height: number): bigint => {
	if (height < config.offset) {
		return BigInt(0);
	}

	const rewardDistance = Math.floor(config.distance);
	const location = Math.trunc((height - config.offset) / rewardDistance);
	const lastBracket = config.brackets[config.brackets.length - 1];

	const bracket =
		location > config.brackets.length - 1 ? config.brackets.lastIndexOf(lastBracket) : location;

	return config.brackets[bracket];
};
