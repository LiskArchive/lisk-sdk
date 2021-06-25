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
 *
 */

import { readBit, writeBit } from '../src/utils';

describe('utils', () => {
	describe('readBit', () => {
		it('should read bits of one byte buffer', () => {
			const binary = '10000101';
			const buffer = Buffer.alloc(1);
			buffer.writeUIntLE(parseInt(binary, 2), 0, 1);

			for (const [index, bit] of binary.split('').entries()) {
				expect(readBit(buffer, 7 - index)).toEqual(bit === '1');
			}
		});

		it('should read bits of two byte buffer', () => {
			const binary = '1010001010000101';
			const buffer = Buffer.alloc(2);
			buffer.writeUIntLE(parseInt(binary, 2), 0, 2);

			for (const [index, bit] of binary.split('').entries()) {
				expect(readBit(buffer, 15 - index)).toEqual(bit === '1');
			}
		});
	});

	describe('writeBit', () => {
		it('should write bit of one byte buffer', () => {
			const binary = '10000101';
			const buffer = Buffer.alloc(1);
			for (const [index, bit] of binary.split('').entries()) {
				writeBit(buffer, 7 - index, bit === '1');
			}
			const result = buffer.readUIntLE(0, 1).toString(2).padStart(8, '0');

			expect(result).toEqual(binary);
		});

		it('should write bits of two byte buffer', () => {
			const binary = '1010001010000101';
			const buffer = Buffer.alloc(2);
			for (const [index, bit] of binary.split('').entries()) {
				writeBit(buffer, 15 - index, bit === '1');
			}
			const result = buffer.readUIntLE(0, 2).toString(2).padStart(16, '0');

			expect(result).toEqual(binary);
		});
	});
});
