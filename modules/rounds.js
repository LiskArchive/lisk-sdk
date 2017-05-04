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
		library: library,
		modules: modules,
		block: block,
		round: round,
		backwards: true
	};

	// Establish if finishing round or not
	scope.finishRound = (
		(prevRound === round && nextRound !== round) || (block.height === 1 || block.height === 101)
	);

	function BackwardTick (t) {
		var promised = new Round(scope, t);

		library.logger.debug('Performing backward tick');
		library.logger.trace(scope);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					return promised.markBlockId();
				});
			} else {
				return promised.markBlockId();
			}
		});
	}

	async.series([
		function (cb) {
			// Start round ticking
			__private.ticking = true;

			// Sum round if finishing round
			if (scope.finishRound) {
				return __private.sumRound(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			// Get outsiders if finishing round
			if (scope.finishRound) {
				return __private.getOutsiders(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			// Perform round tick
			library.db.tx(BackwardTick).then(function () {
				return setImmediate(cb);
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, err);
			});
		}
	], function (err) {
		// Stop round ticking
		__private.ticking = false;
		return done(err);
	});
};

Rounds.prototype.tick = function (block, done) {
	var round = self.calc(block.height);
	var nextRound = self.calc(block.height + 1);

	var scope = {
		library: library,
		modules: modules,
		block: block,
		round: round,
		backwards: false
	};

	// Establish if snapshotting round or not
	scope.snapshotRound = (
		library.config.loading.snapshot > 0 && library.config.loading.snapshot === round
	);

	// Establish if finishing round or not
	scope.finishRound = (
		(round !== nextRound) || (block.height === 1 || block.height === 101)
	);

	function Tick (t) {
		var promised = new Round(scope, t);

		library.logger.debug('Performing forward tick');
		library.logger.trace(scope);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
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
			// Start round ticking
			__private.ticking = true;

			// Sum round if finishing round
			if (scope.finishRound) {
				return __private.sumRound(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		function (cb) {
			// Get outsiders if finishing round
			if (scope.finishRound) {
				return __private.getOutsiders(scope, cb);
			} else {
				return setImmediate(cb);
			}
		},
		// Perform round tick
		function (cb) {
			library.db.tx(Tick).then(function () {
				return setImmediate(cb);
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, err);
			});
		}
	], function (err) {
		// Stop round ticking
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
	__private.loaded = true;
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
	scope.roundOutsiders = [];

	if (scope.block.height === 1) {
		return setImmediate(cb);
	}
	modules.delegates.generateDelegateList(scope.block.height, function (err, roundDelegates) {
		if (err) {
			return setImmediate(cb, err);
		}
		async.eachSeries(roundDelegates, function (delegate, eachCb) {
			if (scope.roundDelegates.indexOf(delegate) === -1) {
				scope.roundOutsiders.push(modules.accounts.generateAddressByPublicKey(delegate));
			}
			return setImmediate(eachCb);
		}, function (err) {
			library.logger.trace('Got outsiders', scope.roundOutsiders);
			return setImmediate(cb, err);
		});
	});
};

__private.sumRound = function (scope, cb) {
	library.logger.debug('Summing round', scope.round);

	library.db.query(sql.summedRound, { round: scope.round, activeDelegates: constants.activeDelegates }).then(function (rows) {
		var rewards = [];

		rows[0].rewards.forEach(function (reward) {
			rewards.push(Math.floor(reward));
		});

		scope.roundFees = Math.floor(rows[0].fees);
		scope.roundRewards = rewards;
		scope.roundDelegates = rows[0].delegates;

		library.logger.trace('roundFees', scope.roundFees);
		library.logger.trace('roundRewards', scope.roundRewards);
		library.logger.trace('roundDelegates', scope.roundDelegates);

		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error('Failed to sum round', scope.round);
		library.logger.error(err.stack);
		return setImmediate(cb, err);
	});
};

// Export
module.exports = Rounds;
