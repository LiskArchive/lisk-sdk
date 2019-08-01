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

/* eslint-disable no-unused-vars */

module.exports = {
	defaultInput: (value, mode, alias, fieldName) => `$\{${alias}}`,
	booleanToInt: (value, mode, alias, fieldName) => `$\{${alias}}::int`,
	stringToByte: (value, mode, alias, fieldName) => {
		if (mode === 'select') {
			return `DECODE($\{${alias}}, 'hex')`;
		}

		return value ? `DECODE($\{${alias}}, 'hex')` : 'NULL';
	},
};
