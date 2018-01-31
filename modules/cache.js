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

var async = require('async');
var transactionTypes = require('../helpers/transaction_types.js');
var cacheReady = true;
var errorCacheDisabled = 'Cache Unavailable';
var client;
var self;
var logger;
var cacheEnabled;

/**
 * Cache module.
 * @constructor
 * @param {function} cb
 * @param {Object} scope
 */
function Cache(cb, scope) {
	self = this;
	client = scope.cache.client;
	logger = scope.logger;
	cacheEnabled = scope.cache.cacheEnabled;
	setImmediate(cb, null, self);
}

/**
 * Gets redis connection status.
 * @returns {boolean} status
 */
Cache.prototype.isConnected = function() {
	// Use client.ready because this variable is updated on client connection
	return cacheEnabled && client && client.ready;
};

/**
 * Gets caching readiness and the redis connection status.
 * @returns {boolean} status
 */
Cache.prototype.isReady = function() {
	return cacheReady && self.isConnected();
};

/**
 * Gets json value for a key from redis.
 * @param {string} key
 * @param {function} cb
 * @returns {function} cb
 */
Cache.prototype.getJsonForKey = function(key, cb) {
	logger.debug(
		['Cache - Get value for key:', key, '| Status:', self.isConnected()].join(
			' '
		)
	);
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	client.get(key, (err, value) => {
		if (err) {
			return cb(err, value);
		}
		// Parse string to json
		return cb(null, JSON.parse(value));
	});
};

/**
 * Sets json value for a key in redis.
 * @param {string} key
 * @param {Object} value
 * @param {function} cb
 */
Cache.prototype.setJsonForKey = function(key, value, cb) {
	cb =
		cb ||
		function() {
			logger.debug('Cache - Value set for key');
		};

	logger.debug(
		['Cache - Set value for key:', key, '| Status:', self.isConnected()].join(
			' '
		)
	);
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}

	// Redis calls toString on objects, which converts it to object [object] so calling stringify before saving
	client.set(key, JSON.stringify(value), cb);
};

/**
 * Deletes json value for a key in redis.
 * @param {string} key
 */
Cache.prototype.deleteJsonForKey = function(key, cb) {
	logger.debug(
		[
			'Cache - Delete value for key:',
			key,
			'| Status:',
			self.isConnected(),
		].join(' ')
	);
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	client.del(key, cb);
};

/**
 * Scans keys with provided pattern in redis db and deletes the entries that match.
 * @param {string} pattern
 * @param {function} cb
 */
Cache.prototype.removeByPattern = function(pattern, cb) {
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	var keys;
	var cursor = 0;
	async.doWhilst(
		whilstCb => {
			client.scan(cursor, 'MATCH', pattern, (err, res) => {
				if (err) {
					return whilstCb(err);
				} else {
					cursor = Number(res.shift());
					keys = res.shift();
					if (keys.length > 0) {
						client.del(keys, whilstCb);
					} else {
						return whilstCb();
					}
				}
			});
		},
		() => cursor > 0,
		cb
	);
};

/**
 * Removes all entries from redis db.
 * @param {function} cb
 */
Cache.prototype.flushDb = function(cb) {
	logger.debug('Cache - Flush database');
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	client.flushdb(cb);
};

/**
 * Quits established redis connection upon process exit.
 * @param {function} cb
 */
Cache.prototype.cleanup = function(cb) {
	logger.debug('Cache - Clean up database');
	self.quit(cb);
};

/**
 * Quits established redis connection.
 * @param {function} cb
 */
Cache.prototype.quit = function(cb) {
	logger.debug('Cache - Quit database');
	if (!self.isConnected()) {
		// Because connection is not established in the first place
		return cb();
	}
	client.quit(cb);
};

/**
 * Clears all cache entries upon new block.
 * @param {Block} block
 * @param {Broadcast} broadcast
 * @param {function} cb
 */
Cache.prototype.onNewBlock = function(block, cb) {
	cb = cb || function() {};

	logger.debug(
		['Cache - onNewBlock', '| Status:', self.isConnected()].join(' ')
	);
	if (!self.isReady()) {
		logger.debug(errorCacheDisabled);
		return cb(errorCacheDisabled);
	}
	async.map(
		['/api/blocks*', '/api/transactions*'],
		(pattern, mapCb) => {
			self.removeByPattern(pattern, err => {
				if (err) {
					logger.error(
						[
							'Cache - Error clearing keys with pattern:',
							pattern,
							'on new block',
						].join(' ')
					);
				} else {
					logger.debug(
						[
							'Cache - Keys with pattern:',
							pattern,
							'cleared from cache on new block',
						].join(' ')
					);
				}
				mapCb(err);
			});
		},
		cb
	);
};

/**
 * Clears all cache entries upon round finish.
 * @param {Object} round - Current round.
 * @param {function} cb
 */
Cache.prototype.onFinishRound = function(round, cb) {
	cb = cb || function() {};

	logger.debug(
		['Cache - onFinishRound', '| Status:', self.isConnected()].join(' ')
	);
	if (!self.isReady()) {
		return cb(errorCacheDisabled);
	}
	var pattern = '/api/delegates*';
	self.removeByPattern(pattern, err => {
		if (err) {
			logger.error(
				[
					'Cache - Error clearing keys with pattern:',
					pattern,
					'round finish',
				].join(' ')
			);
		} else {
			logger.debug(
				[
					'Cache - Keys with pattern:',
					pattern,
					'cleared from cache on new Round',
				].join(' ')
			);
		}
		return cb(err);
	});
};

/**
 * Clears all cache entries if there is a delegate type transaction after transactions saved.
 * @param {transactions[]} transactions
 * @param {function} cb
 */
Cache.prototype.onTransactionsSaved = function(transactions, cb) {
	cb = cb || function() {};

	logger.debug(
		['Cache - onTransactionsSaved', '| Status:', self.isConnected()].join(' ')
	);
	if (!self.isReady()) {
		return cb(errorCacheDisabled);
	}
	var pattern = '/api/delegates*';

	var delegateTransaction = transactions.find(
		transaction =>
			!!transaction && transaction.type === transactionTypes.DELEGATE
	);

	if (delegateTransaction) {
		self.removeByPattern(pattern, err => {
			if (err) {
				logger.error(
					[
						'Cache - Error clearing keys with pattern:',
						pattern,
						'on delegate transaction',
					].join(' ')
				);
			} else {
				logger.debug(
					[
						'Cache - Keys with pattern:',
						pattern,
						'cleared from cache on delegate transaction',
					].join(' ')
				);
			}
			return cb(err);
		});
	} else {
		cb();
	}
};

/**
 * Disables any changes in cache while syncing.
 */
Cache.prototype.onSyncStarted = function() {
	cacheReady = false;
};

/**
 * Enables changes in cache after syncing finished.
 */
Cache.prototype.onSyncFinished = function() {
	cacheReady = true;
};

module.exports = Cache;
