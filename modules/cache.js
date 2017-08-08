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
 * @param {Function} cb
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
 * @returns {Boolean} status
 */
Cache.prototype.isConnected = function () {
	// using client.ready because this variable is updated on client connected
	return cacheEnabled && client && client.ready;
};

/**
 * It gets the caching readiness and the connection of redis
 * @returns {Boolean} status
 */
Cache.prototype.isReady = function () {
	return cacheReady && self.isConnected();
};

/**
 * It gets the json value for a key from redis
 * @param {String} key
 * @param {Function} cb
 * @returns {Function} cb
 */
Cache.prototype.getJsonForKey = function (key, cb) {
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
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */
Cache.prototype.setJsonForKey = function (key, value, cb) {
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	} 
	// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
	client.set(key, JSON.stringify(value), cb);
};

/**
 * It deletes json value for a key in redis
 * @param {String} key
 */
Cache.prototype.deleteJsonForKey = function (key, cb) {
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	client.del(key, cb);
};

/**
 * It scans keys with provided pattern in redis db and deletes the entries that match
 * @param {String} pattern
 * @param {Function} cb
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
 * @param {Function} cb
 */
Cache.prototype.flushDb = function (cb) {
	if (!self.isConnected()) { 
		return cb(errorCacheDisabled); 
	}
	client.flushdb(cb);
};

/**
 * On application clean event, it quits the redis connection
 * @param {Function} cb
 */
Cache.prototype.cleanup = function (cb) {
	self.quit(cb);
};

/**
 * it quits the redis connection
 * @param {Function} cb
 */
Cache.prototype.quit = function (cb) {
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
 * @param {Function} cb
 */
Cache.prototype.onNewBlock = function (block, broadcast, cb) {
	cb = cb || function () {};

	if(!self.isReady()) { return cb(errorCacheDisabled); }
	async.map(['/api/blocks*', '/api/transactions*'], function (pattern, mapCb) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error(['Error clearing keys with pattern:', pattern, ' on new block'].join(' '));
			} else {
				logger.debug(['keys with pattern:', pattern, 'cleared from cache on new block'].join(' '));
			}
			mapCb(err);
		});
	}, cb);
};

/**
 * This function will be triggered when round has changed, it will clear all cache entries.
 * @param {object} data Data received from postgres
 * @param {object} data.round Current round
 * @param {object} data.list Delegates list used for slot calculations
 * @param {Function} cb
 */
Cache.prototype.onRoundChanged = function (data, cb) {
	cb = cb || function () {};

	if(!self.isReady()) { return cb(errorCacheDisabled); }
	var pattern = '/api/delegates*';
	self.removeByPattern(pattern, function (err) {
		if (err) {
			logger.error(['Error clearing keys with pattern:', pattern, ' round finish'].join(' '));
		} else {
			logger.debug(['keys with pattern: ', pattern, 'cleared from cache new Round'].join(' '));
		}
		return cb(err);
	});
};


/**
 * This function will be triggered when transactions are processed, it will clear all cache entires if there is a delegate type transaction.
 * @param {Transactions[]} transactions
 * @param {Function} cb
 */
Cache.prototype.onTransactionsSaved = function (transactions, cb) {
	cb = cb || function () {};

	if(!self.isReady()) { return cb(errorCacheDisabled); }
	var pattern = '/api/delegates*';

	var delegateTransaction = transactions.find(function (trs) {
		return !!trs && trs.type === transactionTypes.DELEGATE;
	});

	if (!!delegateTransaction) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error(['Error clearing keys with pattern:', pattern, ' on delegate trs'].join(' '));
			} else {
				logger.debug(['keys with pattern:', pattern, 'cleared from cache on delegate trs'].join(' '));
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
