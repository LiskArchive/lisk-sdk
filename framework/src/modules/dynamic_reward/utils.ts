/*
 * Copyright © 2023 Lisk Foundation
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

import { ImmutableMethodContext } from '../../state_machine';
import { DECIMAL_PERCENT_FACTOR } from './constants';
import { ModuleConfig, ValidatorsMethod } from './types';

export const getMinimalRewardActiveValidators = (
	moduleConfig: ModuleConfig,
	defaultReward: bigint,
) =>
	(defaultReward * BigInt(moduleConfig.factorMinimumRewardActiveValidators)) /
	DECIMAL_PERCENT_FACTOR;

export const getStakeRewardActiveValidators = async (
	context: ImmutableMethodContext,
	validatorMethod: ValidatorsMethod,
	defaultReward: bigint,
	minimalRewardActiveValidators: bigint,
) => {
	const { validators } = await validatorMethod.getValidatorsParams(context);
	const numberOfActiveValidators = validators.reduce(
		(prev, curr) => (curr.bftWeight > BigInt(0) ? prev + 1 : prev),
		0,
	);
	return BigInt(numberOfActiveValidators) * (defaultReward - minimalRewardActiveValidators);
};
