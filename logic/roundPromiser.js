'use strict';

var pgp = require('pg-promise');
var slots = require('../helpers/slots.js');
var sql = require('../sql/round.js');

function RoundPromiser (scope, t) {
	var modules = scope.modules;
	var __private = scope.__private;
	var self = this;

	function RoundChanges (round) {
		var roundFees = Math.floor(__private.feesByRound[round]) || 0;
		var roundRewards = (__private.rewardsByRound[round] || []);

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
		};
	}

	this.mergeBlockGenerator = function () {
		return t.none(
			modules.accounts.mergeAccountAndGet({
				publicKey: scope.block.generatorPublicKey,
				producedblocks: (scope.backwards ? -1 : 1),
				blockId: scope.block.id,
				round: scope.round
			})
		);
	};

	this.updateMissedBlocks = function () {
		if (scope.outsiders.length === 0) {
			return t;
		}

		return t.none(sql.updateMissedBlocks, [scope.outsiders]);
	};

	this.getVotes = function () {
		return t.query(sql.getVotes, { round: scope.round });
	};

	this.updateVotes = function () {
		return self.getVotes(scope.round).then(function (votes) {
			var queries = votes.map(function (vote) {
				return pgp.as.format(sql.updateVotes, {
					address: modules.accounts.generateAddressByPublicKey(vote.delegate),
					amount: Math.floor(vote.amount)
				});
			}).join('');

			if (queries.length > 0) {
				return t.none(queries);
			} else {
				return t;
			}
		});
	};

	this.flushRound = function () {
		return t.none(sql.flush, { round: scope.round });
	};

	this.truncateBlocks = function () {
		return t.none(sql.truncateBlocks, { height: scope.block.height });
	};

	this.applyRound = function () {
		var roundChanges = new RoundChanges(scope.round, __private);
		var queries = [];

		for (var i = 0; i < scope.delegates.length; i++) {
			var delegate = scope.delegates[i],
					changes	= roundChanges.at(i);

			queries.push(modules.accounts.mergeAccountAndGet({
				publicKey: delegate,
				balance: (scope.backwards ? -changes.balance : changes.balance),
				u_balance: (scope.backwards ? -changes.balance : changes.balance),
				blockId: scope.block.id,
				round: scope.round,
				fees: (scope.backwards ? -changes.fees : changes.fees),
				rewards: (scope.backwards ? -changes.rewards : changes.rewards)
			}));

			if (i === scope.delegates.length - 1) {
				queries.push(modules.accounts.mergeAccountAndGet({
					publicKey: delegate,
					balance: (scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
					u_balance: (scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
					blockId: scope.block.id,
					round: scope.round,
					fees: (scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
				}));
			}
		}

		return t.none(queries.join(''));
	};

	this.land = function () {
		__private.ticking = true;
		return this.updateVotes()
			.then(this.updateMissedBlocks)
			.then(this.flushRound)
			.then(this.applyRound)
			.then(this.updateVotes)
			.then(this.flushRound)
			.then(function () {
				__private.ticking = false;
				return t;
			});
	};
}

// Export
module.exports = RoundPromiser;
