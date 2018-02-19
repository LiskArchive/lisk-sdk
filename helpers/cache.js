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

var redis = require('redis');
/**
 * Description of the module.
 *
 * @module
 * @see Parent: {@link helpers}
 */

/**
 * Description of the function.
 *
 * @param {boolean} cacheEnabled
 * @param {Object} config - Redis configuration
 * @param {Object} logger
 * @param {function} cb
 * @todo Add description for the function and the params
 */
module.exports.connect = function(cacheEnabled, config, logger, cb) {
	var isRedisLoaded = false;

	if (!cacheEnabled) {
		return cb(null, { cacheEnabled, client: null });
	}

	// delete password key if it's value is null
	if (config.password === null) {
		delete config.password;
	}
	var client = redis.createClient(config);

	client.on('ready', () => {
		logger.info('App connected with redis server');

		if (!isRedisLoaded) {
			isRedisLoaded = true;
			return cb(null, { cacheEnabled, client });
		}
	});

	client.on('error', err => {
		logger.error('Redis:', err);
		// Returns redis client so application can continue to try to connect with the redis server,
		// and modules/cache can have client reference once it's connected
		if (!isRedisLoaded) {
			isRedisLoaded = true;
			return cb(null, { cacheEnabled, client });
		}
	});
};
