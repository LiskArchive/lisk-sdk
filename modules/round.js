var async = require("async");
var util = require("util");
var pgp = require("pg-promise");
var slots = require("../helpers/slots.js");
var constants = require("../helpers/constants.js");
var sandboxHelper = require("../helpers/sandbox.js");
var sql = require("../sql/round.js");

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false;
private.ticking = false;

private.feesByRound = {};
private.rewardsByRound = {};
private.delegatesByRound = {};
private.unFeesByRound = {};
private.unRewardsByRound = {};
private.unDelegatesByRound = {};

// Constructor
function Round(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;
	setImmediate(cb, null, self);
}

// Round changes
function RoundChanges (round) {
	var roundFees = Math.floor(private.feesByRound[round]) || 0;
	var roundRewards = (private.rewardsByRound[round] || []);

	this.at = function (index) {
		var fees = Math.floor(roundFees / slots.delegates),
		    feesRemaining = roundFees - (fees * slots.delegates),
		    rewards = Math.floor(roundRewards[index]) || 0;

		return {
			fees : fees,
			feesRemaining : feesRemaining,
			rewards : rewards,
			balance : fees + rewards
		};
	}
}

// Round promiser
function RoundPromiser (scope, t) {
	var self = this;

	this.mergeBlockGenerator = function () {
		return t.none(
			modules.accounts.mergeAccountAndGet({
				publicKey: scope.block.generatorPublicKey,
				producedblocks: (scope.backwards ? -1 : 1),
				blockId: scope.block.id,
				round: scope.round
			})
		);
	}

	this.updateMissedBlocks = function () {
		if (scope.outsiders.length == 0) {
			return t;
		}

		return t.none(sql.updateMissedBlocks, [scope.outsiders]);
	}

	this.getVotes = function () {
		return t.query(sql.getVotes, { round: scope.round });
	}

	this.updateVotes = function () {
		return self.getVotes(scope.round).then(function (votes) {
			var queries = votes.map(function (vote) {
				return pgp.as.format(sql.updateVotes, {
					address: modules.accounts.generateAddressByPublicKey(vote.delegate),
					amount: Math.floor(vote.amount)
				});
			}).join("");

			if (queries.length > 0) {
				return t.none(queries);
			} else {
				return t;
			}
		});
	}

	this.flushRound = function () {
		return t.none(sql.flush, { round: scope.round });
	}

	this.applyRound = function () {
		var roundChanges = new RoundChanges(scope.round);
		var queries = "";

		for (var i = 0; i < scope.delegates.length; i++) {
			var delegate = scope.delegates[i],
			    changes  = roundChanges.at(i);

			queries += modules.accounts.mergeAccountAndGet({
				publicKey: delegate,
				balance: (scope.backwards ? -changes.balance : changes.balance),
				u_balance: (scope.backwards ? -changes.balance : changes.balance),
				blockId: scope.block.id,
				round: scope.round,
				fees: (scope.backwards ? -changes.fees : changes.fees),
				rewards: (scope.backwards ? -changes.rewards : changes.rewards)
			});

			if (i === scope.delegates.length - 1) {
				queries += modules.accounts.mergeAccountAndGet({
					publicKey: delegate,
					balance: (scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
					u_balance: (scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
					blockId: scope.block.id,
					round: scope.round,
					fees: (scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
				});
			}
		}

		return t.none(queries);
	}

	this.land = function () {
		private.ticking = true;
		return this.updateVotes()
			.then(this.updateMissedBlocks)
			.then(this.flushRound)
			.then(this.applyRound)
			.then(this.updateVotes)
			.then(this.flushRound)
			.then(function () {
				private.ticking = false;
				return t;
			});
	}
}

// Public methods
Round.prototype.loaded = function () {
	return private.loaded;
}

Round.prototype.ticking = function () {
	return private.ticking;
}

Round.prototype.calc = function (height) {
	return Math.floor(height / slots.delegates) + (height % slots.delegates > 0 ? 1 : 0);
}

Round.prototype.flush = function (round, cb) {
	library.db.none(sql.flush, { round: round }).then(function () {
		return cb();
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Round#flush error");
	});
}

Round.prototype.directionSwap = function (direction, lastBlock, cb) {
	if (direction == "backward") {
		private.feesByRound = {};
		private.rewardsByRound = {};
		private.delegatesByRound = {};
		self.flush(self.calc(lastBlock.height), cb);
	} else {
		private.unFeesByRound = {};
		private.unRewardsByRound = {};
		private.unDelegatesByRound = {};
		self.flush(self.calc(lastBlock.height), cb);
	}
}

Round.prototype.backwardTick = function (block, previousBlock, done) {
	var round = self.calc(block.height);
	var prevRound = self.calc(previousBlock.height);

	private.unFeesByRound[round] = Math.floor(private.unFeesByRound[round]) || 0;
	private.unFeesByRound[round] += Math.floor(block.totalFee);

	private.unRewardsByRound[round] = (private.rewardsByRound[round] || []);
	private.unRewardsByRound[round].push(block.reward);

	private.unDelegatesByRound[round] = private.unDelegatesByRound[round] || [];
	private.unDelegatesByRound[round].push(block.generatorPublicKey);

	var scope = {
		block: block,
		round: round,
		backwards: true,
		delegates: private.unDelegatesByRound[round]
	};

	scope.finishRound = (
		(prevRound !== round && private.unDelegatesByRound[round].length == slots.delegates) ||
		(previousBlock.height == 1)
	);

	function BackwardTick (t) {
		var promised = new RoundPromiser(scope, t);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					delete private.unFeesByRound[round];
					delete private.unRewardsByRound[round];
					delete private.unDelegatesByRound[round];
				});
			}
		});
	}

	async.series([
		function (cb) {
			if (scope.finishRound) {
				return private.getOutsiders(scope, cb);
			} else {
				return cb();
			}
		},
		function (cb) {
			library.db.tx(BackwardTick).then(function () {
				return cb();
			}).catch(function (err) {
				library.logger.error(err.toString());
				return cb(err);
			});
		}
	], function (err) {
		return done(err);
	});
}

