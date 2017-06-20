'use strict';

var async = require('async');
var path = require('path');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, self, __private = {}, shared = {};

__private.loaded = false;

/**
 * Initializes Server.
 * @memberof module:server
 * @class
 * @classdesc Main server methods.
 * @param {scope} scope - App instance.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Server (cb, scope) {
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
/**
 * Calls helpers.sandbox.callMethod().
 * @implements {sandboxHelper.callMethod}
 * @param {function} call - Method to call.
 * @param {} args - List of arguments.
 * @param {function} cb - Callback function.
 */
Server.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
/**
 * Modules are not required in this file.
 * @param {modules} scope - Loaded modules.
 */
Server.prototype.onBind = function (scope) {
	modules = true;
};

/**
 * Sets private variable loaded to true.
 */
Server.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

/**
 * Sets private variable loaded to false.
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Server.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Returns private loaded value
 * @return {boolean} loaded
 */
Server.prototype.isLoaded = function () {
	return __private.loaded;
};

/**
 * Returns true if modules are loaded.
 * @return {boolean} modules loaded
 */
Server.prototype.areModulesReady = function () {
	return !!modules;
};

// Export
module.exports = Server;
