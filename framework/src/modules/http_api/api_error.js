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
 * Extends standard Error with a code field and toJson function.
 *
 * @class
 * @memberof helpers
 * @param {string} message
 * @param {number} code
 * @see Parent: {@link helpers}
 * @todo Add description for the params
 */
class ApiError extends Error {
	constructor(message, code, errors = []) {
		super();
		this.message = message;
		this.code = code;
		this.errors = errors;
	}

	/**
	 * Returns an ApiError instance message
	 *
	 * @returns {string}
	 */
	toJson() {
		return {
			message: this.message,
		};
	}
}

module.exports = ApiError;
