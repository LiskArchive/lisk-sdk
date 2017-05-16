'use strict';

/**
 * Applies methods from parameters.
 * @memberof module:helpers
 * @function
 * @param {function} shared - List of methods.
 * @param {function} call - Method to call.
 * @param {function} args - List of argumets.
 * @param {function} cb - Callback function.
 * @returns {function} Returns cb() for error.
 */
function callMethod (shared, call, args, cb) {
	if (typeof shared[call] !== 'function') {
		return cb('Function not found in module: ' + call);
	}

	var callArgs = [args, cb];
	shared[call].apply(null, callArgs);
}

module.exports = {
	callMethod: callMethod
};
