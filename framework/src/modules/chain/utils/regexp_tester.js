/*
 * Copyright © 2019 Lisk Foundation
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

/**
 * Provide predefined regular expression to test characters with a special meaning
 *
 */
module.exports = {
	/**
	 * Test presence of NULL character in a given string
	 * NULL characters list: ['\0', '\x00', '\u0000', '\U00000000']
	 *
	 * @param {string} string - String to be tested.
	 * @returns {boolean} True is Null character is present in the string. False otherwise.
	 */
	isNullByteIncluded(string) {
		const metacharacter = new RegExp('\\0|\\U00000000');
		return metacharacter.test(string);
	},
};
