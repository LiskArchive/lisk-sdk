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
const CACHE_CONNECTION_TIMEOUT = 5000; // Five seconds

class Cache {
	constructor(options, logger) {
		this.options = options;
		this.logger = logger;
		this.ready = false;

		// When connect to redis server running on local machine client tries to connect
		// through unix socket, which failed immediately if server is not running.
		// For remote host, it connect over TCP and wait for timeout
		// Default value for connect_timeout was 3600000, which was not triggering connection error
		this.options.connect_timeout = CACHE_CONNECTION_TIMEOUT;
	}

	async bootstrap() {
		// TODO: implement retry_strategy
		// FIXME: app crashes with FTL error when launching app with CACHE_ENABLE=true
		// but cache server is not available.
		return new Promise(resolve => {
			this.client = redis.createClient(this.options);
			this.client.once('error', err => {
				// Called if the "error" event occurred before "ready" event
				this.logger.warn({ err }, 'App was unable to connect to Cache server');
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
			this.logger.error({ err }, 'Cache client connection error');
		});
	}

	isReady() {
		// Use client.ready because this constant is updated on client connection
		return this.client && this.client.ready && this.ready;
	}

	enable() {
		this.ready = true;
	}

	disable() {
		this.ready = false;
	}

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

	async removeByPattern(pattern) {
		this.logger.trace(
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

	async flushDb() {
		this.logger.debug('Cache: Flush database');
		if (!this.isReady()) {
			throw new Error(errorCacheDisabled);
		}
		return this.flushdbAsync();
	}

	async cleanup() {
		this.logger.debug('Cache: Clean up database');
		return this.quit();
	}

	async quit() {
		this.logger.debug('Cache: Quit database');
		if (!this.isReady()) {
			// Because connection is not established in the first place
			return null;
		}
		return this.quitAsync();
	}
}

module.exports = Cache;
