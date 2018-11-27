/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const { BLOCK_RECEIPT_TIMEOUT, EPOCH_TIME } = global.constants;
// Submodules
const blocksAPI = require('./blocks/api');
const blocksVerify = require('./blocks/verify');
const blocksProcess = require('./blocks/process');
const blocksUtils = require('./blocks/utils');
const blocksChain = require('./blocks/chain');

// Private fields
let library;
let self;
const __private = {};

__private.lastBlock = {};
__private.lastReceipt = null;

__private.loaded = false;
__private.cleanup = false;
__private.isActive = false;

/**
 * Main blocks methods. Initializes submodules with scope content.
 * Calls submodules.chain.saveGenesisBlock.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires modules/blocks/api
 * @requires modules/blocks/verify
 * @requires modules/blocks/process
 * @requires modules/blocks/utils
 * @requires modules/blocks/chain
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, err, self
 */
// Constructor
class Blocks {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
		};

		// Initialize submodules with library content
		this.submodules = {
			api: new blocksAPI(
				scope.logger,
				scope.db,
				scope.logic.block,
				scope.schema
			),
			verify: new blocksVerify(
				scope.logger,
				scope.logic.block,
				scope.logic.transaction,
				scope.db,
				scope.config
			),
			process: new blocksProcess(
				scope.logger,
				scope.logic.block,
				scope.logic.peers,
				scope.logic.transaction,
				scope.schema,
				scope.db,
				scope.sequence,
				scope.genesisBlock
			),
			utils: new blocksUtils(
				scope.logger,
				scope.logic.account,
				scope.logic.block,
				scope.logic.transaction,
				scope.db,
				scope.genesisBlock
			),
			chain: new blocksChain(
				scope.logger,
				scope.logic.block,
				scope.logic.transaction,
				scope.db,
				scope.genesisBlock,
				scope.bus,
				scope.balancesSequence
			),
		};

		// Expose submodules
		this.shared = this.submodules.api;
		this.verify = this.submodules.verify;
		this.process = this.submodules.process;
		this.utils = this.submodules.utils;
		this.chain = this.submodules.chain;

		self = this;

		this.submodules.chain.saveGenesisBlock(err => setImmediate(cb, err, self));
	}
}

/**
 * PUBLIC METHODS
 */
/**
 * Last block functions, getter, setter and isFresh.
 *
 * @property {function} get - Returns lastBlock
 * @property {function} set - Sets lastBlock
 * @property {function} isFresh - Returns status of last block - if it fresh or not
 */
Blocks.prototype.lastBlock = {
	/**
	 * Returns lastBlock.
	 *
	 * @returns {Object} Last block
	 */
	get() {
		return __private.lastBlock;
	},
	/**
	 * Sets lastBlock.
	 *
	 * @returns {Object} Last block
	 */
	set(lastBlock) {
		__private.lastBlock = lastBlock;
		return __private.lastBlock;
	},
	/**
	 * Returns status of last block - if it fresh or not
	 *
	 * @returns {boolean} Fresh status of last block
	 */
	isFresh() {
		if (!__private.lastBlock) {
			return false;
		}
		// Current time in seconds - (epoch start in seconds + block timestamp)
		const secondsAgo =
			Math.floor(Date.now() / 1000) -
			(Math.floor(EPOCH_TIME / 1000) + __private.lastBlock.timestamp);
		return secondsAgo < BLOCK_RECEIPT_TIMEOUT;
	},
};

/**
 * Last Receipt functions: get, update and isStale.
 *
 * @property {function} get - Returns lastReceipt
 * @property {function} update - Updates lastReceipt
 * @property {function} isStale - Returns status of last receipt - if it fresh or not
 */
Blocks.prototype.lastReceipt = {
	get() {
		return __private.lastReceipt;
	},
	update() {
		__private.lastReceipt = Math.floor(Date.now() / 1000);
		return __private.lastReceipt;
	},
	/**
	 * Returns status of last receipt - if it stale or not.
	 *
	 * @returns {boolean} Stale status of last receipt
	 */
	isStale() {
		if (!__private.lastReceipt) {
			return true;
		}
		// Current time in seconds - lastReceipt (seconds)
		const secondsAgo = Math.floor(Date.now() / 1000) - __private.lastReceipt;
		return secondsAgo > BLOCK_RECEIPT_TIMEOUT;
	},
};

/**
 * Description of the member.
 *
 * @property {function} get
 * @property {function} set
 * @todo Add description for the functions
 */
Blocks.prototype.isActive = {
	/**
	 * Description of the function.
	 *
	 * @todo Add @returns tag
	 */
	get() {
		return __private.isActive;
	},
	/**
	 * Description of the function.
	 *
	 * @param {boolean} isActive
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	set(isActive) {
		__private.isActive = isActive;
		return __private.isActive;
	},
};

Blocks.prototype.isCleaning = {
	get() {
		return __private.cleanup;
	},
};

/**
 * Handle modules initialization.
 * Modules are not required in this file.
 */
Blocks.prototype.onBind = function() {
	// TODO: move here blocks submodules modules load from app.js.
	// Set module as loaded
	__private.loaded = true;
};

/**
 * Handle node shutdown request.
 *
 * @listens module:app~event:cleanup
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 */
Blocks.prototype.cleanup = function(cb) {
	__private.loaded = false;
	__private.cleanup = true;

	if (!__private.isActive) {
		// Module ready for shutdown
		return setImmediate(cb);
	}
	// Module is not ready, repeat
	setImmediate(function nextWatch() {
		if (__private.isActive) {
			library.logger.info('Waiting for block processing to finish...');
			setTimeout(nextWatch, 10000); // 10 sec
		} else {
			return setImmediate(cb);
		}
	});
};

/**
 * Get module loading status
 *
 * @returns {boolean} status - Module loading status
 */
Blocks.prototype.isLoaded = function() {
	// Return 'true' if 'modules' are present
	return __private.loaded;
};

// Export
module.exports = Blocks;
