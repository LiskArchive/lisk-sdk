'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var Round = require('../logic/round.js');
var sandboxHelper = require('../helpers/sandbox.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/rounds.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.loaded = false;
__private.ticking = false;

__private.feesByRound = {};
__private.rewardsByRound = {};
__private.delegatesByRound = {};
__private.unFeesByRound = {};
__private.unRewardsByRound = {};
__private.unDelegatesByRound = {};

/**
 * Initializes library with scope.
 * @memberof module:rounds
 * @class
 * @classdesc Main rounds methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 * @todo apply node pattern for callbacks: callback always at the end.
 */
// Constructor
function Rounds (cb, scope) {
	library = scope;
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
/**
 * @return {boolean} __private.loaded
 */
Rounds.prototype.loaded = function () {
	return __private.loaded;
};

/**
 * @return {boolean} __private.ticking
 */
Rounds.prototype.ticking = function () {
	return __private.ticking;
};

/**
 * Returns average for each delegate based on height.
 * @param {number} height
 * @return {number} height / delegates
 */
Rounds.prototype.calc = function (height) {
	return Math.ceil(height / slots.delegates);
};

/**
 * Deletes from `mem_round` table records based on round.
 * @implements {library.db.none}
 * @param {number} round
 * @param {function} cb
 * @return {setImmediateCallback} error message | cb
 * 
 */
Rounds.prototype.flush = function (round, cb) {
	library.db.none(sql.flush, {round: round}).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Rounds#flush error');
	});
};

/**
 * Swaps initialization based on direction:
 * - for backward: feesByRound, rewardsByRound, delegatesByRound
 * - otherwise: unFeesByRound, unRewardsByRound, unDelegatesByRound.
 * If lastBlock calls sumRound
 * @implements {__private.sumRound}
 * @implements {calc}
 * @param {string} direction
 * @param {Object} [lastBlock]
 * @param {function} cb
 * @return {setImmediateCallback|__private.sumRound} if lastBlock calls sumRound
 */
Rounds.prototype.directionSwap = function (direction, lastBlock, cb) {
	if (direction === 'backward') {
		__private.feesByRound = {};
		__private.rewardsByRound = {};
		__private.delegatesByRound = {};

		return setImmediate(cb);
	} else {
		__private.unFeesByRound = {};
		__private.unRewardsByRound = {};
		__private.unDelegatesByRound = {};

		if (lastBlock) {
			return __private.sumRound(self.calc(lastBlock.height), cb);
		} else {
			return setImmediate(cb);
		}
	}
};

/**
 * Generates a backward tick: negative `producedblocks`.
 * @implements {calc}
 * @implements {__private.getOutsiders}
 * @implements {Round.mergeBlockGenerator}
 * @implements {Round.markBlockId}
 * @implements {Round.land}
 * @implements {library.db.tx}
 * @param {block} block
 * @param {block} previousBlock
 * @param {function} done - Callback function
 * @return {function} done with error if any
 */
Rounds.prototype.backwardTick = function (block, previousBlock, done) {
	var round = self.calc(block.height);
	var prevRound = self.calc(previousBlock.height);

	__private.unFeesByRound[round] = Math.floor(__private.unFeesByRound[round]) || 0;
	__private.unFeesByRound[round] += Math.floor(block.totalFee);

	__private.unRewardsByRound[round] = (__private.unRewardsByRound[round] || []);
	__private.unRewardsByRound[round].push(block.reward);

	__private.unDelegatesByRound[round] = __private.unDelegatesByRound[round] || [];
	__private.unDelegatesByRound[round].push(block.generatorPublicKey);

	var scope = {
		modules: modules,
		__private: __private,
		block: block,
		round: round,
		backwards: true,
		delegates: __private.unDelegatesByRound[round]
	};

	scope.finishRound = (
		(prevRound !== round && __private.unDelegatesByRound[round].length === slots.delegates) ||
		(previousBlock.height === 1)
	);

	function BackwardTick (t) {
		var promised = new Round(scope, t);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					delete __private.unFeesByRound[round];
					delete __private.unRewardsByRound[round];
					delete __private.unDelegatesByRound[round];
				}).then(function () {
					return promised.markBlockId();
				});
			} else {
				return promised.markBlockId();
			}
		});
	}

	async.series([
		function (cb) {
			if (scope.finishRound) {
				return __private.getOutsiders(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			library.db.tx(BackwardTick).then(function () {
				return setImmediate(cb);
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, err);
			});
		}
	], function (err) {
		return done(err);
	});
};

/**
 * Generates snapshot round
 * @implements {calc}
 * @implements {Round.mergeBlockGenerator}
 * @implements {Round.land}
 * @implements {library.bus.message}
 * @implements {Round.truncateBlocks}
 * @implements {__private.getOutsiders}
 * @param {block} block
 * @param {function} done
 * @return {function} done message | err
 */
