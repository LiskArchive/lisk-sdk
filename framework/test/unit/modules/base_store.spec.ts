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

import { computeSubstorePrefix } from '../../../src/modules/base_store';

describe('BaseStore', () => {
	describe('computeSubstorePrefix', () => {
		const cases = [
			[{ index: 0, expected: Buffer.from([0x00, 0x00]) }],
			[{ index: 1, expected: Buffer.from([0x80, 0x00]) }],
			[{ index: 2, expected: Buffer.from([0x40, 0x00]) }],
			[{ index: 3, expected: Buffer.from([0xc0, 0x00]) }],
			[{ index: 4, expected: Buffer.from([0x20, 0x00]) }],
			[{ index: 5, expected: Buffer.from([0xa0, 0x00]) }],
			[{ index: 6, expected: Buffer.from([0x60, 0x00]) }],
			[{ index: 7, expected: Buffer.from([0xe0, 0x00]) }],
			[{ index: 8, expected: Buffer.from([0x10, 0x00]) }],
			[{ index: 9, expected: Buffer.from([0x90, 0x00]) }],
			[{ index: 10, expected: Buffer.from([0x50, 0x00]) }],
			[{ index: 11, expected: Buffer.from([0xd0, 0x00]) }],
		];

		it.each(cases)('should produce expected key', ({ index, expected }) => {
			expect(computeSubstorePrefix(index)).toEqual(expected);
		});
	});
});
