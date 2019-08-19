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

class CommonBlockError extends Error {
	constructor(message, lastBlockId) {
		super(message);
		this.lastBlockId = lastBlockId;
	}
}

/**
 * Converts array of errors into string
 *
 * @class
 * @memberof utils
 * @param {array | object} errors
 * @see Parent: {@link utils}
 * @todo Add description for the params
 */
// TODO: Move this functionality to logger component
function convertErrorsToString(errors) {
	if (Array.isArray(errors) && errors.length > 0) {
		return errors
			.filter(e => e instanceof Error)
			.map(error => error.toString())
			.join(', ');
	}

	if (errors instanceof Error) {
		return errors.toString();
	}

	if (typeof errors === 'string') {
		return errors;
	}

	return '';
}

module.exports = {
	CommonBlockError,
	convertErrorsToString,
};
