var library, self, errorMessage = 'Cache Unavailable';

// Constructor
function Cache (cb, scope) {
	library = scope;
	self = this;
	setImmediate(cb, null, self);
}

Cache.prototype.getJsonForKey = function (key, cb) {
	// we can use config var to check if caching is activated
	if (this.isConnected()) {
		library.cache.get(key, function (err, value) {
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
		library.cache.set(key, JSON.stringify(value), cb);
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.isConnected = function () {
	return library.cache.connect;
};

module.exports = Cache;
