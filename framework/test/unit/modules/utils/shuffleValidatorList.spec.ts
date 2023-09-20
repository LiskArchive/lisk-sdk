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

import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import * as validatorShufflingScenario from '../../../fixtures/pos_validator_shuffling/uniformly_shuffled_validator_list.json';
import { shuffleValidatorList } from '../../../../src/modules/utils';

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
			expect(addressList.map(a => cryptoAddress.getLisk32AddressFromAddress(a.address))).toContain(
				cryptoAddress.getLisk32AddressFromAddress(validator.address),
			),
		);

		expect(shuffledValidatorList.map(b => b.address.toString('hex'))).toEqual(
			validatorShufflingScenario.testCases.output.validatorList,
		);
	});
});
