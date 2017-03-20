'use strict';

var async = require('async');
var path = require('path');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.loaded = false;

// Constructor
function Server (cb, scope) {
	library = scope;
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
Server.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Server.prototype.onBind = function (scope) {
	modules = scope;
};

Server.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

Server.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

Server.prototype.isLoaded = function () {
	return __private.loaded;
};

Server.prototype.areModulesReady = function () {
	return !!modules;
};

// Export
module.exports = Server;
