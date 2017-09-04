'use strict';

var crypto = require('crypto');
var fs = require('fs');

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
