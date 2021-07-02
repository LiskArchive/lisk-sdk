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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import {
	sortByBitmapAndKey,
	binaryStringToBuffer,
	bufferToBinaryString,
	areSiblingQueries,
} from '../../src/sparse_merkle_tree/utils';
import { InclusionProofQuery } from '../../src/sparse_merkle_tree/types';

const binarySampleData = [
	{ str: '101', buf: '05' },
	{ str: '11111111', buf: 'FF' },
	{ str: '11111111', buf: 'FF' },
	{ str: '100000000', buf: '0100' },
	{ str: '10101001101100', buf: '2A6C' },
	{ str: '1111110010101001101100', buf: '3F2A6C' },
];

const createQueryObject = ({
	key,
	value,
	bitmap,
}: {
	key: string;
	value: string;
	bitmap: string;
}): InclusionProofQuery => ({
	key: Buffer.from(key, 'hex'),
	value: Buffer.from(value, 'hex'),
	bitmap: Buffer.from(bitmap, 'hex'),
});

describe('utils', () => {
	describe('sortByBitmapAndKey', () => {
		it('should sort by longest bitmap', () => {
			const res1: InclusionProofQuery = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(1),
			};

			const res2: InclusionProofQuery = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});

		it('should sort by longest bitmap breaking tie with smaller key', () => {
			const res1: InclusionProofQuery = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			const res2: InclusionProofQuery = {
				key: getRandomBytes(1),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});

		it('should not effect sorting if same byte length of key and bitmap are same', () => {
			const res1: InclusionProofQuery = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			const res2: InclusionProofQuery = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res1, res2]);
		});
	});

	describe.only('areSiblingQueries', () => {
		it('should return true for valid sibling queries', () => {
			// These values are generate from specs for keys "11101101" and "11100001"
			expect(
				areSiblingQueries(
					createQueryObject({ key: 'ed', value: 'f3df1f9c', bitmap: '17' }),
					createQueryObject({ key: 'e1', value: 'f031efa5', bitmap: '17' }),
					1,
				),
			).toBeTrue();
		});

		it('should return true for valid sibling queries even if swapped', () => {
			// These values are generate from specs for keys "11101101" and "11100001"
			expect(
				areSiblingQueries(
					createQueryObject({ key: 'e1', value: 'f031efa5', bitmap: '17' }),
					createQueryObject({ key: 'ed', value: 'f3df1f9c', bitmap: '17' }),
					1,
				),
			).toBeTrue();
		});

		it('should return false for invalid sibling queries', () => {
			// These values are generate from specs for keys "00110011" and "01101100"
			expect(
				areSiblingQueries(
					createQueryObject({ key: '33', value: '4e074085', bitmap: '17' }),
					createQueryObject({ key: '6c', value: 'acac86c0', bitmap: '1f' }),
					1,
				),
			).toBeFalse();
		});

		it('should return false for invalid sibling queries even if swapped', () => {
			// These values are generate from specs for keys "00110011" and "01101100"
			expect(
				areSiblingQueries(
					createQueryObject({ key: '6c', value: 'acac86c0', bitmap: '1f' }),
					createQueryObject({ key: '33', value: '4e074085', bitmap: '17' }),
					1,
				),
			).toBeFalse();
		});
	});

	describe('binaryStringToBuffer', () => {
		it.each(binarySampleData)('should convert binary string "%o" to correct buffer value', data => {
			expect(binaryStringToBuffer(data.str)).toEqual(Buffer.from(data.buf, 'hex'));
		});
	});

	describe('bufferToBinaryString', () => {
		it.each(binarySampleData)('should convert buffer "%o" to correct binary string', data => {
			expect(bufferToBinaryString(Buffer.from(data.buf, 'hex'))).toEqual(data.str);
		});
	});
});
