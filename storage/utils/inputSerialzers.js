/*
 * Copyright © 2018 Lisk Foundation
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

/* eslint-disable no-unused-vars */

module.exports = {
	default: (value, mode, name, fieldName) => `$\{${name}}`,
	booleanToInt: (value, mode, name, fieldName) => `$\{${name}}::int`,
	stringToByte: (value, mode, name, fieldName) =>
		value ? `DECODE($\{${name}}, 'hex')` : 'NULL',
};
