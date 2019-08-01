/*
 * Copyright © 2019 Lisk Foundation
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
const { promisify } = require('util');

const errorCacheDisabled = 'Cache Disabled';

/**
 * Cache component.
 *
 * @class
 * @memberof components
 * @see Parent: {@link components}
 * @requires redis
 * @requires util
 * @param {Object} options - Cache options
 * @param {Object} logger
 */
class Cache {
	constructor(options, logger) {
		this.options = options;
		this.logger = logger;
		this.ready = false;
	}

	async bootstrap() {
		// TODO: implement retry_strategy
		// TOFIX: app crashes with FTL error when launchin app with CACHE_ENABLE=true
		// but cache server is not available.
		return new Promise(resolve => {
			this.client = redis.createClient(this.options);
			this.client.once('error', err => {
				// Called if the "error" event occured before "ready" event
				this.logger.warn('App was unable to connect to Cache server', err);
				// Error handler needs to exist to ignore the error
				this.client.on('error', () => {});
				resolve();
			});
			this.client.once('ready', () => {
				this._onReady();
				resolve();
			});
		});
	}

	_onReady() {
		// Called after "ready" Cache event
		this.logger.info('App connected to Cache server');

		this.getAsync = promisify(this.client.get).bind(this.client);
		this.setAsync = promisify(this.client.set).bind(this.client);
		this.delAsync = promisify(this.client.del).bind(this.client);
		this.scanAsync = promisify(this.client.scan).bind(this.client);
		this.flushdbAsync = promisify(this.client.flushdb).bind(this.client);
		this.quitAsync = promisify(this.client.quit).bind(this.client);
		this.enable();

		this.client.on('error', err => {
			// Log Cache errors before and after server was connected
			this.logger.info('Cache:', err);
		});
	}

	/**
	 * Gets redis connection status.
	 *
	 * @return {boolean}
	 */
	isReady() {
		// Use client.ready because this constant is updated on client connection
		return this.client && this.client.ready && this.ready;
	}

	/**
	 * Enables cache client
	 */
	enable() {
		this.ready = true;
	}

	/**
	 * Disables cache client
	 */
	disable() {
		this.ready = false;
	}

	/**
	 * Gets json value for a key from redis.
	 *
	 * @param {string} key
	 * @return {Promise.<value, Error>}
	 */
	async getJsonForKey(key) {
		this.logger.debug(
			['Cache - Get value for key:', key, '| Status:', this.isReady()].join(
				' ',
			),
		);
		if (!this.isReady()) {
			throw new Error(errorCacheDisabled);
		}

		const value = await this.getAsync(key);
		return JSON.parse(value);
	}

	/**
	 * Sets json value for a key in redis.
	 *
	 * @param {string} key
	 * @param {Object} value
	 * @return {Promise.<null, Error>}
	 */
	async setJsonForKey(key, value) {
		this.logger.debug(
			['Cache - Set value for key:', key, '| Status:', this.isReady()].join(
				' ',
			),
		);
		if (!this.isReady()) {
			throw new Error(errorCacheDisabled);
		}

		// Cache server calls toString on objects, which converts it to object [object] so calling stringify before saving
		return this.setAsync(key, JSON.stringify(value));
	}

	/**
	 * Deletes json value for a key in redis.
	 *
	 * @param {string} key
	 * @return {Promise.<Integer, Error>} 0 if key doesn't exist or 1 if key was found and successfully deleted.
	 */
	async deleteJsonForKey(key) {
		this.logger.debug(
			['Cache - Delete value for key:', key, '| Status:', this.isReady()].join(
				' ',
			),
		);
		if (!this.isReady()) {
			throw new Error(errorCacheDisabled);
		}

		return this.delAsync(key);
	}

	/**
	 * Scans keys with provided pattern in redis db and deletes the entries matching the given pattern.
	 *
	 * @param {string} pattern
	 * @return {Promise.<null, Error>}
	 */
	async removeByPattern(pattern) {
		this.logger.debug(
			['Cache - removeByPattern', pattern, '| Status:', this.isReady()].join(
				' ',
			),
		);

		if (!this.isReady()) {
			throw new Error(errorCacheDisabled);
		}
		let keys;
		let cursor = 0;

		const scan = () =>
			this.scanAsync(cursor, 'MATCH', pattern).then((res, err) => {
				if (err) throw err;

				[cursor, keys] = res;

				if (keys.length > 0) {
					this.delAsync(keys);
					return scan();
				}

				if (cursor === '0') {
					return null;
				}

				return scan();
			});

		return scan();
	}

	/**
	 * Removes all entries from redis db.
	 *
	 * @return {Promise.<null, Error>}
	 */
	async flushDb() {
		this.logger.debug('Cache - Flush database');
		if (!this.isReady()) {
			throw new Error(errorCacheDisabled);
		}
		return this.flushdbAsync();
	}

	/**
	 * Quits established redis connection upon process exit.
	 *
	 * @return {Promise.<null, Error>}
	 */
	async cleanup() {
		this.logger.debug('Cache - Clean up database');
		return this.quit();
	}

	/**
	 * Quits established redis connection.
	 *
	 * @return {Promise.<null, Error>}
	 */
	async quit() {
		this.logger.debug('Cache - Quit database');
		if (!this.isReady()) {
			// Because connection is not established in the first place
			return null;
		}
		return this.quitAsync();
	}
}

module.exports = Cache;
