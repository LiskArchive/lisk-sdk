var library, self, __private = {}, errorMessage = 'Cache Unavailable';

__private.keys =  {
	GET_LATEST_BLOCK: 'latest_block'
};


// Constructor
function Cache (cb, scope) {
	library = scope;
	self = this;

	setImmediate(cb, null, self);
}

Cache.prototype.getLatestBlock = function (cb) {
	// we can use config var to check if caching is activated
	if ( library.cache.connected ) {
		library.cache.get(__private.keys.GET_LATEST_BLOCK, cb);
	} else {
		cb(errorMessage);
	}
};

Cache.prototype.setLatestBlock = function (value, cb) {
	if ( library.cache.connected ) {
		library.cache.get(__private.keys.GET_LATEST_BLOCK, cb);
	} else {
		cb(errorMessage);
	}
};

module.exports = Cache;
