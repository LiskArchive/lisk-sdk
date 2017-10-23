'use strict';

/**
 * Extends standard Error with a code field and toJson function.
 * @param {string} message
 * @param {number} code
 * @constructor
 */
function ApiError (message, code) {
	this.message = message;
	this.code = code;
}

ApiError.prototype = new Error();

ApiError.prototype.toJson = function () {
	return {
		message: this.message
	};
};

module.exports = ApiError;
