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

// Constructor
function Rounds (cb, scope) {
	library = scope;
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
Rounds.prototype.loaded = function () {
	return __private.loaded;
};

Rounds.prototype.ticking = function () {
	return __private.ticking;
};

Rounds.prototype.calc = function (height) {
	return Math.ceil(height / slots.delegates);
};

Rounds.prototype.flush = function (round, cb) {
	library.db.none(sql.flush, {round: round}).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Rounds#flush error');
	});
};

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

Rounds.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Rounds.prototype.onBind = function (scope) {
	modules = scope;
};

Rounds.prototype.onBlockchainReady = function () {
	var round = self.calc(modules.blocks.getLastBlock().height);

	__private.sumRound(round, function (err) {
		if (!err) {
			__private.loaded = true;
		}
	});
};

Rounds.prototype.onFinishRound = function (round) {
	library.network.io.sockets.emit('rounds/change', {number: round});
};

Rounds.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Private methods
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
