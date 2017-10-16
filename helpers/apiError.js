'use strict';

/**
 * Extends standard Error with a code field.
 * @param {string} message
 * @param {number} code
 * @constructor
 */
function ApiError (message, code) {
	this.message = message;
	this.code = code;
}

ApiError.prototype = new Error();

module.exports = ApiError;
