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
import { readKey } from '../src/keys';

describe('readKey', () => {
	it('should return fieldNumber and wireType(0) for a given value', () => {
		return expect(readKey(48)).toEqual([6, 0]);
	});

	it('should return fieldNumber and wireType(2) for a given value', () => {
		return expect(readKey(42)).toEqual([5, 2]);
	});

	it('should throw error for unsupported wireType', () => {
		return expect(() => readKey(47)).toThrow('Value yields unsupported wireType');
	});
});
