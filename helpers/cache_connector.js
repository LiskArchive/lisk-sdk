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

/**
 * Description of the module.
 *
 * @module
 * @see Parent: {@link helpers}
 */

/**
 * Description of the function.
 *
 * @param {Object} config - Redis configuration
 * @param {Object} logger
 * @param {function} cb
 * @todo Add description for the function and the params
 */

class CacheConnector {
	constructor(cacheConfig, logger) {
		this.cacheConfig = cacheConfig;
		this.logger = logger;
	}

	connect(cb) {
		this.client = redis.createClient(this.cacheConfig);
		this.client.once(
			'error',
			this._onRedisConnectionError.bind(this, () => cb(null, this.client))
		);
		this.client.once(
			'ready',
			this._onRedisReady.bind(this, () => cb(null, this.client))
		);
		return null;
	}

	_onRedisConnectionError(cb, err) {
		// Called if the "error" event occured before "ready" event
		this.logger.info('App was unable to connect to Redis server', err);
		// Don't attempt to connect to Redis again as the connection was never established before
		this.client.quit();
		return cb();
	}

	_onRedisReady(cb) {
		// Called after "ready" Redis event
		this.logger.info('App connected with Redis server');
		this.client.removeListener('error', this._onRedisConnectionError);
		this.client.on('error', err => {
			// Log Redis errors before and after Redis was connected
			this.logger.info('Redis:', err);
		});
		return cb();
	}
}

module.exports = function createCache(options, logger) {
	// delete password key if it's value is null
	const cacheConfigParam = Object.assign({}, options);
	if (cacheConfigParam.password === null) {
		delete cacheConfigParam.password;
	}
	return new CacheConnector(cacheConfigParam, logger);
};
