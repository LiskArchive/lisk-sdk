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

'use strict';

const regexpTester = require('../../../../../../../src/application/node/utils/regexp_tester');

describe('isNullByteIncluded', () => {
	const validStrings = [
		'lorem ipsum',
		'lorem\u0001 ipsum',
		'loremU00000001 ipsum',
		'\u0001',
		'\x01',
		'l©rem',
		'❤',
		'\\U00000000',
		'\\U00000000lorem',
		'ipsum\\U00000000',
		'lorem\\U00000000 ipsum',
	];

	const invalidStrings = [
		'\0',
		'\0lorem',
		'ipsum\0',
		'lorem\0 ipsum',
		'\x00',
		'\x00lorem',
		'ipsum\x00',
		'lorem\x00 ipsum',
		'\u0000',
		'\u0000lorem',
		'ipsum\u0000',
		'lorem\u0000 ipsum',
		'\x00',
		'\x00 null',
	];

	describe('without null characters', () => {
		it.each(validStrings)(
			'should return false for strings without null character: %o',
			item => {
				expect(regexpTester.isNullByteIncluded(item)).toBeFalse();
			},
		);
	});

	describe('with null characters', () => {
		it.each(invalidStrings)(
			'should return true for strings with null character: %o',
			item => {
				expect(regexpTester.isNullByteIncluded(item)).toBeTrue();
			},
		);
	});
});
