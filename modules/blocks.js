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

Blocks.prototype.lastBlock = {
	get: function () {
		return __private.lastBlock;
	},
	set: function (lastBlock) {
		__private.lastBlock = lastBlock;
		return __private.lastBlock;
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
 * PUBLIC METHODS
 */

/**
 * Get last block with additional 'secondsAgo' and 'fresh' properties
 *
 * @public
 * @method getLastBlock
 * @return {Object} lastBlock Modified last block
 */
Blocks.prototype.getLastBlock = function () {
	if (__private.lastBlock) {
		var epoch = Math.floor(constants.epochTime / 1000);
		var lastBlockTime = epoch + __private.lastBlock.timestamp;
		var currentTime = Math.floor(Date.now() / 1000);

		//FIXME: That function modify global last block object - not good, for what we need those properties?
		// 'fresh' is used in modules.loader.internal.statusPing
		__private.lastBlock.secondsAgo = (currentTime - lastBlockTime);
		__private.lastBlock.fresh = (__private.lastBlock.secondsAgo < constants.blockReceiptTimeOut);
	}

	return __private.lastBlock;
};

/**
 * Returns last receipt - indicator how long ago last block was received
 *
 * @public
 * @method lastReceipt
 * @param  {Object} [lastReceipt] Last receipt, if supplied - global one will be overwritten
 * @return {Object} lastReceipt Last receipt
 */
Blocks.prototype.lastReceipt = function (lastReceipt) {
	//TODO: Should public methods modify module's global object directly?
	if (lastReceipt) {
		__private.lastReceipt = {timestamp: Math.floor(lastReceipt / 1000)};
	}

	if (__private.lastReceipt) {
		// Recalculate how long ago we received a block
		var timeNow = Math.floor(Date.now() / 1000);
		__private.lastReceipt.secondsAgo = timeNow - __private.lastReceipt.timestamp;
		// Mark if last receipt is stale - that is used to trigger sync in case we not received a block for long
		__private.lastReceipt.stale = (__private.lastReceipt.secondsAgo > constants.blockReceiptTimeOut);
	}

	return __private.lastReceipt;
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
