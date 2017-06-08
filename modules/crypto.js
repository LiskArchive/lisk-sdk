'use strict';

var crypto = require('crypto');
var fs = require('fs');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var self, __private = {}, shared = {};

__private.loaded = false;

/**
 * @class
 * @classdesc Main Crypto methods.
 * @param {setImmediateCallback} cb - Callback function.
 * @param {scope} scope - App instance.
 */
// Constructor
function Crypto (cb, scope) {
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
/**
 * Calls helpers.sandbox.callMethod().
 * @implements module:helpers#callMethod
 * @param {function} call - Method to call.
 * @param {*} args - List of arguments.
 * @param {function} cb - Callback function.
 */
Crypto.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
/**
 * Modules are not required in this file.
 * @param {modules} scope - Loaded modules.
 */
Crypto.prototype.onBind = function (scope) {
};

/**
 * Sets to true private variable loaded.
 */
Crypto.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

// Export
module.exports = Crypto;
