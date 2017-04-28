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
 * Initializes submodules with scope content.
 * Calls submodules.chain.saveGenesisBlock.
 * @memberof module:blocks
 * @class
 * @classdesc Main Blocks methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Blocks (cb, scope) {
	library = {
		logger: scope.logger,
	};	

	// Initialize submodules with library content
	this.submodules = {
		api:     new blocksAPI(
			scope.logger, scope.db, scope.logic.block, scope.schema, scope.dbSequence
		),
		verify:  new blocksVerify(scope.logger, scope.logic.block, 
			scope.logic.transaction, scope.db
		),
		process: new blocksProcess(
			scope.logger, scope.logic.block, scope.logic.peers, scope.logic.transaction,
			scope.schema, scope.db, scope.dbSequence, scope.sequence, scope.genesisblock
		),
		utils:   new blocksUtils(scope.logger, scope.logic.block, scope.logic.transaction, 
			scope.db, scope.dbSequence, scope.genesisblock
		),
		chain:   new blocksChain(
			scope.logger, scope.logic.block, scope.logic.transaction, scope.db,
			scope.genesisblock, scope.bus, scope.balancesSequence
		)
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
/**
 * Last block functions, getter, setter and isFresh
 * @property {function} get Returns lastBlock
 * @property {function} set Sets lastBlock
 * @property {function} isFresh Returns status of last block - if it fresh or not
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
	 * @function isFresh
	 * @return {Boolean} Fresh status of last block
	 */
	isFresh: function () {
		if (!__private.lastBlock) { return false; }
		// Current time in seconds - (epoch start in seconds + block timestamp)
		var secondsAgo = Math.floor(Date.now() / 1000) - (Math.floor(constants.epochTime / 1000) + __private.lastBlock.timestamp);
		return (secondsAgo < constants.blockReceiptTimeOut);
	}
};

Blocks.prototype.generateBlock = function (keypair, timestamp, cb) {
	var transactions = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	var ready = [];

	async.eachSeries(transactions, function (transaction, cb) {
		modules.accounts.getAccount({ publicKey: transaction.senderPublicKey }, function (err, sender) {
			if (err || !sender) {
				return setImmediate(cb, 'Sender not found');
			}

			if (library.logic.transaction.ready(transaction, sender)) {
				library.logic.transaction.verify(transaction, sender, function (err) {
					ready.push(transaction);
					return setImmediate(cb);
				});
			} else {
				return setImmediate(cb);
			}
		});
	}, function () {
		var block;

		try {
			block = library.logic.block.create({
				keypair: keypair,
				timestamp: timestamp,
				previousBlock: __private.lastBlock,
				transactions: ready
			});
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, e);
		}


		self.processBlock(block, true, cb, true);
	});
};

// Main function to process a Block.
// * Verify the block looks ok
// * Verify the block is compatible with database state (DATABASE readonly)
// * Apply the block to database if both verifications are ok
Blocks.prototype.processBlock = function (block, broadcast, cb, saveBlock) {
	if (__private.cleanup) {
		return setImmediate(cb, 'Cleaning up');
	} else if (!__private.loaded) {
		return setImmediate(cb, 'Blockchain is loading');
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
 * Handle modules initialization.
 * Modules are not required in this file.
 * @param {modules} scope Exposed modules
 */
Blocks.prototype.onBind = function (scope) {
	// TODO: move here blocks submodules modules load from app.js.
	// Set module as loaded
	__private.loaded = true;
};

/**
 * Handle node shutdown request
 *
 * @public
 * @method cleanup
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
	return __private.loaded;
};


// Export
module.exports = Blocks;
