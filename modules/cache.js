var async = require('async');
var transactionTypes = require('../helpers/transactionTypes.js');
var client, self, logger, cacheEnabled, cacheReady = true, errorCacheDisabled = 'Cache Unavailable';

// Constructor
function Cache (cb, scope) {
	self = this;
	client = scope.cache.client;
	logger = scope.logger;
	cacheEnabled = scope.cache.cacheEnabled;
	setImmediate(cb, null, self);
}

Cache.prototype.isConnected = function () {
	return cacheEnabled && client.connected;
};

Cache.prototype.isReady = function () {
	return cacheReady && self.isConnected();
};

Cache.prototype.getJsonForKey = function (key, cb) {
	// we can use config var to check if caching is activated
	if (self.isConnected()) {
		client.get(key, function (err, value) {
			// parsing string to json
			cb(err, JSON.parse(value));
		});
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.setJsonForKey = function (key, value, cb) {
	if (self.isConnected()) {
		// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
		client.set(key, JSON.stringify(value), cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.deleteJsonForKey = function (key, cb) {
	if (self.isConnected()) {
		client.del(key, cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.removeByPattern = function (pattern, cb) {
	if (self.isConnected()) {
		var keys, cursor = 0;
		async.doWhilst(function iteratee (callback) {
			client.scan(cursor, 'MATCH', pattern, function (err, res) {
				if (err) {
					callback(err);
				} else {
					cursor = Number(res.shift());
					keys = res.shift();
					if (keys.length > 0 ) {
						client.del(keys, callback);
					} else {
						callback();
					}
				}
			});
		}, function test () {
			return cursor > 0;
		}, cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.flushDb = function (cb) {
	if (self.isConnected()) {
		client.flushdb(cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.cleanup = function () {
	self.quit();
};

Cache.prototype.quit = function () {
	if (self.isConnected()) {
		client.quit();
	}
};

/**
 * This function will be triggered on new block, it will clear all cache entires.
 */

Cache.prototype.onNewBlock = function () {
	async.map(['/api/blocks*', '/api/transactions*'], function (pattern) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error('Error clearing keys with pattern: ', pattern, ' on new block');
			} else {
				logger.info('keys with pattern: ', pattern, 'cleared from on new block');
			}
		});
	});
};

/**
 * This function will be triggered when a round finishes, it will clear all cache entires.
 */

Cache.prototype.onFinishRound = function () {
	var pattern = '/api/delegates*';
	self.removeByPattern(pattern, function (err) {
		if (err) {
			logger.error('Error clearing keys with pattern: ', pattern, ' round finish');
		} else {
			logger.info('keys with pattern: ', pattern, 'cleared from new Round');
		}
	});
};


/**
 * This function will be triggered when transactions are processed, it will clear all cache entires if there is a delegate type transaction.
 * @param {transactions|transactions[]} transactions
 */
Cache.prototype.onUnconfirmedTransaction = function (transactions) {
	var pattern = '/api/delegates*';
	if(Array.isArray(transactions)) {
		transactions = transactions;
	} else {
		transactions = [transactions];
	}
	var delegateTransactions = transactions.filter(function (trs) {
		return !!trs && trs.type === transactionTypes.DELEGATE;
	});
	if (delegateTransactions.length > 0) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error('Error clearing keys with pattern: ', pattern, ' on delegate trs');
			} else {
				logger.info('keys with pattern: ', pattern, 'cleared from on delegate trs');
			}
		});
	}
};

/**
 * Disable any changes in cache while syncing
 */
Cache.prototype.onSyncStarted = function () {
	cacheReady = false;
};

/**
 * Enable any changes in cache after syncing finished
 */
Cache.prototype.onSyncFinish = function () {
	cacheReady = true;
};

module.exports = Cache;
