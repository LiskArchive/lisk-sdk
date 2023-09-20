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
import { configSchema as rewardConfigSchema } from '../reward/schemas';

export const configSchema = {
	$id: '/dynamicReward/config',
	type: 'object',
	properties: {
		...rewardConfigSchema.properties,
		factorMinimumRewardActiveValidators: {
			type: 'integer',
			minimum: 1,
		},
	},
	required: [...rewardConfigSchema.required, 'factorMinimumRewardActiveValidators'],
};

export const getExpectedValidatorRewardsRequestSchema = {
	$id: '/dynamicReward/endpoint/getExpectedValidatorRewardsRequestSchema',
	type: 'object',
	required: ['validatorAddress'],
	properties: {
		validatorAddress: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

export const getExpectedValidatorRewardsResponseSchema = {
	$id: '/dynamicReward/endpoint/getExpectedValidatorRewardsResponseSchema',
	type: 'object',
	required: ['blockReward', 'dailyReward', 'monthlyReward', 'yearlyReward'],
	properties: {
		blockReward: {
			type: 'string',
		},
		dailyReward: {
			type: 'string',
		},
		monthlyReward: {
			type: 'string',
		},
		yearlyReward: {
			type: 'string',
		},
	},
};
