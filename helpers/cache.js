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

const redis = require('redis');
const Promise = require('bluebird');

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
	if (!cacheEnabled) {
		return cb(null, { cacheEnabled, client: null });
	}

	// delete password key if it's value is null
	if (config.password === null) {
		delete config.password;
	}
	const client = redis.createClient(config);

	// Use promise to determine the Redis connection attempt result
	return new Promise((resolve, reject) => {
		client.on('ready', resolve);
		client.on('error', err => {
			// Log Redis errors before and after Redis was connected
			logger.info('Redis:', err);
			// Promise can be rejected only once
			reject();
		});
	})
		.then(() => {
			// Called after "ready" Redis event
			logger.info('App connected with Redis server');
		})
		.catch(() => {
			// Called if the "error" event occured before "ready" event
			logger.info('App was unable to connect to Redis server');
			// Don't attempt to connect to Redis again as the connection was never established before
			client.quit();
		})
		.finally(() =>
			// Redis usage is optional; return successful message regardless of the Redis connect attempt outcome
			cb(null, { cacheEnabled, client })
		);
};
