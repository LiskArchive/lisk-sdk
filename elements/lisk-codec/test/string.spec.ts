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
			const message = Buffer.from('my-string', 'utf8');
			const lengthInBuffer = Buffer.from([message.length]);
			const data = Buffer.concat([lengthInBuffer, message]);

			expect(writeString('my-string')).toEqual(data);
		});

		it('should encode empty string', () => {
			const message = Buffer.from('', 'utf8');
			const lengthInBuffer = Buffer.from([message.length]);
			const data = Buffer.concat([lengthInBuffer, message]);

			expect(writeString('')).toEqual(data);
		});
	});

	describe('reader', () => {
		it('should decode string', () => {
			const message = Buffer.from('my-string', 'utf8');
			const lengthInBuffer = Buffer.from([message.length]);
			const data = Buffer.concat([lengthInBuffer, message]);

			expect(readString(data, 0)).toEqual(['my-string', message.length + 1]);
		});

		it('should decode empty string', () => {
			const message = Buffer.from('', 'utf8');
			const lengthInBuffer = Buffer.from([message.length]);
			const data = Buffer.concat([lengthInBuffer, message]);

			expect(readString(data, 0)).toEqual(['', message.length + 1]);
		});
	});
});
