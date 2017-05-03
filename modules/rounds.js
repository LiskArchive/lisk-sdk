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

Rounds.prototype.backwardTick = function (block, previousBlock, done) {
	var round = self.calc(block.height);
	var prevRound = self.calc(previousBlock.height);
	var nextRound = self.calc(block.height + 1);

	var scope = {
		modules: modules,
		block: block,
		round: round,
		backwards: true
	};

	function BackwardTick (t) {
		var promised = new Round(scope, t);

		library.logger.debug('Performing backward tick', scope);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					__private.deleteRound(round);
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
			__private.ticking = true;

			if (scope.finishRound) {
				return __private.sumRound(scope.round, cb);
			} else {
				return __private.sumBlock(scope.block, cb);
			}
		},
		function (cb) {
			scope.delegates = __private.delegatesByRound[scope.round];

			if (scope.finishRound) {
				return __private.getOutsiders(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			scope.finishRound = (
				(prevRound === round && nextRound !== round && scope.delegates.length === slots.delegates) ||
				(block.height === 1 || block.height === 101)
			);

			return setImmediate(cb);
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
		__private.ticking = false;
		return done(err);
	});
};

Rounds.prototype.tick = function (block, done) {
	var round = self.calc(block.height);
	var nextRound = self.calc(block.height + 1);

	var scope = {
		modules: modules,
		block: block,
		round: round,
		backwards: false
	};

	function Tick (t) {
		var promised = new Round(scope, t);

		library.logger.debug('Performing forward tick', scope);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					__private.deleteRound(round);
					library.bus.message('finishRound', round);
					if (scope.snapshotRound) {
						return promised.truncateBlocks().then(function () {
							scope.finishSnapshot = true;
						});
					}
				});
			}
		});
	}

	async.series([
		function (cb) {
			__private.ticking = true;

			if (scope.finishRound) {
				return __private.sumRound(scope.round, cb);
			} else {
				return __private.sumBlock(scope.block, cb);
			}
		},
		function (cb) {
			scope.delegates = __private.delegatesByRound[scope.round];

			if (scope.finishRound) {
				return __private.getOutsiders(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			scope.finishRound = (
				(round !== nextRound && scope.delegates.length === slots.delegates) ||
				(block.height === 1 || block.height === 101)
			);

			scope.snapshotRound = (
				library.config.loading.snapshot > 0 && library.config.loading.snapshot === round
			);

			return setImmediate(cb);
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
		__private.ticking = false;

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
			library.logger.debug('Got outsiders', scope.outsiders);
			return setImmediate(cb, err);
		});
	});
};

__private.sumBlock = function (block, cb) {
	library.logger.debug('Summing block', block);

	var round = self.calc(block.height);

	__private.feesByRound[round] = Math.floor(__private.feesByRound[round]) || 0;
	__private.feesByRound[round] += Math.floor(block.totalFee);

	__private.rewardsByRound[round] = (__private.rewardsByRound[round] || []);
	__private.rewardsByRound[round].push(block.reward);

	__private.delegatesByRound[round] = __private.delegatesByRound[round] || [];
	__private.delegatesByRound[round].push(block.generatorPublicKey);

	library.logger.debug('feesByRound', __private.feesByRound[round]);
	library.logger.debug('rewardsByRound', __private.rewardsByRound[round]);
	library.logger.debug('delegatesByRound', __private.delegatesByRound[round]);

	return setImmediate(cb);
};

__private.sumRound = function (round, cb) {
	library.logger.debug('Summing round', round);

	library.db.query(sql.summedRound, { round: round, activeDelegates: constants.activeDelegates }).then(function (rows) {
		var rewards = [];

		rows[0].rewards.forEach(function (reward) {
			rewards.push(Math.floor(reward));
		});

		__private.feesByRound[round] = Math.floor(rows[0].fees);
		__private.rewardsByRound[round] = rewards;
		__private.delegatesByRound[round] = rows[0].delegates;

		library.logger.debug('feesByRound', __private.feesByRound[round]);
		library.logger.debug('rewardsByRound', __private.rewardsByRound[round]);
		library.logger.debug('delegatesByRound', __private.delegatesByRound[round]);

		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error('Failed to sum round', round);
		library.logger.error(err.stack);
		return setImmediate(cb, err);
	});
};

__private.deleteRound = function (round) {
	delete __private.feesByRound[round];
	delete __private.rewardsByRound[round];
	delete __private.delegatesByRound[round];
};

// Export
module.exports = Rounds;
