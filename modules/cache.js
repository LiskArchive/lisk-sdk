var library, cache, self, errorMessage = 'Cache Unavailable';

// Constructor
function Cache (cb, scope) {
	library = scope;
	cache = scope.cache;
	self = this;
	setImmediate(cb, null, self);
}

Cache.prototype.getJsonForKey = function (key, cb) {
	// we can use config var to check if caching is activated
	if (this.isConnected()) {
		cache.get(key, function (err, value) {
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
		cache.set(key, JSON.stringify(value), cb);
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.deleteJsonForKey = function (key, value, cb) {
	if (this.isConnected()) {
		// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
		cache.del(key, cb);
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.isConnected = function () {
	return cache.connected;
};

Cache.prototype.flushDb = function (cb) {
	if (this.isConnected()) {
		// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
		cache.flushdb(cb);
	} else {
		cb(errorMessage);
	}
};

module.exports = Cache;
