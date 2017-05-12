'use strict';

var constants     = require('../helpers/constants.js');
var sandboxHelper = require('../helpers/sandbox.js');
// Submodules
var blocksAPI     = require('./blocks/api');
var blocksVerify  = require('./blocks/verify');
var blocksProcess = require('./blocks/process');
var blocksUtils   = require('./blocks/utils');
var blocksChain   = require('./blocks/chain');

// Private fields
var modules, library, self, __private = {};

__private.lastBlock = {};
__private.lastReceipt = null;

__private.loaded = false;
__private.cleanup = false;
__private.isActive = false;

/**
 * Initializes library with scope content.
 * Calls __private.saveGenesisBlock.
 * @memberof module:blocks
 * @class
 * @classdesc Main Blocks methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Blocks (cb, scope) {
	library = scope;

	// Initialize submodules
	this.submodules = {
		api:     new blocksAPI(scope),
		verify:  new blocksVerify(scope),
		process: new blocksProcess(scope),
		utils:   new blocksUtils(scope),
		chain:   new blocksChain(scope)
	};

	// Expose submodules
	this.shared  = this.submodules.api;
	this.verify  = this.submodules.verify;
	this.process = this.submodules.process;
	this.utils   = this.submodules.utils;
	this.chain   = this.submodules.chain;

	self = this;

	this.submodules.chain.saveGenesisBlock(function (err) {
		return setImmediate(cb, err, self);
	});
}

/**
 * PUBLIC METHODS
 */

Blocks.prototype.lastBlock = {
	get: function () {
		return __private.lastBlock;
	},
	set: function (lastBlock) {
		__private.lastBlock = lastBlock;
		return __private.lastBlock;
	},
	/**
	 * Returns status of last block - if it fresh or not
	 *
	 * @public
	 * @method lastBlock.isFresh
	 * @return {Boolean} Fresh status of last block
	 */
	isFresh: function () {
		if (!__private.lastBlock) { return false; }
		// Current time in seconds - (epoch start in seconds + block timestamp)
		var secondsAgo = Math.floor(Date.now() / 1000) - (Math.floor(constants.epochTime / 1000) + __private.lastBlock.timestamp);
		return (secondsAgo < constants.blockReceiptTimeOut);
	}
};

Blocks.prototype.lastReceipt = {
	get: function () {
		return __private.lastReceipt;
	},
	update: function () {
		__private.lastReceipt = Math.floor(Date.now / 1000);
		return __private.lastReceipt;
	},
	/**
	 * Returns status of last receipt - if it stale or not
	 *
	 * @public
	 * @method lastReceipt.isStale
	 * @return {Boolean} Stale status of last receipt
	 */
	isStale: function () {
		if (!__private.lastReceipt) { return true; }
		// Current time in seconds - lastReceipt (seconds)
		var secondsAgo = Math.floor(Date.now() / 1000) - __private.lastReceipt;
		return (secondsAgo > constants.blockReceiptTimeOut);
	}
};

Blocks.prototype.isActive = {
	get: function () {
		return __private.isActive;
	},
	set: function (isActive) {
		__private.isActive = isActive;
		return __private.isActive;
	}
};

Blocks.prototype.isCleaning = {
	get: function () {
		return __private.cleanup;
	}
};

/**
 * Sandbox API wrapper
 *
 * @public
 * @async
 * @method sandboxApi
 * @param  {string}   call Name of the function to be called 
 * @param  {Object}   args Arguments
 * @param  {Function} cb Callback function
 */
Blocks.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(Blocks.prototype.shared, call, args, cb);
};

/**
 * Handle modules initialization
 *
 * @public
 * @method onBind
 * @listens module:app~event:bind
 * @param  {scope}   scope Exposed modules
 */
Blocks.prototype.onBind = function (scope) {
	modules = scope;

	// Set module as loaded
	__private.loaded = true;
};

/**
 * Handle node shutdown request
 *
 * @public
 * @method onBind
 * @listens module:app~event:cleanup
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 */
Blocks.prototype.cleanup = function (cb) {
	__private.loaded = false;
	__private.cleanup = true;

	if (!__private.isActive) {
		// Module ready for shutdown
		return setImmediate(cb);
	} else {
		// Module is not ready, repeat
		setImmediate(function nextWatch () {
			if (__private.isActive) {
				library.logger.info('Waiting for block processing to finish...');
				setTimeout(nextWatch, 10000); // 10 sec
			} else {
				return setImmediate(cb);
			}
		});
	}
};

/**
 * Get module loading status
 *
 * @public
 * @method isLoaded
 * @return {boolean} status Module loading status
 */
Blocks.prototype.isLoaded = function () {
	// Return 'true' if 'modules' are present
	return !!modules;
};


// Export
module.exports = Blocks;
