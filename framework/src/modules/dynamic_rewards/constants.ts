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

import { defaultConfig as rewardDefaultConfig } from '../reward/constants';

export const EMPTY_BYTES = Buffer.alloc(0);
export const defaultConfig = {
	...rewardDefaultConfig,
	factorMinimumRewardActiveValidators: 1000,
};
export const DECIMAL_PERCENT_FACTOR = BigInt(10000);
export const CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD = 'CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD';
export const CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION =
	'CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION';
