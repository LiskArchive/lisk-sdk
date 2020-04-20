/*
 * Copyright © 2020 Lisk Foundation
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

import { hexToBuffer } from '@liskhq/lisk-cryptography';
import * as delegateShufflingScenario from '../fixtures/dpos_delegate_shuffling/uniformly_shuffled_delegate_list.json';
import { shuffleDelegateList } from '../../src/delegates_list';

describe('dpos.shuffleDelegateList', () => {
	const { previousRoundSeed1 } = delegateShufflingScenario.testCases.input;
	const addressList = [
		...delegateShufflingScenario.testCases.input.delegateList,
	];
	it('should return a list of uniformly shuffled list of delegates', () => {
		const shuffledDelegateList = shuffleDelegateList(
			hexToBuffer(previousRoundSeed1),
			addressList,
		);

		expect(shuffledDelegateList).toHaveLength(addressList.length);
		shuffledDelegateList.forEach(address =>
			expect(addressList).toContain(address),
		);

		expect(shuffledDelegateList).toEqual(
			delegateShufflingScenario.testCases.output.delegateList,
		);
	});
});
