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

const { TransactionError } = require('@liskhq/lisk-transactions');

/**
 * Converts array of errors into string
 *
 * @class
 * @memberof helpers
 * @param {array | object} e
 * @see Parent: {@link helpers}
 * @todo Add description for the params
 */
// TODO: Move this functionality to logger component
function convertErrorsToString(e) {
	if (Array.isArray(e) && e.length > 0) {
		return e
			.filter(err => err instanceof Error || err instanceof TransactionError)
			.map(error => error.toString())
			.join(', ');
	}

	if (e instanceof Error) {
		return e.toString();
	}

	if (typeof e === 'string') {
		return e;
	}

	return '';
}

module.exports = {
	convertErrorsToString,
};
