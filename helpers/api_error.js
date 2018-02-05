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

/**
 * Extends standard Error with a code field and toJson function.
 * @param {string} message
 * @param {number} code
 * @constructor
 */
function ApiError(message, code) {
	this.message = message;
	this.code = code;
}

ApiError.prototype = new Error();

ApiError.prototype.toJson = function() {
	return {
		message: this.message,
	};
};

module.exports = ApiError;
