'use strict';

var crypto = require('crypto');
var fs = require('fs');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.loaded = false;

/**
 * Initializes library with scope content.
 * @class
 * @classdesc Main Crypto methods.
 * @param {setImmediateCallback} cb - Callback function.
 * @param {scope} scope - App instance.
 */
// Constructor
function Crypto (cb, scope) {
	library = scope;
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
 * Assigns scope to modules variable.
 * @param {scope} scope - Loaded modules.
 */
Crypto.prototype.onBind = function (scope) {
	modules = scope;
};

/**
 * Sets to true private variable loaded.
 */
Crypto.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

// Export
module.exports = Crypto;
