'use strict';

var pgp = require('pg-promise');
var slots = require('../helpers/slots.js');
var sql = require('../sql/rounds.js');

// Constructor
function Round (scope, t) {
	this.scope = scope;
	this.t = t;
}

// Public methods
Round.prototype.mergeBlockGenerator = function () {
	return this.t.none(
		this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: this.scope.block.generatorPublicKey,
			producedblocks: (this.scope.backwards ? -1 : 1),
			blockId: this.scope.block.id,
			round: this.scope.round
		})
	);
};

Round.prototype.updateMissedBlocks = function () {
	if (this.scope.outsiders.length === 0) {
		return this.t;
	}

	return this.t.none(sql.updateMissedBlocks, [this.scope.outsiders]);
};

Round.prototype.getVotes = function () {
	return this.t.query(sql.getVotes, { round: this.scope.round });
};

Round.prototype.updateVotes = function () {
	var self = this;

	return self.getVotes(self.scope.round).then(function (votes) {
		var queries = votes.map(function (vote) {
			return pgp.as.format(sql.updateVotes, {
				address: self.scope.modules.accounts.generateAddressByPublicKey(vote.delegate),
				amount: Math.floor(vote.amount)
			});
		}).join('');

		if (queries.length > 0) {
			return self.t.none(queries);
		} else {
			return self.t;
		}
	});
};

Round.prototype.flushRound = function () {
	return this.t.none(sql.flush, { round: this.scope.round });
};

Round.prototype.truncateBlocks = function () {
	return this.t.none(sql.truncateBlocks, { height: this.scope.block.height });
};

Round.prototype.applyRound = function () {
	var roundChanges = new RoundChanges(this.scope);
	var queries = [];

	for (var i = 0; i < this.scope.delegates.length; i++) {
		var delegate = this.scope.delegates[i],
				changes	= roundChanges.at(i);

		queries.push(this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: delegate,
			balance: (this.scope.backwards ? -changes.balance : changes.balance),
			u_balance: (this.scope.backwards ? -changes.balance : changes.balance),
			blockId: this.scope.block.id,
			round: this.scope.round,
			fees: (this.scope.backwards ? -changes.fees : changes.fees),
			rewards: (this.scope.backwards ? -changes.rewards : changes.rewards)
		}));

		if (i === this.scope.delegates.length - 1) {
			queries.push(this.scope.modules.accounts.mergeAccountAndGet({
				publicKey: delegate,
				balance: (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
				u_balance: (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
				blockId: this.scope.block.id,
				round: this.scope.round,
				fees: (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
			}));
		}
	}

	return this.t.none(queries.join(''));
};

Round.prototype.land = function () {
	this.scope.__private.ticking = true;
	return this.updateVotes()
		.then(this.updateMissedBlocks.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.applyRound.bind(this))
		.then(this.updateVotes.bind(this))
		.then(this.flushRound.bind(this))
		.then(function () {
			this.scope.__private.ticking = false;
			return this.t;
		}.bind(this));
};

// Constructor
function RoundChanges (scope) {
	this.roundFees = Math.floor(scope.__private.feesByRound[scope.round]) || 0;
	this.roundRewards = (scope.__private.rewardsByRound[scope.round] || []);
}

// Public methods
RoundChanges.prototype.at = function (index) {
	var fees = Math.floor(this.roundFees / slots.delegates);
	var feesRemaining = this.roundFees - (fees * slots.delegates);
	var rewards = Math.floor(this.roundRewards[index]) || 0;

	return {
		fees: fees,
		feesRemaining: feesRemaining,
		rewards: rewards,
		balance: fees + rewards
	};
};

// Export
module.exports = Round;
