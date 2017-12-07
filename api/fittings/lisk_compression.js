'use strict';

var debug = require('debug')('swagger:lisk:compression');
var _ = require('lodash');
var compression = require('compression');

module.exports = function create (fittingDef, bagpipes) {

	debug('config: %j', fittingDef);

	var validCorsOptions = ['level', 'chunkSize', 'memLevel'];
	var middleware = compression(_.pick(fittingDef, validCorsOptions));

	return function lisk_compression (context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
