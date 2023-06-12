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

import { bitwiseXOR } from '../../../../src/modules/random/utils';
import { bitwiseXORFixtures } from './bitwise_xor_fixtures';

describe('Random module utils', () => {
	describe('bitwiseXOR', () => {
		it('should return the first element if there are no other elements', () => {
			const buffer = Buffer.from([0, 1, 1, 1]);
			const input = [buffer];

			expect(bitwiseXOR(input)).toEqual(buffer);
		});

		it.each(bitwiseXORFixtures)('should return correct XOR value', ({ input, output }) => {
			expect(bitwiseXOR(input)).toEqual(output);
		});

		it('should throw if input elements have different length', () => {
			const input = [Buffer.from([0, 1, 1, 1]), Buffer.from([0, 0, 0, 1, 0])];

			expect(() => bitwiseXOR(input)).toThrow('All input for XOR should be same size');
		});
	});
});
