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
import { defaultConfig } from '../../../../src/modules/dpos_v2/constants';
import { ModuleConfig } from '../../../../src/modules/dpos_v2/types';
import { getModuleConfig, shuffleDelegateList } from '../../../../src/modules/dpos_v2/utils';
import * as delegateShufflingScenario from '../../../fixtures/dpos_delegate_shuffling/uniformly_shuffled_delegate_list.json';

describe('utils', () => {
	describe('shuffleDelegateList', () => {
		const { previousRoundSeed1 } = delegateShufflingScenario.testCases.input;
		const addressList = [...delegateShufflingScenario.testCases.input.delegateList].map(address =>
			Buffer.from(address, 'hex'),
		);
		it('should return a list of uniformly shuffled list of delegates', () => {
			const shuffledDelegateList = shuffleDelegateList(
				Buffer.from(previousRoundSeed1, 'hex'),
				addressList,
			);

			expect(shuffledDelegateList).toHaveLength(addressList.length);
			shuffledDelegateList.forEach(address =>
				expect(addressList.map(a => cryptoAddress.getLisk32AddressFromAddress(a))).toContain(
					cryptoAddress.getLisk32AddressFromAddress(address),
				),
			);

			expect(shuffledDelegateList.map(b => b.toString('hex'))).toEqual(
				delegateShufflingScenario.testCases.output.delegateList,
			);
		});
	});

	describe('getModuleConfig', () => {
		it('converts ModuleConfigJSON to ModuleConfg', () => {
			const expected: ModuleConfig = {
				...defaultConfig,
				minWeightStandby: BigInt(defaultConfig.minWeightStandby),
				tokenIDDPoS: Buffer.from(defaultConfig.tokenIDDPoS, 'hex'),
				tokenIDFee: Buffer.from(defaultConfig.tokenIDFee, 'hex'),
				delegateRegistrationFee: BigInt(defaultConfig.delegateRegistrationFee),
			};

			const actual: ModuleConfig = getModuleConfig(defaultConfig);

			expect(actual).toStrictEqual(expected);
		});
	});
});
