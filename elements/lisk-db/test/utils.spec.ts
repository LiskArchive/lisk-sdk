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

import { formatInt, getFirstPrefix, getLastPrefix } from '../src/utils';

describe('utils', () => {
	describe('formatInt', () => {
		describe('when bigint is provided', () => {
			it('should return string which can be sorted lexicographically', () => {
				const str1 = formatInt(BigInt(100));
				const str2 = formatInt(BigInt(10));
				const str3 = formatInt(BigInt(11));
				const stringArray = [str1, str2, str3];
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				stringArray.sort();
				expect(Buffer.from(stringArray[0], 'binary').toString('hex')).toEqual(
					'000000000000000a',
				);
				expect(Buffer.from(stringArray[1], 'binary').toString('hex')).toEqual(
					'000000000000000b',
				);
				expect(Buffer.from(stringArray[2], 'binary').toString('hex')).toEqual(
					'0000000000000064',
				);
			});
		});

		describe('when number is provided', () => {
			it('should return string which can be sorted lexicographically', () => {
				const str1 = formatInt(100);
				const str2 = formatInt(10);
				const str3 = formatInt(11);
				const stringArray = [str1, str2, str3];
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				stringArray.sort();
				expect(Buffer.from(stringArray[0], 'binary').toString('hex')).toEqual(
					'0000000a',
				);
				expect(Buffer.from(stringArray[1], 'binary').toString('hex')).toEqual(
					'0000000b',
				);
				expect(Buffer.from(stringArray[2], 'binary').toString('hex')).toEqual(
					'00000064',
				);
			});
		});
	});

	describe('getFirstPrefix', () => {
		it('should return string which is the next ascii string by binary', () => {
			const prefix = 'block:id';
			const defaultKey =
				'0000000000000000000000000000000000000000000000000000000000000000';
			const startPrefix = getFirstPrefix(prefix);
			// start prefix should come before the expected value
			expect(
				`${prefix}:${defaultKey}`.localeCompare(startPrefix, 'en'),
			).toEqual(1);
			// start prefix should come after the expected value
			expect(`block:ic:${defaultKey}`.localeCompare(startPrefix, 'en')).toEqual(
				-1,
			);
		});
	});

	describe('getLastPrefix', () => {
		it('should return next ascii string by binary', () => {
			const prefix = 'block:id';
			const defaultKey =
				'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
			const endPrefix = getLastPrefix(prefix);
			// end prefix should come after the expected value
			expect(`${prefix}:${defaultKey}`.localeCompare(endPrefix, 'en')).toEqual(
				-1,
			);
			// end prefix should come before the expected value
			expect(`block:iz:${defaultKey}`.localeCompare(endPrefix, 'en')).toEqual(
				1,
			);
		});
	});
});
