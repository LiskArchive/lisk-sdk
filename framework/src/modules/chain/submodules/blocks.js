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
const {
	CACHE_KEYS_BLOCKS,
	CACHE_KEYS_TRANSACTIONS,
} = require('../../../../../framework/src/components/cache');
// Submodules
const BlocksVerify = require('./blocks/verify');
const BlocksProcess = require('./blocks/process');
const BlocksUtils = require('./blocks/utils');
const BlocksChain = require('./blocks/chain');

// Private fields
let library;
let self;
let components = {};
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
 * @requires submodules/blocks/verify
 * @requires submodules/blocks/process
 * @requires submodules/blocks/utils
 * @requires submodules/blocks/chain
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, err, self
 */
// Constructor
class Blocks {
	constructor(cb, scope) {
		library = {
			channel: scope.channel,
			logger: scope.components.logger,
		};

		// Initialize submodules with library content
		this.submodules = {
			verify: new BlocksVerify(
				scope.components.logger,
				scope.logic.block,
				scope.logic.transaction,
				scope.components.storage,
				scope.config,
				scope.channel
			),
			process: new BlocksProcess(
				scope.components.logger,
				scope.logic.block,
				scope.logic.peers,
				scope.logic.transaction,
				scope.schema,
				scope.components.storage,
				scope.sequence,
				scope.genesisBlock
			),
			utils: new BlocksUtils(
				scope.components.logger,
				scope.logic.account,
				scope.logic.block,
				scope.logic.transaction,
				scope.components.storage,
				scope.genesisBlock
			),
			chain: new BlocksChain(
				scope.components.logger,
				scope.logic.block,
				scope.logic.transaction,
				scope.components.storage,
				scope.genesisBlock,
				scope.bus,
				scope.balancesSequence,
				scope.channel
			),
		};

		// Expose submodules
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
			(Math.floor(new Date(EPOCH_TIME) / 1000) + __private.lastBlock.timestamp);
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
 * Handle components initialization.
 * Components are not required in this file.
 */
Blocks.prototype.onBind = function(scope) {
	// TODO: move here blocks submodules modules load from app.js.
	components = {
		cache: scope.components ? scope.components.cache : undefined,
	};

	// Set module as loaded
	__private.loaded = true;
};

/**
 * Clear blocks and transactions API cache and emit socket notification `blocks/change`.
 *
 * @param {Block} block
 * @todo Add description for the params
 * @todo Add @returns tag
 */
Blocks.prototype.onNewBlock = async function(block) {
	if (components && components.cache && components.cache.isReady()) {
		library.logger.debug(
			['Cache - onNewBlock', '| Status:', components.cache.isReady()].join(' ')
		);
		const keys = [CACHE_KEYS_BLOCKS, CACHE_KEYS_TRANSACTIONS];
		const tasks = keys.map(key => components.cache.removeByPattern(key));
		try {
			await Promise.all(tasks);
			library.logger.debug(
				[
					'Cache - Keys with patterns:',
					keys,
					'cleared from cache on new Block',
				].join(' ')
			);
		} catch (removeByPatternErr) {
			library.logger.error(
				['Cache - Error clearing keys on new Block'].join(' ')
			);
		}
	}

	return library.channel.publish('chain:blocks:change', block);
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
	return setImmediate(function nextWatch() {
		if (__private.isActive) {
			library.logger.info('Waiting for block processing to finish...');
			return setTimeout(nextWatch, 10000); // 10 sec
		}
		return setImmediate(cb);
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
