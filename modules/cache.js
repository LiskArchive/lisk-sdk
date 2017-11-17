var async = require('async');
var transactionTypes = require('../helpers/transactionTypes.js');
var cacheReady = true;
var errorCacheDisabled = 'Cache Unavailable';
var client;
var self;
var logger;
var cacheEnabled;

/**
 * Cache module
 * @constructor
 * @param {function} cb
 * @param {Object} scope
 */
function Cache (cb, scope) {
	self = this;
	client = scope.cache.client;
	logger = scope.logger;
	cacheEnabled = scope.cache.cacheEnabled;
	setImmediate(cb, null, self);
}

/**
 * It gets the status of the redis connection
 * @returns {boolean} status
 */
Cache.prototype.isConnected = function () {
	// using client.ready because this variable is updated on client connected
	return cacheEnabled && client && client.ready;
};

/**
 * It gets the caching readiness and the connection of redis
 * @returns {boolean} status
 */
Cache.prototype.isReady = function () {
	return cacheReady && self.isConnected();
};

/**
 * It gets the json value for a key from redis
 * @param {string} key
 * @param {function} cb
 * @returns {function} cb
 */
Cache.prototype.getJsonForKey = function (key, cb) {
	logger.debug(['Cache - Get value for key:', key, '| Status:', self.isConnected()].join(' '));
	if (!self.isConnected()) { 
		return cb(errorCacheDisabled); 
	}
	client.get(key, function (err, value) {
		if (err) {
			return cb(err, value);
		}
		// parsing string to json
		return cb(null, JSON.parse(value));
	});
};
 
/**
 * It sets json value for a key in redis
 * @param {string} key
 * @param {Object} value
 * @param {function} cb
 */
Cache.prototype.setJsonForKey = function (key, value, cb) {
	cb = cb || function () {
		logger.debug('Cache - Value set for key');
	};

	logger.debug(['Cache - Set value for key:', key, '| Status:', self.isConnected()].join(' '));
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}

	// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
	client.set(key, JSON.stringify(value), cb);
};

/**
 * It deletes json value for a key in redis
 * @param {string} key
 */
Cache.prototype.deleteJsonForKey = function (key, cb) {
	logger.debug(['Cache - Delete value for key:', key, '| Status:', self.isConnected()].join(' '));
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	client.del(key, cb);
};

/**
 * It scans keys with provided pattern in redis db and deletes the entries that match
 * @param {string} pattern
 * @param {function} cb
 */
Cache.prototype.removeByPattern = function (pattern, cb) {
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	var keys, cursor = 0;
	async.doWhilst(function iteratee (whilstCb) {
		client.scan(cursor, 'MATCH', pattern, function (err, res) {
			if (err) {
				return whilstCb(err);
			} else {
				cursor = Number(res.shift());
				keys = res.shift();
				if (keys.length > 0 ) {
					client.del(keys, whilstCb);
				} else {
					return whilstCb();
				}
			}
		});
	}, function test () {
		return cursor > 0;
	}, cb);
};

/**
 * It removes all entries from redis db
 * @param {function} cb
 */
Cache.prototype.flushDb = function (cb) {
	logger.debug('Cache - Flush database');
	if (!self.isConnected()) { 
		return cb(errorCacheDisabled); 
	}
	client.flushdb(cb);
};

/**
 * On application clean event, it quits the redis connection
 * @param {function} cb
 */
Cache.prototype.cleanup = function (cb) {
	logger.debug('Cache - Clean up database');
	self.quit(cb);
};

/**
 * it quits the redis connection
 * @param {function} cb
 */
Cache.prototype.quit = function (cb) {
	logger.debug('Cache - Quit database');
	if (!self.isConnected()) {
		// because connection isn't established in the first place.
		return cb();
	}
	client.quit(cb);
};

/**
 * This function will be triggered on new block, it will clear all cache entires.
 * @param {Block} block
 * @param {Broadcast} broadcast
 * @param {function} cb
 */
Cache.prototype.onNewBlock = function (block, broadcast, cb) {
	cb = cb || function () {};

	logger.debug(['Cache - onNewBlock', '| Status:', self.isConnected()].join(' '));
	if(!self.isReady()) { return cb(errorCacheDisabled); }
	async.map(['/api/blocks*', '/api/transactions*'], function (pattern, mapCb) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error(['Cache - Error clearing keys with pattern:', pattern, 'on new block'].join(' '));
			} else {
				logger.debug(['Cache - Keys with pattern:', pattern, 'cleared from cache on new block'].join(' '));
			}
			mapCb(err);
		});
	}, cb);
};

/**
 * This function will be triggered when round has changed, it will clear all cache entries.
 * @param {Object} data Data received from postgres
 * @param {Object} data.round Current round
 * @param {Object} data.list Delegates list used for slot calculations
 * @param {function} cb
 */
Cache.prototype.onRoundChanged = function (data, cb) {
	cb = cb || function () {};

	logger.debug(['Cache - onRoundChanged', '| Status:', self.isConnected()].join(' '));
	if(!self.isReady()) { return cb(errorCacheDisabled); }
	var pattern = '/api/delegates*';
	self.removeByPattern(pattern, function (err) {
		if (err) {
			logger.error(['Cache - Error clearing keys with pattern:', pattern, 'round finish'].join(' '));
		} else {
			logger.debug(['Cache - Keys with pattern:', pattern, 'cleared from cache on new Round'].join(' '));
		}
		return cb(err);
	});
};

/**
 * This function will be triggered when transactions are processed, it will clear all cache entires if there is a delegate type transaction.
 * @param {Transactions[]} transactions
 * @param {function} cb
 */
Cache.prototype.onTransactionsSaved = function (transactions, cb) {
	cb = cb || function () {};

	logger.debug(['Cache - onTransactionsSaved', '| Status:', self.isConnected()].join(' '));
	if(!self.isReady()) { return cb(errorCacheDisabled); }
	var pattern = '/api/delegates*';

	var delegateTransaction = transactions.find(function (transaction) {
		return !!transaction && transaction.type === transactionTypes.DELEGATE;
	});

	if (!!delegateTransaction) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error(['Cache - Error clearing keys with pattern:', pattern, 'on delegate transaction'].join(' '));
			} else {
				logger.debug(['Cache - Keys with pattern:', pattern, 'cleared from cache on delegate transaction'].join(' '));
			}
			return cb(err);
		});
	} else {
		cb();
	}
};

/**
 * Disable any changes in cache while syncing
 */
Cache.prototype.onSyncStarted = function () {
	cacheReady = false;
};

/**
 * Enable changes in cache after syncing finished
 */
Cache.prototype.onSyncFinished = function () {
	cacheReady = true;
};

module.exports = Cache;
