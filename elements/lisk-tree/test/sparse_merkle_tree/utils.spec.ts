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