Round.prototype.tick = function (block, done) {
	var round = self.calc(block.height);
	var nextRound = self.calc(block.height + 1);

	private.feesByRound[round] = Math.floor(private.feesByRound[round]) || 0;
	private.feesByRound[round] += Math.floor(block.totalFee);

	private.rewardsByRound[round] = (private.rewardsByRound[round] || []);
	private.rewardsByRound[round].push(block.reward);

	private.delegatesByRound[round] = private.delegatesByRound[round] || [];
	private.delegatesByRound[round].push(block.generatorPublicKey);

	var scope = {
		block: block,
		round: round,
		backwards: false,
		delegates: private.delegatesByRound[round]
	};

	scope.finishRound = (
		(round !== nextRound && private.delegatesByRound[round].length == slots.delegates) ||
		(block.height == 1 || block.height == 101)
	);

	function Tick (t) {
		var promised = new RoundPromiser(scope, t);

		return promised.mergeBlockGenerator().then(function () {
			if (scope.finishRound) {
				return promised.land().then(function () {
					delete private.feesByRound[round];
					delete private.rewardsByRound[round];
					delete private.delegatesByRound[round];
					library.bus.message("finishRound", round);
				});
			}
		});
	}

	async.series([
		function (cb) {
			if (scope.finishRound) {
				return private.getOutsiders(scope, cb);
			} else {
				return cb();
			}
		},
		function (cb) {
			library.db.tx(Tick).then(function () {
				return cb();
			}).catch(function (err) {
				library.logger.error(err.toString());
				return cb(err);
			});
		}
	], function (err) {
		return done(err);
	});
}

Round.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Round.prototype.onBind = function (scope) {
	modules = scope;
}

Round.prototype.onBlockchainReady = function () {
	var round = self.calc(modules.blocks.getLastBlock().height);

	library.db.query(sql.summedRound, { round: round, activeDelegates:constants.activeDelegates }).then(function (rows) {

		var rewards = [];

		rows[0].rewards.forEach(function (reward) {
			rewards.push(Math.floor(reward));
		});

		private.feesByRound[round] = Math.floor(rows[0].fees);
		private.rewardsByRound[round] = rewards;
		private.delegatesByRound[round] = rows[0].delegates;
		private.loaded = true;

	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Round#onBlockchainReady error");
	});
}

Round.prototype.onFinishRound = function (round) {
	library.network.io.sockets.emit("rounds/change", {number: round});
}

Round.prototype.cleanup = function (cb) {
	private.loaded = false;
	cb();
}

// Private

private.getOutsiders = function (scope, cb) {
	scope.outsiders = [];

	if (scope.block.height == 1) {
		return cb();
	}
	modules.delegates.generateDelegateList(scope.block.height, function (err, roundDelegates) {
		if (err) {
			return cb(err);
		}
		async.eachSeries(roundDelegates, function (delegate, eachCb) {
			if (scope.delegates.indexOf(delegate) == -1) {
				scope.outsiders.push(modules.accounts.generateAddressByPublicKey(delegate));
			}
			return eachCb();
		}, function (err) {
			return cb(err);
		});
	});
}

// Shared

// Export
module.exports = Round;
