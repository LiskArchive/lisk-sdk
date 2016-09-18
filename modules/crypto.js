'use strict';

var crypto = require('crypto');
var fs = require('fs');
var request = require('request');
var sandboxHelper = require('../helpers/sandbox.js');
var util = require('util');

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

// Shared
module.exports = Crypto;
