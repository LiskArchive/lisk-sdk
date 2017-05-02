'use strict';

var crypto = require('crypto');
var fs = require('fs');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.loaded = false;

// Constructor
function Crypto (cb, scope) {
	library = scope;
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
Crypto.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Crypto.prototype.onBind = function (scope) {
	modules = scope;
};

Crypto.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

// Export
module.exports = Crypto;
