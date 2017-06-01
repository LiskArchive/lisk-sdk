var async = require('async');
var transactionTypes = require('../helpers/transactionTypes.js');
var client, self, logger, cacheEnabled,
	cacheReady = true, errorCacheDisabled = 'Cache Unavailable';

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
	if (!self.isConnected()) { 
		return cb(errorCacheDisabled); 
	}
	client.get(key, function (err, value) {
		// parsing string to json
		return cb(err, JSON.parse(value));
	});
};
 

Cache.prototype.setJsonForKey = function (key, value, cb) {
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	} 
	// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
	client.set(key, JSON.stringify(value), cb);
};

Cache.prototype.deleteJsonForKey = function (key, cb) {
	if (!self.isConnected()) {
		return cb(errorCacheDisabled);
	}
	client.del(key, cb);
};

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

Cache.prototype.flushDb = function (cb) {
	if (!self.isConnected()) { 
		return cb(errorCacheDisabled); 
	}
	client.flushdb(cb);
};

Cache.prototype.cleanup = function (cb) {
	self.quit(cb);
};

Cache.prototype.quit = function (cb) {
	if (!self.isConnected()) {
		// because connection isn't established in the first place.
		return cb();
	}
	client.quit(cb);
};

/**
 * This function will be triggered on new block, it will clear all cache entires.
 */

Cache.prototype.onNewBlock = function () {
	if(!self.isReady()) { return; }
	async.map(['/api/blocks*', '/api/transactions*'], function (pattern) {
		self.removeByPattern(pattern, function (err) {
			if (err) {
				logger.error(['Error clearing keys with pattern:', pattern, ' on new block'].join(' '));
			} else {
				logger.info(['keys with pattern:', pattern, 'cleared from cache on new block'].join(' '));
			}
		});
	});
};

/**
 * This function will be triggered when a round finishes, it will clear all cache entires.
 */

Cache.prototype.onFinishRound = function () {
	if(!self.isReady()) { return; }
	var pattern = '/api/delegates*';
	self.removeByPattern(pattern, function (err) {
		if (err) {
			logger.error(['Error clearing keys with pattern:', pattern, ' round finish'].join(' '));
		} else {
			logger.info(['keys with pattern: ', pattern, 'cleared from cache new Round'].join(' '));
		}
	});
};


/**
 * This function will be triggered when transactions are processed, it will clear all cache entires if there is a delegate type transaction.
 * @param {transactions|transactions[]} transactions
 */
Cache.prototype.onUnconfirmedTransaction = function (transactions) {
	if(!self.isReady()) { return; }
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
				logger.error(['Error clearing keys with pattern:', pattern, ' on delegate trs'].join(' '));
			} else {
				logger.info(['keys with pattern:', pattern, 'cleared from cache on delegate trs'].join(' '));
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
 * Enable changes in cache after syncing finished
 */
Cache.prototype.onSyncFinish = function () {
	cacheReady = true;
};

module.exports = Cache;
