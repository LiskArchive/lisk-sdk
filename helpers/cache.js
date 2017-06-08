'use strict';

var redis = require('redis');

/**
 * Connects with redis server using the config provided via parameters
 * @param {Boolean} cacheEnabled
 * @param {Object} config - Redis configuration
 * @param {Object} logger
 * @param {Function} cb
 */
module.exports.connect = function (cacheEnabled, config, logger, cb) {
	var isRedisLoaded = false;

	if (!cacheEnabled) {
		return cb(null, { cacheEnabled: cacheEnabled, client: null });
	}

	var client = redis.createClient(config);

	client.on('connect', function () {
		logger.info('App connected with redis server');

		if (!isRedisLoaded) {
			isRedisLoaded = true;
			return cb(null, { cacheEnabled: cacheEnabled, client: client });
		}
	});

	client.on('error', function (err) {
		logger.error('Redis:', err);
		// Only throw an error if cache was enabled in config but were unable to load it properly
		if (!isRedisLoaded) {
			isRedisLoaded = true;
			return cb('Unable to connect to redis server', { cacheEnabled: cacheEnabled, client: null });
		}
	});
};
