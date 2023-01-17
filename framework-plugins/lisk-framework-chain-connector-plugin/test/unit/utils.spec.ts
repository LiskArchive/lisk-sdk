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

import { getActiveValidatorsUpdate } from '../../src/active_validators_update';

describe('getActiveValidatorsUpdate', () => {
	const bytesToBuffer = (str: string): Buffer => {
		const val = BigInt(`0b${str}`).toString(16);
		return Buffer.from(`${val.length % 2 === 0 ? val : `0${val}`}`, 'hex');
	};

	const cases = [
		[
			// 2 new validators
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				expected: {
					blsKeysUpdate: [Buffer.from('03', 'hex'), Buffer.from('04', 'hex')],
					bftWeightsUpdate: [BigInt(30), BigInt(40)],
					bftWeightsUpdateBitmap: bytesToBuffer('110'),
				},
			},
		],
		[
			// 2 new validators and update bft weight for existing ones
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(99),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				expected: {
					blsKeysUpdate: [Buffer.from('03', 'hex'), Buffer.from('04', 'hex')],
					bftWeightsUpdate: [BigInt(99), BigInt(30), BigInt(40)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
				},
			},
		],
		[
			// complete new set
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('05', 'hex'),
						bftWeight: BigInt(99),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				expected: {
					blsKeysUpdate: [
						Buffer.from('03', 'hex'),
						Buffer.from('04', 'hex'),
						Buffer.from('05', 'hex'),
					],
					bftWeightsUpdate: [BigInt(0), BigInt(30), BigInt(40), BigInt(99)],
					bftWeightsUpdateBitmap: bytesToBuffer('1111'),
				},
			},
		],
		[
			// complete new set
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: new Array(100).fill(0).map((_, i) => ({
					blsKey: Buffer.from([i + 3]),
					bftWeight: BigInt(i + 10),
				})),
				expected: {
					blsKeysUpdate: new Array(100).fill(0).map((_, i) => Buffer.from([i + 3])),
					bftWeightsUpdate: [BigInt(0), ...new Array(100).fill(0).map((_, i) => BigInt(i + 10))],
					bftWeightsUpdateBitmap: bytesToBuffer('0'.repeat(27) + '1'.repeat(101)),
				},
			},
		],
	];

	it.each(cases)('should compute expected activeValidatorsUpdate', val => {
		expect(getActiveValidatorsUpdate(val.currentValidators, val.newValidators)).toEqual(
			val.expected,
		);
	});
});
