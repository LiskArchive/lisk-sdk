'use strict';

var modules = require('../../helpers/swagger_module_registry');
var debug = require('debug')('swagger:lisk:cache');

module.exports = function create (fittingDef, bagpipes) {

	var cache = modules.getCache();
	var logger = modules.getLogger();
	var mode = fittingDef.mode;
	var cacheSpecKey = fittingDef.swagger_cache_key;

	debug('create', mode);

	return function lisk_cache (context, next) {

		debug('exec', mode);

		// If not a swagger operation don't serve from pipeline
		if (!context.request.swagger.operation) {
			return new Error('Invalid swagger operation, unable to process cache for response');
		}

		// Check if cache is enabled for the endpoint in swagger.yml
		if (!!context.request.swagger.operation[cacheSpecKey] === false) {
			debug('Cache not enabled for endpoint: ' + context.request.swagger.operation.pathToDefinition.join('.'));
			return next(null, context.input);
		}

		// If cache server not ready move forward without any processing
		if (!cache.isReady()) {
			debug('Cache module not ready');
			return next(null, context.input);
		}

		var cacheKey = context.request.originalUrl;

		// If cache fitting is called before response processing
		if (mode === 'pre_response') {
			cache.getJsonForKey(cacheKey, function (err, cachedValue) {
				if (!err && cachedValue) {
					logger.debug('Cache - Sending cached response for url:', context.request.url);
					context.response.json(cachedValue);
				} else {
					return next(null, context.input);
				}
			});
		}

		// If cache fitting is called after response processing
		if (mode === 'post_response') {
			if(context.statusCode === 200 || context.response.statusCode === 200) {
				logger.debug('Cache - Setting response cache for url:', context.request.url);
				cache.setJsonForKey(cacheKey, context.input, function (err) {
					return next(null, context.input);
				});
			} else {
				return next(null, context.input);
			}
		}
	};
};
