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
import { writeBoolean, readBoolean } from '../src/boolean';

describe('boolean', () => {
	describe('writer', () => {
		it('should encode boolean', () => {
			expect(writeBoolean(true)).toEqual(Buffer.from('01', 'hex'));
			expect(writeBoolean(false)).toEqual(Buffer.from('00', 'hex'));
		});
	});

	describe('reader', () => {
		it('should decode boolean', () => {
			expect(readBoolean(Buffer.from('00', 'hex'), 0)).toEqual([false, 1]);
			expect(readBoolean(Buffer.from('01', 'hex'), 0)).toEqual([true, 1]);
		});
	});
});
