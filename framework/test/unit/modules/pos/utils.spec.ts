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

import { math } from '@liskhq/lisk-utils';
import { defaultConfig, TOKEN_ID_LENGTH } from '../../../../src/modules/pos/constants';
import {
	ModuleConfig,
	ModuleConfigJSON,
	StakeSharingCoefficient,
} from '../../../../src/modules/pos/types';
import { calculateStakeRewards, getModuleConfig } from '../../../../src/modules/pos/utils';

const { q96 } = math;

describe('utils', () => {
	describe('getModuleConfig', () => {
		it('converts ModuleConfigJSON to ModuleConfig', () => {
			const expected: ModuleConfig = {
				...defaultConfig,
				roundLength: defaultConfig.numberActiveValidators + defaultConfig.numberStandbyValidators,
				minWeightStandby: BigInt(defaultConfig.minWeightStandby),
				posTokenID: Buffer.alloc(TOKEN_ID_LENGTH),
				validatorRegistrationFee: BigInt(defaultConfig.validatorRegistrationFee),
				baseStakeAmount: BigInt(defaultConfig.baseStakeAmount),
				reportMisbehaviorReward: BigInt(defaultConfig.reportMisbehaviorReward),
				weightScaleFactor: BigInt(defaultConfig.weightScaleFactor),
			};

			const actual: ModuleConfig = getModuleConfig({
				...defaultConfig,
				posTokenID: '00'.repeat(TOKEN_ID_LENGTH),
			} as ModuleConfigJSON);

			expect(actual).toStrictEqual(expected);
		});
	});

	describe('calculateStakeRewards', () => {
		const validatorSharingCoefficient: StakeSharingCoefficient = {
			tokenID: Buffer.alloc(TOKEN_ID_LENGTH),
			coefficient: q96(100).toBuffer(),
		};

		const stakeSharingCoefficient: StakeSharingCoefficient = {
			tokenID: Buffer.alloc(TOKEN_ID_LENGTH),
			coefficient: q96(10).toBuffer(),
		};

		const amount = BigInt(10);

		it('should calculate the stake reward', () => {
			const qAmount = q96(amount);

			const qStakeSharingCoefficient = q96(stakeSharingCoefficient.coefficient);
			const qValidatorSharingCoefficient = q96(validatorSharingCoefficient.coefficient);
			const expectedReward = qValidatorSharingCoefficient
				.sub(qStakeSharingCoefficient)
				.mul(qAmount)
				.floor();

			const reward = calculateStakeRewards(
				stakeSharingCoefficient,
				amount,
				validatorSharingCoefficient,
			);

			expect(reward).toEqual(expectedReward);
		});
	});
});
