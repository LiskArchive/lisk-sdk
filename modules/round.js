var async = require('async'),
    util = require('util'),
    pgp = require("pg-promise"),
    slots = require('../helpers/slots.js'),
    sandboxHelper = require('../helpers/sandbox.js'),
    constants = require('../helpers/constants.js');

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

private.block = {};
private.round = null;
private.delegates = [];
private.outsiders = [];

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
function RoundPromiser (backwards, t) {
	var self = this;

	this.mergeBlockGenerator = function () {
		return t.none(
			modules.accounts.mergeAccountAndGet({
				publicKey: private.block.generatorPublicKey,
				producedblocks: (backwards ? -1 : 1),
				blockId: private.block.id,
				round: private.round
			})
		);
	}

	this.updateMissedBlocks = function () {
		if (private.outsiders.length == 0) {
			return t;
		}

		var escaped = private.outsiders.map(function (item) {
			return "'" + item + "'";
		});

		return t.none("UPDATE mem_accounts SET \"missedblocks\" = \"missedblocks\" + 1 WHERE \"address\" IN (" + escaped.join(",") + ")");
	}

	this.getVotes = function () {
		var sql = "SELECT d.\"delegate\", d.\"amount\" FROM " +
		          "(SELECT m.\"delegate\", SUM(m.\"amount\") AS \"amount\", \"round\" FROM mem_round m " +
		          "GROUP BY m.\"delegate\", m.\"round\") AS d WHERE \"round\" = (${round})::bigint";

		return t.query(sql, { round: private.round });
	}

	this.updateVotes = function () {
		return self.getVotes(private.round).then(function (votes) {
			var queries = votes.map(function (vote) {
				return pgp.as.format("UPDATE mem_accounts SET \"vote\" = \"vote\" + (${amount})::bigint WHERE \"address\" = ${address};", {
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
		return t.none("DELETE FROM mem_round WHERE \"round\" = (${round})::bigint", { round: private.round });
	}

	this.applyRound = function () {
		var roundChanges = new RoundChanges(private.round);
		var queries = "";

		for (var i = 0; i < private.delegates.length; i++) {
			var delegate = private.delegates[i],
			    changes  = roundChanges.at(i);

			queries += modules.accounts.mergeAccountAndGet({
				publicKey: delegate,
				balance: (backwards ? -changes.balance : changes.balance),
				u_balance: (backwards ? -changes.balance : changes.balance),
				blockId: private.block.id,
				round: private.round,
				fees: (backwards ? -changes.fees : changes.fees),
				rewards: (backwards ? -changes.rewards : changes.rewards)
			});

			if (i === private.delegates.length - 1) {
				queries += modules.accounts.mergeAccountAndGet({
					publicKey: delegate,
					balance: (backwards ? -changes.feesRemaining : changes.feesRemaining),
					u_balance: (backwards ? -changes.feesRemaining : changes.feesRemaining),
					blockId: private.block.id,
					round: private.round,
					fees: (backwards ? -changes.feesRemaining : changes.feesRemaining),
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
	library.db.none("DELETE FROM mem_round WHERE \"round\" = (${round})::bigint", { round: round }).then(function () {
		return cb();
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Round#flush error");
	});
}

Round.prototype.directionSwap = function (direction, lastBlock, cb) {
	if (direction == 'backward') {
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

Round.prototype.backwardTick = function (block, previousBlock, cb) {
	function done (err) {
		return cb && setImmediate(cb, err);
	}

	var round = self.calc(block.height);
	var prevRound = self.calc(previousBlock.height);

	private.block = block;
	private.round = round;

	private.unFeesByRound[round] = Math.floor(private.unFeesByRound[round]) || 0;
	private.unFeesByRound[round] += Math.floor(block.totalFee);

	private.unRewardsByRound[round] = (private.rewardsByRound[round] || []);
	private.unRewardsByRound[round].push(block.reward);

	private.unDelegatesByRound[round] = private.unDelegatesByRound[round] || [];
	private.unDelegatesByRound[round].push(block.generatorPublicKey);

	private.delegates = private.unDelegatesByRound[round];

	function BackwardTick (t) {
		var promised = new RoundPromiser(true, t);

		return promised.mergeBlockGenerator().then(function () {

			if (prevRound !== round || previousBlock.height == 1) {

				if (private.unDelegatesByRound[round].length == slots.delegates || previousBlock.height == 1) {

					return promised.land().then(function () {
						delete private.unFeesByRound[round];
						delete private.unRewardsByRound[round];
						delete private.unDelegatesByRound[round];
					});
				}
			}
		});
	}

	async.series([
		function (cb) {
			return private.getOutsiders(cb);
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

Round.prototype.tick = function (block, cb) {
	function done (err) {
		return cb && setImmediate(cb, err);
	}

	var round = self.calc(block.height);
	var nextRound = self.calc(block.height + 1);

	private.block = block;
	private.round = round;

	private.feesByRound[round] = Math.floor(private.feesByRound[round]) || 0;
	private.feesByRound[round] += Math.floor(block.totalFee);

	private.rewardsByRound[round] = (private.rewardsByRound[round] || []);
	private.rewardsByRound[round].push(block.reward);

	private.delegatesByRound[round] = private.delegatesByRound[round] || [];
	private.delegatesByRound[round].push(block.generatorPublicKey);

	private.delegates = private.delegatesByRound[round];

	function Tick (t) {
		var promised = new RoundPromiser(false, t);

		return promised.mergeBlockGenerator().then(function () {

			if (round !== nextRound || block.height == 1) {

				if (private.delegatesByRound[round].length == slots.delegates || block.height == 1) {

					return promised.land().then(function () {
						delete private.feesByRound[round];
						delete private.rewardsByRound[round];
						delete private.delegatesByRound[round];
						library.bus.message('finishRound', round);
					});
				}
			}
		});
	}

	async.series([
		function (cb) {
			return private.getOutsiders(cb);
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

	var sql = "SELECT SUM(b.\"totalFee\")::bigint AS \"fees\", ARRAY_AGG(b.\"reward\") AS \"rewards\", ARRAY_AGG(ENCODE(b.\"generatorPublicKey\", 'hex')) AS \"delegates\" " +
	          "FROM blocks b WHERE (SELECT (CAST(b.\"height\" / 101 AS INTEGER) + (CASE WHEN b.\"height\" % 101 > 0 THEN 1 ELSE 0 END))) = ${round}";

	library.db.query(sql, { round: round }).then(function (rows) {
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
	library.network.io.sockets.emit('rounds/change', {number: round});
}

Round.prototype.cleanup = function (cb) {
	private.loaded = false;
	cb();
}

// Private

private.getOutsiders = function (cb) {
	if (private.block.height == 1) {
		return cb();
	}
	modules.delegates.generateDelegateList(private.block.height, function (err, roundDelegates) {
		if (err) {
			return cb(err);
		}
		private.outsiders = [];
		for (var i = 0; i < roundDelegates.length; i++) {
			if (private.delegates.indexOf(roundDelegates[i]) == -1) {
				private.outsiders.push(modules.accounts.generateAddressByPublicKey(roundDelegates[i]));
			}
		}
		return cb();
	});
}

// Shared

// Export
module.exports = Round;
