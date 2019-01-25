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

const async = require('async');
const redis = require('redis');
const { promisify } = require('util');
const transactionTypes = require('../../helpers/transaction_types');
const { CACHE } = require('./constants');

const errorCacheDisabled = 'Cache Disabled';

/**
 * Cache module.
 *
 * @class
 * @memberof components
 * @see Parent: {@link components}
 * @requires async
 * @requires redis
 * @requires helpers/transaction_types
 * @param {Object} options - Cache options
 * @param {Object} logger
 * @param {function} cb
 * @todo Add description for the function and the params
 */
class Cache {
	constructor(options, logger) {
		this.options = options;
		this.logger = logger;
		this.cacheReady = false;
	}

	async boostrap() {
		this.client = redis.createClient(this.options);
		this.client.once('error', this._onConnectionError.bind(this));
		this.client.once('ready', this._onReady.bind(this));
	}

	_onConnectionError(err) {
		// Called if the "error" event occured before "ready" event
		this.logger.info('App was unable to connect to Cache server', err);
		// Don't attempt to connect to server again as the connection was never established before
		this.quit();
	}

	_onReady() {
		// Called after "ready" Cache event
		this.logger.info('App connected to Cache server');
		this.client.removeListener('error', this._onConnectionError);
		this.cacheReady = true;
		this.client.on('error', err => {
			// Log Cache errors before and after server was connected
			this.logger.info('Cache:', err);
		});
	}

	/**
	 * Gets redis connection status.
	 *
	 * @returns {boolean}
	 * @todo Add description for the return value
	 */
	isConnected() {
		// Use client.ready because this constiable is updated on client connection
		return this.client && this.client.ready;
	}

	/**
	 * Gets caching readiness and the redis connection status.
	 *
	 * @returns {boolean}
	 * @todo Add description for the return value
	 */
	isReady() {
		return this.cacheReady && this.isConnected();
	}

	/**
	 * Gets json value for a key from redis.
	 *
	 * @param {string} key
	 * @param {function} cb
	 * @returns {function} cb
	 * @returns {boolean}
	 * @todo Add description for the params and the return value
	 */
	getJsonForKey(key, cb) {
		this.logger.debug(
			['Cache - Get value for key:', key, '| Status:', this.isConnected()].join(
				' '
			)
		);
		if (!this.isConnected()) {
			return cb(errorCacheDisabled);
		}
		return this.client.get(key, (err, value) => {
			if (err) {
				return cb(err, value);
			}
			// Parse string to json
			return cb(null, JSON.parse(value));
		});
	}

