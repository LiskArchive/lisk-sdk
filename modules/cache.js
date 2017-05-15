var client, self, cacheEnabled, errorMessage = 'Cache Unavailable';

// Constructor
function Cache (cb, scope) {
	client = scope.cache.client;
	cacheEnabled = scope.cache.cacheEnabled;
	setImmediate(cb, null, this);
}

Cache.prototype.getJsonForKey = function (key, cb) {
	// we can use config var to check if caching is activated
	if (this.isConnected()) {
		client.get(key, function (err, value) {
			// parsing string to json
			cb(err, JSON.parse(value));
		});
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.setJsonForKey = function (key, value, cb) {
	if (this.isConnected()) {
		// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
		client.set(key, JSON.stringify(value), cb);
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.deleteJsonForKey = function (key, value, cb) {
	if (this.isConnected()) {
		client.del(key, cb);
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.isConnected = function () {
	return cacheEnabled && client.connected;
};

Cache.prototype.flushDb = function (cb) {
	if (this.isConnected()) {
		client.flushdb(cb);
	} else {
		cb(errorMessage);
	}
};

module.exports = Cache;
