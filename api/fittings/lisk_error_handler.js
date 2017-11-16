'use strict';

var debug = require('debug')('swagger:lisk:error_handler');
var util = require('util');

module.exports = function create (fittingDef, bagpipes) {

	debug('config: %j', fittingDef);

	return function lisk_error_handler (context, next) {

		if (!util.isError(context.error)) { return next(); }

		var err = context.error;

		if (!context.statusCode || context.statusCode < 400) {
			if (context.response && context.response.statusCode && context.response.statusCode >= 400) {
				context.statusCode = context.response.statusCode;
			} else if (err.statusCode && err.statusCode >= 400) {
				context.statusCode = err.statusCode;
				delete(err.statusCode);
			} else {
				context.statusCode = 500;
			}
		}

		debug('exec: %s', context.error.message);
		debug('status: %s', context.statusCode);

		if (context.statusCode === 500) {
			if(!fittingDef.handle500Errors) {
				return next(err);
			}

			err = {
				message: 'An unexpected error occurred while handling this request'
			};
		}

		context.headers['Content-Type'] = 'application/json';
		Object.defineProperty(err, 'message', { enumerable: true }); // Include message property in response
		delete(context.error);
		next(null, JSON.stringify(err));
	};
};