	/**
	 * Sets json value for a key in redis.
	 *
	 * @param {string} key
	 * @param {Object} value
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	setJsonForKey(key, value, cb) {
		cb =
			cb ||
			function() {
				this.logger.debug('Cache - Value set for key');
			};

		this.logger.debug(
			['Cache - Set value for key:', key, '| Status:', this.isConnected()].join(
				' '
			)
		);
		if (!this.isConnected()) {
			return cb(errorCacheDisabled);
		}

		// Cache server calls toString on objects, which converts it to object [object] so calling stringify before saving
		return this.client.set(key, JSON.stringify(value), cb);
	}

	/**
	 * Deletes json value for a key in redis.
	 *
	 * @param {string} key
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	deleteJsonForKey(key, cb) {
		this.logger.debug(
			[
				'Cache - Delete value for key:',
				key,
				'| Status:',
				this.isConnected(),
			].join(' ')
		);
		if (!this.isConnected()) {
			return cb(errorCacheDisabled);
		}
		return this.client.del(key, cb);
	}

	/**
	 * Scans keys with provided pattern in redis db and deletes the entries that match.
	 *
	 * @param {string} pattern
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	removeByPattern(pattern, cb) {
		if (!this.isConnected()) {
			return cb(errorCacheDisabled);
		}
		let keys;
		let cursor = 0;
		return async.doWhilst(
			whilstCb => {
				this.client.scan(cursor, 'MATCH', pattern, (err, res) => {
					if (err) {
						return whilstCb(err);
					}
					cursor = Number(res.shift());
					keys = res.shift();
					if (keys.length > 0) {
						return this.client.del(keys, whilstCb);
					}
					return whilstCb();
				});
			},
			() => cursor > 0,
			cb
		);
	}

	/**
	 * Removes all entries from redis db.
	 *
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	async flushDb() {
		this.logger.debug('Cache - Flush database');
		if (!this.isConnected()) {
			return new Error(errorCacheDisabled);
		}
		const flushdbAsync = promisify(this.client.flushdb).bind(this.client);
		return flushdbAsync();
	}

	/**
	 * Quits established redis connection upon process exit.
	 *
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	async cleanup() {
		this.logger.debug('Cache - Clean up database');
		this.quit();
	}

	/**
	 * Quits established redis connection.
	 *
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	async quit() {
		this.logger.debug('Cache - Quit database');
		if (!this.isConnected()) {
			// Because connection is not established in the first place
			return null;
		}
		const quitAsync = promisify(this.client.quit).bind(this.client);
		return quitAsync();
	}

	/**
	 * Clears cache entries for given pattern.
	 *
	 * @param {string} pattern
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	clearCacheFor(pattern, cb) {
		cb = cb || function() {};

		this.logger.debug(
			['Cache - clearCacheFor', pattern, '| Status:', this.isConnected()].join(
				' '
			)
		);

		if (!this.isReady()) {
			return cb(errorCacheDisabled);
		}

		return this.removeByPattern(pattern, err => {
			if (err) {
				this.logger.error(
					[
						'Cache - Error clearing keys with pattern:',
						pattern,
						'on new block',
					].join(' ')
				);
			} else {
				this.logger.debug(
					[
						'Cache - Keys with pattern:',
						pattern,
						'cleared from cache on new block',
					].join(' ')
				);
			}

			cb(err);
		});
	}

	/**
	 * Clears all cache entries upon round finish.
	 *
	 * @param {Object} round - Current round.
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	onFinishRound(round, cb) {
		cb = cb || function() {};

		this.logger.debug(
			['Cache - onFinishRound', '| Status:', this.isConnected()].join(' ')
		);
		if (!this.isReady()) {
			return cb(errorCacheDisabled);
		}
		const pattern = CACHE.KEYS.delegatesApi;
		return this.removeByPattern(pattern, err => {
			if (err) {
				this.logger.error(
					[
						'Cache - Error clearing keys with pattern:',
						pattern,
						'round finish',
					].join(' ')
				);
			} else {
				this.logger.debug(
					[
						'Cache - Keys with pattern:',
						pattern,
						'cleared from cache on new Round',
					].join(' ')
				);
			}
			return cb(err);
		});
	}

	/**
	 * Clears all cache entries if there is a delegate type transaction after transactions saved.
	 *
	 * @param {transactions[]} transactions
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	onTransactionsSaved(transactions, cb) {
		cb = cb || function() {};

		this.logger.debug(
			['Cache - onTransactionsSaved', '| Status:', this.isConnected()].join(' ')
		);
		if (!this.isReady()) {
			return cb(errorCacheDisabled);
		}

		return async.parallel(
			[
				async.reflect(reflectCb => {
					const pattern = CACHE.KEYS.delegatesApi;

					const delegateTransaction = transactions.find(
						transaction =>
							!!transaction && transaction.type === transactionTypes.DELEGATE
					);

					if (!delegateTransaction) {
						return setImmediate(reflectCb, null);
					}

					return this.removeByPattern(pattern, removeByPatternErr => {
						if (removeByPatternErr) {
							this.logger.error(
								[
									'Cache - Error clearing keys with pattern:',
									pattern,
									'on delegate transaction',
								].join(' ')
							);
						} else {
							this.logger.debug(
								[
									'Cache - Keys with pattern:',
									pattern,
									'cleared from cache on delegate transaction',
								].join(' ')
							);
						}
						return setImmediate(reflectCb, removeByPatternErr);
					});
				}),

				async.reflect(reflectCb => {
					if (transactions.length === 0) {
						return setImmediate(reflectCb, null);
					}

					return this.deleteJsonForKey(
						CACHE.KEYS.transactionCount,
						deleteJsonForKeyErr => {
							if (deleteJsonForKeyErr) {
								this.logger.error(
									`Cache - Error clearing keys: ${CACHE.KEYS.transactionCount}`
								);
							} else {
								this.logger.debug(
									`Cache - Keys ${
										CACHE.KEYS.transactionCount
									} cleared from cache`
								);
							}
							return setImmediate(reflectCb, deleteJsonForKeyErr);
						}
					);
				}),
			],
			() => setImmediate(cb, null) // Don't propagate cache error to continue normal operations
		);
	}

	/**
	 * Disables any changes in cache while syncing.
	 */
	onSyncStarted() {
		this.cacheReady = false;
	}

	/**
	 * Enables changes in cache after syncing finished.
	 */
	onSyncFinished() {
		this.cacheReady = true;
	}
}

module.exports = Cache;
