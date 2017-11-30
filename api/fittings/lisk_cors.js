'use strict';

var debug = require('debug')('swagger:lisk:cors');
var _ = require('lodash');
var CORS = require('cors');

module.exports = function create (fittingDef, bagpipes) {

	debug('config: %j', fittingDef);

	var validCorsOptions = ['origin', 'methods', 'allowedHeaders'];
	var middleware = CORS(_.pick(fittingDef, validCorsOptions));

	return function lisk_cors (context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
