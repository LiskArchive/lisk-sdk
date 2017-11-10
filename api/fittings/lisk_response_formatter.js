'use strict';

var debug = require('debug')('swagger:lisk:response_formatter');
var _ = require('lodash');

module.exports = function create (fittingDef, bagpipes) {

	return function lisk_response_formatter (context, next) {

		debug('exec');
		debug('received data:', context.input);

		if (_.isEmpty(context.input)) {
			context.headers = {'content-type': 'application/json'};
			next(null, {});
			return;
		}

		var output = {};

		if (_.isArray(context.input)) {
			output = {
				meta: {},
				data: context.input,
				links: {}
			};
		} else if (_.isObject(context.input)) {
			if (Object.keys(context.input).sort() === ['data', 'links', 'meta']) {
				output = context.input;
			} else {
				output = {
					meta: context.input.meta || {},
					data: context.input.data || context.input,
					links: context.input.links || {}
				};
			}
		}

		debug('setting headers: \'content-type\': \'application/json\'');

		context.headers = {'content-type': 'application/json'};
		next(null, output);
	};
};