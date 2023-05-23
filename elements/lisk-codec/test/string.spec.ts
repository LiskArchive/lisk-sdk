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

import { writeBytes } from '../src/bytes';
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

		describe('invalid utf-8 code', () => {
			const testCases = [
				// Valid sequences
				{ input: [0x00], expected: true }, // 1-byte sequence
				{ input: [0x7f], expected: true }, // 1-byte sequence (max value)
				{ input: [0xc2, 0x80], expected: true }, // 2-byte sequence
				{ input: [0xdf, 0xbf], expected: true }, // 2-byte sequence (max value)
				{ input: [0xe0, 0xa0, 0x80], expected: true }, // 3-byte sequence
				{ input: [0xef, 0xbf, 0xbf], expected: true }, // 3-byte sequence (max value)
				{ input: [0xf0, 0x90, 0x80, 0x80], expected: true }, // 4-byte sequence U+10FFFF
				{ input: [0xf4, 0x8f, 0xbf, 0xbf], expected: true }, // 4-byte sequence (max value)

				// Invalid sequences
				{ input: [0x80], expected: false }, // standalone continuation byte
				{ input: [0xbf], expected: false }, // standalone continuation byte (max value)
				{ input: [0xc0, 0x80], expected: false }, // overlong encoding (2-byte sequence)
				{ input: [0xe0, 0x80, 0x80], expected: false }, // overlong encoding (3-byte sequence)
				{ input: [0xf0, 0x80, 0x80, 0x80], expected: false }, // overlong encoding (4-byte sequence)
				{ input: [0xc1, 0xbf], expected: false }, // overlong encoding (2-byte sequence, max value)
				{ input: [0xe0, 0x9f, 0xbf], expected: false }, // overlong encoding (3-byte sequence, max value)
				{ input: [0xf0, 0x8f, 0xbf, 0xbf], expected: false }, // overlong encoding (4-byte sequence, max value)
				{ input: [0xc2], expected: false }, // missing continuation byte (2-byte sequence)
				{ input: [0xe0, 0xa0], expected: false }, // missing continuation byte (3-byte sequence)
				{ input: [0xf0, 0x90, 0x80], expected: false }, // missing continuation byte (4-byte sequence)
				{ input: [0xc2, 0xc0], expected: false }, // invalid continuation byte (2-byte sequence)
				{ input: [0xe0, 0xa0, 0xc0], expected: false }, // invalid continuation byte (3-byte sequence)
				{ input: [0xf0, 0x90, 0x80, 0xc0], expected: false }, // invalid continuation byte (4-byte sequence)
			];
			it.each(testCases)('given $input should return $expected', ({ input, expected }) => {
				const buffer = Buffer.from(input);
				const inputBytes = writeBytes(buffer);
				if (expected) {
					expect(() => readString(inputBytes, 0)).not.toThrow();
				} else {
					expect(() => readString(inputBytes, 0)).toThrow(
						'The encoded data was not valid for encoding utf-8',
					);
				}
			});
		});

		describe('unnormalized utf-8 code', () => {
			const testCases = [
				// Valid sequences (NFC)
				{ input: 'Amélie'.normalize('NFC'), expected: true }, // "Amélie" in composed form (NFC)
				{ input: 'Ame\u0301lie', expected: false }, // "Amélie" in decomposed form (NFD)

				// Invalid sequences (NFD)
				{ input: 'Straße'.normalize('NFC'), expected: true }, // "Straße" in composed form (NFC)
				{ input: 'Strasse\u0308', expected: false }, // "Straße" in decomposed form (NFD)

				// Examples of other languages (These languages have characters that can be decomposed)
				// Korean: "한국어" (Composed vs Decomposed)
				{ input: '한국어'.normalize('NFC'), expected: true }, // composed form (NFC)
				{ input: '한국어'.normalize('NFD'), expected: false }, // decomposed form (NFD)

				// Japanese: "が" (Composed vs Decomposed)
				{ input: 'が'.normalize('NFC'), expected: true }, // composed form (NFC)
				{ input: 'が'.normalize('NFD'), expected: false }, // decomposed form (NFD)

				// Russian: "Ё" (Composed vs Decomposed)
				{ input: 'Ё'.normalize('NFC'), expected: true }, // composed form (NFC)
				{ input: 'Ё'.normalize('NFD'), expected: false }, // decomposed form (NFD)
			];

			it.each(testCases)('given $input should return $expected', ({ input, expected }) => {
				const inputBytes = writeBytes(Buffer.from(input, 'utf-8'));
				if (expected) {
					expect(() => readString(inputBytes, 0)).not.toThrow();
				} else {
					expect(() => readString(inputBytes, 0)).toThrow(
						'UTF8 bytes include non-normalized bytes',
					);
				}
			});
		});
	});
});
