/*
 * Copyright © 2022 Lisk Foundation
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

import { BFTValidator } from 'lisk-sdk';
import { getActiveValidatorsDiff } from '../../src/utils';

describe('getActiveValidatorsDiff', () => {
	it('should aggregate new validators not existing in existing validators', () => {
		const currentValidators: BFTValidator[] = [
			{
				blsKey: Buffer.from('02', 'hex'),
				bftWeight: BigInt(20),
				address: Buffer.from('bb', 'hex'),
			},
		];

		const newValidators: BFTValidator[] = [
			{
				blsKey: Buffer.from('02', 'hex'),
				bftWeight: BigInt(20),
				address: Buffer.from('bb', 'hex'),
			},
			{
				blsKey: Buffer.from('03', 'hex'),
				bftWeight: BigInt(30),
				address: Buffer.from('cc', 'hex'),
			},
			{
				blsKey: Buffer.from('04', 'hex'),
				bftWeight: BigInt(40),
				address: Buffer.from('dd', 'hex'),
			},
		];

		const expectedValidators: BFTValidator[] = [
			{
				blsKey: Buffer.from('03', 'hex'),
				bftWeight: BigInt(30),
				address: Buffer.from('cc', 'hex'),
			},
			{
				blsKey: Buffer.from('04', 'hex'),
				bftWeight: BigInt(40),
				address: Buffer.from('dd', 'hex'),
			},
		];

		const actualValidators = getActiveValidatorsDiff(currentValidators, newValidators);

		expect(actualValidators).toStrictEqual(expectedValidators);
	});

	it('should aggregate existing validators having blsKey not existing in new validators with bftWeight set to 0 and aggregating the new validator as well', () => {
		const currentValidators: BFTValidator[] = [
			{
				blsKey: Buffer.from('01', 'hex'),
				bftWeight: BigInt(10),
				address: Buffer.from('aa', 'hex'),
			},
			{
				blsKey: Buffer.from('02', 'hex'),
				bftWeight: BigInt(20),
				address: Buffer.from('bb', 'hex'),
			},
		];

		const newValidators: BFTValidator[] = [
			{
				blsKey: Buffer.from('02', 'hex'),
				bftWeight: BigInt(10),
				address: Buffer.from('bb', 'hex'),
			},
		];

		const expectedValidators: BFTValidator[] = [
			{
				blsKey: Buffer.from('02', 'hex'),
				bftWeight: BigInt(10),
				address: Buffer.from('bb', 'hex'),
			},
			{
				blsKey: Buffer.from('01', 'hex'),
				bftWeight: BigInt(0),
				address: Buffer.from('aa', 'hex'),
			},
		];

		const actualValidators = getActiveValidatorsDiff(currentValidators, newValidators);

		expect(actualValidators).toStrictEqual(expectedValidators);
	});
});
