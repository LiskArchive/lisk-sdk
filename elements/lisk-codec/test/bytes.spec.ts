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

import { writeBytes, readBytes } from '../src/bytes';

describe('bytes', () => {
	describe('writer', () => {
		it('should encode bytes', () => {
			const bytes = Buffer.from('abc0', 'hex');
			const lengthInBuffer = Buffer.from([2]);

			expect(writeBytes(bytes)).toEqual(Buffer.concat([lengthInBuffer, bytes]));
		});

		it('should encode empty bytes', () => {
			const bytes = Buffer.alloc(0);
			const lengthInBuffer = Buffer.from([0]);

			expect(writeBytes(bytes)).toEqual(Buffer.concat([lengthInBuffer, bytes]));
		});
	});

	describe('reader', () => {
		it('should decode bytes', () => {
			const bytes = Buffer.from('abc0', 'hex');
			const lengthInBuffer = Buffer.from([2]);
			const data = Buffer.concat([lengthInBuffer, bytes]);

			expect(readBytes(data, 0)).toEqual([bytes, 2 + 1]);
		});

		it('should decode empty bytes', () => {
			const bytes = Buffer.alloc(0);
			const lengthInBuffer = Buffer.from([0]);
			const data = Buffer.concat([lengthInBuffer, bytes]);

			expect(readBytes(data, 0)).toEqual([bytes, 0 + 1]);
		});
	});
});
