var async = require('async'),
    util = require('util'),
    slots = require('../helpers/slots.js'),
    sandboxHelper = require('../helpers/sandbox.js'),
    constants = require('../helpers/constants.js');

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false;

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

Round.prototype.loaded = function () {
	return private.loaded;
}

// Public methods
Round.prototype.calc = function (height) {
	return Math.floor(height / slots.delegates) + (height % slots.delegates > 0 ? 1 : 0);
}

Round.prototype.getVotes = function (round, cb) {
	var sql = "SELECT d.\"delegate\", d.\"amount\" FROM " +
	          "(SELECT m.\"delegate\", SUM(m.\"amount\") AS \"amount\", \"round\" FROM mem_round m " +
	          "GROUP BY m.\"delegate\", m.\"round\") AS d WHERE \"round\" = (${round})::bigint";

	library.db.query(sql, { round: round }).then(function (rows) {
		return cb(null, rows);
	}).catch(function (err) {
		return cb("Round#getVotes error");
	});
}

Round.prototype.flush = function (round, cb) {
	library.db.none("DELETE FROM mem_round WHERE \"round\" = (${round})::bigint", { round: round }).then(function () {
		return cb();
	}).catch(function (err) {
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
	function done(err) {
		cb && cb(err);
	}

	modules.accounts.mergeAccountAndGet({
		publicKey: block.generatorPublicKey,
		producedblocks: -1,
		blockId: block.id,
		round: modules.round.calc(block.height)
	}, function (err) {
		if (err) {
			return done(err);
		}

		var round = self.calc(block.height);

		var prevRound = self.calc(previousBlock.height);

		private.unFeesByRound[round] = Math.floor(private.unFeesByRound[round]) || 0;
		private.unFeesByRound[round] += Math.floor(block.totalFee);

		private.unRewardsByRound[round] = (private.rewardsByRound[round] || []);
		private.unRewardsByRound[round].push(block.reward);

		private.unDelegatesByRound[round] = private.unDelegatesByRound[round] || [];
		private.unDelegatesByRound[round].push(block.generatorPublicKey);

		if (prevRound !== round || previousBlock.height == 1) {
			if (private.unDelegatesByRound[round].length == slots.delegates || previousBlock.height == 1) {
				var outsiders = [];
				async.series([
					function (cb) {
						if (block.height != 1) {
							modules.delegates.generateDelegateList(block.height, function (err, roundDelegates) {
								if (err) {
									return cb(err);
								}
								for (var i = 0; i < roundDelegates.length; i++) {
									if (private.unDelegatesByRound[round].indexOf(roundDelegates[i]) == -1) {
										outsiders.push(modules.accounts.generateAddressByPublicKey(roundDelegates[i]));
									}
								}
								cb();
							});
						} else {
							cb();
						}
					},
					function (cb) {
						if (!outsiders.length) {
							return cb();
						}
						var escaped = outsiders.map(function (item) {
							return "'" + item + "'";
						});
						library.db.none("UPDATE mem_accounts SET \"missedblocks\" = \"missedblocks\" + 1 WHERE \"address\" IN (" + escaped.join(",") + ")").then(function () {
							return cb();
						}).catch(function (err) {
							return cb("Round#backwardTick error");
						});
					},
					function (cb) {
						self.getVotes(round, function (err, votes) {
							if (err) {
								return cb(err);
							}
							async.eachSeries(votes, function (vote, cb) {
								library.db.none("UPDATE mem_accounts SET \"vote\" = \"vote\" + (${amount})::bigint WHERE \"address\" = ${address}", {
									address: modules.accounts.generateAddressByPublicKey(vote.delegate),
									amount: Math.floor(vote.amount)
								}).then(function () {
									return cb();
								}).catch(function (err) {
									return cb("Round#backwardTick error");
								});
							}, function (err) {
								self.flush(round, function (err2) {
									cb(err || err2);
								});
							})
						});
					},
					function (cb) {
						var roundChanges = new RoundChanges(round);

						async.forEachOfSeries(private.unDelegatesByRound[round], function (delegate, index, cb) {
							var changes = roundChanges.at(index);

							modules.accounts.mergeAccountAndGet({
								publicKey: delegate,
								balance: -changes.balance,
								u_balance: -changes.balance,
								blockId: block.id,
								round: modules.round.calc(block.height),
								fees: -changes.fees,
								rewards: -changes.rewards
							}, function (err) {
								if (err) {
									return cb(err);
								}
								if (index === 0) {
									modules.accounts.mergeAccountAndGet({
										publicKey: delegate,
										balance: -changes.feesRemaining,
										u_balance: -changes.feesRemaining,
										blockId: block.id,
										round: modules.round.calc(block.height),
										fees: -changes.feesRemaining,
									}, cb);
								} else {
									cb();
								}
							});
						}, cb);
					},
					function (cb) {
						self.getVotes(round, function (err, votes) {
							if (err) {
								return cb(err);
							}
							async.eachSeries(votes, function (vote, cb) {
								library.db.none("UPDATE mem_accounts SET \"vote\" = \"vote\" + (${amount})::bigint WHERE \"address\" = ${address}", {
									address: modules.accounts.generateAddressByPublicKey(vote.delegate),
									amount: Math.floor(vote.amount)
								}).then(function () {
									return cb();
								}).catch(function (err) {
									return cb("Round#backwardTick error");
								});
							}, function (err) {
								self.flush(round, function (err2) {
									cb(err || err2);
								});
							})
						});
					}
				], function (err) {
					delete private.unFeesByRound[round];
					delete private.unRewardsByRound[round];
					delete private.unDelegatesByRound[round];
					done(err)
				});
			} else {
				done();
			}
		} else {
			done();
		}
	});
}

Round.prototype.tick = function (block, cb) {
	function done(err) {
		cb && setImmediate(cb, err);
	}

	modules.accounts.mergeAccountAndGet({
		publicKey: block.generatorPublicKey,
		producedblocks: 1,
		blockId: block.id,
		round: modules.round.calc(block.height)
	}, function (err) {
		if (err) {
			return done(err);
		}
		var round = self.calc(block.height);

		private.feesByRound[round] = Math.floor(private.feesByRound[round]) || 0;
		private.feesByRound[round] += Math.floor(block.totalFee);

		private.rewardsByRound[round] = (private.rewardsByRound[round] || []);
		private.rewardsByRound[round].push(block.reward);

		private.delegatesByRound[round] = private.delegatesByRound[round] || [];
		private.delegatesByRound[round].push(block.generatorPublicKey);

		var nextRound = self.calc(block.height + 1);

		if (round !== nextRound || block.height == 1) {
			if (private.delegatesByRound[round].length == slots.delegates || block.height == 1 || block.height == 101) {
				var outsiders = [];

				async.series([
					function (cb) {
						if (block.height != 1) {
							modules.delegates.generateDelegateList(block.height, function (err, roundDelegates) {
								if (err) {
									return cb(err);
								}
								for (var i = 0; i < roundDelegates.length; i++) {
									if (private.delegatesByRound[round].indexOf(roundDelegates[i]) == -1) {
										outsiders.push(modules.accounts.generateAddressByPublicKey(roundDelegates[i]));
									}
								}
								cb();
							});
						} else {
							cb();
						}
					},
					function (cb) {
						if (!outsiders.length) {
							return cb();
						}
						var escaped = outsiders.map(function (item) {
							return "'" + item + "'";
						});
						library.db.none("UPDATE mem_accounts SET \"missedblocks\" = \"missedblocks\" + 1 WHERE \"address\" IN (" + escaped.join(",") + ")").then(function () {
							return cb();
						}).catch(function (err) {
							return cb("Round#tick error");
						});
					},
					function (cb) {
						self.getVotes(round, function (err, votes) {
							if (err) {
								return cb(err);
							}
							async.eachSeries(votes, function (vote, cb) {
								library.db.none("UPDATE mem_accounts SET \"vote\" = \"vote\" + (${amount})::bigint WHERE \"address\" = ${address}", {
									address: modules.accounts.generateAddressByPublicKey(vote.delegate),
									amount: Math.floor(vote.amount)
								}).then(function () {
									return cb();
								}).catch(function (err) {
									return cb("Round#tick error");
								});
							}, function (err) {
								self.flush(round, function (err2) {
									cb(err || err2);
								});
							});
						});
					},
					function (cb) {
						var roundChanges = new RoundChanges(round);

						async.forEachOfSeries(private.delegatesByRound[round], function (delegate, index, cb) {
							var changes = roundChanges.at(index);

							modules.accounts.mergeAccountAndGet({
								publicKey: delegate,
								balance: changes.balance,
								u_balance: changes.balance,
								blockId: block.id,
								round: modules.round.calc(block.height),
								fees: changes.fees,
								rewards: changes.rewards
							}, function (err) {
								if (err) {
									return cb(err);
								}
								if (index === private.delegatesByRound[round].length - 1) {
									modules.accounts.mergeAccountAndGet({
										publicKey: delegate,
										balance: changes.feesRemaining,
										u_balance: changes.feesRemaining,
										blockId: block.id,
										round: modules.round.calc(block.height),
										fees: changes.feesRemaining
									}, cb);
								} else {
									cb();
								}
							});
						}, cb);
					},
					function (cb) {
						self.getVotes(round, function (err, votes) {
							if (err) {
								return cb(err);
							}
							async.eachSeries(votes, function (vote, cb) {
								library.db.none("UPDATE mem_accounts SET \"vote\" = \"vote\" + (${amount})::bigint WHERE \"address\" = ${address}", {
									address: modules.accounts.generateAddressByPublicKey(vote.delegate),
									amount: Math.floor(vote.amount)
								}).then(function () {
									return cb();
								}).catch(function (err) {
									return cb("Round#tick error");
								});
							}, function (err) {
								library.bus.message('finishRound', round);
								self.flush(round, function (err2) {
									cb(err || err2);
								});
							})
						});
					}
				], function (err) {
					delete private.feesByRound[round];
					delete private.rewardsByRound[round];
					delete private.delegatesByRound[round];
					done(err);
				});
			} else {
				done();
			}
		} else {
			done();
		}
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

// Shared

// Export
module.exports = Round;
