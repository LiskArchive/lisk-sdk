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
import { testCases } from '../fixtures/string_encodings.json';

describe('string', () => {
	describe('writer', () => {
		it('should encode string', () => {
			const {
				input: {
					object: { data: message },
				},
				output: { value },
			} = testCases[0];
			const binaryData = writeString(message);

			// Same encoding of string
			expect(binaryData.toString('hex')).toEqual(value.substring(2));
			// No change of string
			expect(binaryData.toString().substring(1)).toEqual(message);
		});

		it('should encode empty string', () => {
			const {
				input: {
					object: { data: message },
				},
				output: { value },
			} = testCases[1];
			const binaryData = writeString(message);

			expect(binaryData.toString('hex')).toBe(value.substring(2));
		});
	});

	describe('reader', () => {
		it('should decode string', () => {
			const {
				input: {
					object: { data: message },
				},
			} = testCases[0];
			expect(readString(writeString(message), 0)).toEqual([
				message,
				message.length + 1, // Add 1 for the size of this string
			]);
		});
	});

	it('should decode empty string', () => {
		const {
			input: {
				object: { data: message },
			},
		} = testCases[1];
		expect(readString(writeString(message), 0)).toEqual([
			message,
			message.length + 1, // Add 1 for the size of this string
		]);
	});
});