Rounds.prototype.tick = function (block, done) {
	var round = self.calc(block.height);
	var nextRound = self.calc(block.height + 1);

	__private.feesByRound[round] = Math.floor(__private.feesByRound[round]) || 0;
	__private.feesByRound[round] += Math.floor(block.totalFee);

	__private.rewardsByRound[round] = (__private.rewardsByRound[round] || []);
	__private.rewardsByRound[round].push(block.reward);

	__private.delegatesByRound[round] = __private.delegatesByRound[round] || [];
	__private.delegatesByRound[round].push(block.generatorPublicKey);

	var scope = {
		modules: modules,
		__private: __private,
		block: block,
		round: round,
		backwards: false,
		delegates: __private.delegatesByRound[round]
	};

	scope.snapshotRound = (
		library.config.loading.snapshot > 0 && library.config.loading.snapshot === round
	);

	scope.finishRound = (
		(round !== nextRound && __private.delegatesByRound[round].length === slots.delegates) ||
		(block.height === 1 || block.height === 101)
	);

	function Tick (t) {
		var promised = new Round(scope, t);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					delete __private.feesByRound[round];
					delete __private.rewardsByRound[round];
					delete __private.delegatesByRound[round];
					library.bus.message('finishRound', round);
					if (scope.snapshotRound) {
						promised.truncateBlocks().then(function () {
							scope.finishSnapshot = true;
						});
					}
				});
			}
		});
	}

	async.series([
		function (cb) {
			if (scope.finishRound) {
				return __private.getOutsiders(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			library.db.tx(Tick).then(function () {
				return setImmediate(cb);
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, err);
			});
		}
	], function (err) {
		if (scope.finishSnapshot) {
			return done('Snapshot finished');
		} else {
			return done(err);
		}
	});
};

/**
 * Calls helpers.sandbox.callMethod().
 * @implements module:helpers#callMethod
 * @param {function} call - Method to call.
 * @param {*} args - List of arguments.
 * @param {function} cb - Callback function.
 */
Rounds.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
/**
 * Assigns scope app to private variable `modules`.
 * @param {scope} scope - Loaded App.
 */
Rounds.prototype.onBind = function (scope) {
	modules = scope;
};

/**
 * Calculates round and calls sumRound.
 * @implements {calc}
 * @implements {modules.blocks.getLastBlock}
 * @implements {__private.sumRound}
 */
Rounds.prototype.onBlockchainReady = function () {
	var round = self.calc(modules.blocks.getLastBlock().height);

	__private.sumRound(round, function (err) {
		if (!err) {
			__private.loaded = true;
		}
	});
};

/**
 * Emits a 'rounds/change' socket message.
 * @implements {library.network.io.sockets.emit}
 * @param {number} round
 * @emits rounds/change
 */
Rounds.prototype.onFinishRound = function (round) {
	library.network.io.sockets.emit('rounds/change', {number: round});
};

/**
 * Sets private variable `loaded` to false.
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Rounds.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Private methods
/**
 * Generates outsiders array and pushes to param scope variable.
 * Obtains delegate list and for each delegate generate address.
 * @private
 * @implements {modules.delegates.generateDelegateList}
 * @implements {modules.accounts.generateAddressByPublicKey}
 * @param {scope} scope
 * @param {function} cb
 * @return {setImmediateCallback} cb if block height 1 | error
 */
__private.getOutsiders = function (scope, cb) {
	scope.outsiders = [];

	if (scope.block.height === 1) {
		return setImmediate(cb);
	}
	modules.delegates.generateDelegateList(scope.block.height, function (err, roundDelegates) {
		if (err) {
			return setImmediate(cb, err);
		}
		async.eachSeries(roundDelegates, function (delegate, eachCb) {
			if (scope.delegates.indexOf(delegate) === -1) {
				scope.outsiders.push(modules.accounts.generateAddressByPublicKey(delegate));
			}
			return setImmediate(eachCb);
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

/**
 * Gets rows from `round_blocks` and calculates rewards. Loads into private
 * variable fees, rewards and delegates.
 * @private
 * @implements {library.db.query}
 * @param {number} round
 * @param {function} cb
 * @return {setImmediateCallback} err When failed to sum round | cb
 */
__private.sumRound = function (round, cb) {
	library.db.query(sql.summedRound, { round: round, activeDelegates: constants.activeDelegates }).then(function (rows) {
		var rewards = [];

		rows[0].rewards.forEach(function (reward) {
			rewards.push(Math.floor(reward));
		});

		__private.feesByRound[round] = Math.floor(rows[0].fees);
		__private.rewardsByRound[round] = rewards;
		__private.delegatesByRound[round] = rows[0].delegates;

		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error('Failed to sum round', round);
		library.logger.error(err.stack);
		return setImmediate(cb, err);
	});
};

// Export
module.exports = Rounds;
