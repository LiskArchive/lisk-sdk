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
import { writeString, readString } from '../src/string';

describe('string', () => {
	describe('writer', () => {
		it('should encode string', () => {
			expect(writeString('lisk', { dataType: 'string' })).toEqual(
				Buffer.from('lisk', 'utf8'),
			);
			expect(writeString('>!test@123test#', { dataType: 'string' })).toEqual(
				Buffer.from('>!test@123test#', 'utf8'),
			);
		});
	});

	describe('reader', () => {
		it('should decode string', () => {
			expect(
				readString(Buffer.from('lisk', 'utf8'), { dataType: 'string' }),
			).toEqual('lisk');
			expect(
				readString(Buffer.from('>!test@123test#', 'utf8'), {
					dataType: 'string',
				}),
			).toEqual('>!test@123test#');
		});
	});
});
