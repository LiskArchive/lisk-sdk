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
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { math } from '@liskhq/lisk-utils';
import { defaultConfig, TOKEN_ID_LENGTH } from '../../../../src/modules/pos/constants';
import { ModuleConfig, StakeSharingCoefficient } from '../../../../src/modules/pos/types';
import {
	calculateStakeRewards,
	getModuleConfig,
	shuffleValidatorList,
} from '../../../../src/modules/pos/utils';
import * as validatorShufflingScenario from '../../../fixtures/pos_validator_shuffling/uniformly_shuffled_validator_list.json';

const { q96 } = math;

describe('utils', () => {
	describe('shuffleValidatorList', () => {
		const { previousRoundSeed1 } = validatorShufflingScenario.testCases.input;
		const addressList = [...validatorShufflingScenario.testCases.input.validatorList].map(
			address => ({
				address: Buffer.from(address, 'hex'),
				weight: BigInt(1),
			}),
		);
		it('should return a list of uniformly shuffled list of validators', () => {
			const shuffledValidatorList = shuffleValidatorList(
				Buffer.from(previousRoundSeed1, 'hex'),
				addressList,
			);

			expect(shuffledValidatorList).toHaveLength(addressList.length);
			shuffledValidatorList.forEach(validator =>
				expect(
					addressList.map(a => cryptoAddress.getLisk32AddressFromAddress(a.address)),
				).toContain(cryptoAddress.getLisk32AddressFromAddress(validator.address)),
			);

			expect(shuffledValidatorList.map(b => b.address.toString('hex'))).toEqual(
				validatorShufflingScenario.testCases.output.validatorList,
			);
		});
	});

	describe('getModuleConfig', () => {
		it('converts ModuleConfigJSON to ModuleConfg', () => {
			const expected: ModuleConfig = {
				...defaultConfig,
				minWeightStandby: BigInt(defaultConfig.minWeightStandby),
				posTokenID: Buffer.alloc(TOKEN_ID_LENGTH),
				tokenIDFee: Buffer.from(defaultConfig.tokenIDFee, 'hex'),
				validatorRegistrationFee: BigInt(defaultConfig.validatorRegistrationFee),
			};

			const actual: ModuleConfig = getModuleConfig({
				...defaultConfig,
				posTokenID: '0000000000000000',
			});

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
