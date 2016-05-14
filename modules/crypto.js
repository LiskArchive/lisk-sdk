var util = require('util'),
    request = require('request'),
    fs = require('fs'),
    crypto = require('crypto'),
    ed = require('ed25519'),
    sandboxHelper = require('../helpers/sandbox.js');

var modules, library, self, private = {}, shared = {};

private.loaded = false;

// Constructor
function Crypto(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;

	setImmediate(cb, null, self);
}

// Public methods
Crypto.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Crypto.prototype.onBind = function (scope) {
	modules = scope;
}

Crypto.prototype.onBlockchainReady = function () {
	private.loaded = true;
}

// Shared
module.exports = Crypto;
