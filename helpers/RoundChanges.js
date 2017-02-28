'use strict';

var bignum = require('./bignum');
var slots = require('./slots');

// Constructor
function RoundChanges (scope) {
	if (scope.backwards) {
		this.roundFees = Math.floor(scope.__private.unFeesByRound[scope.round]) || 0;
		this.roundRewards = (scope.__private.unRewardsByRound[scope.round] || []);
	} else {
		this.roundFees = Math.floor(scope.__private.feesByRound[scope.round]) || 0;
		this.roundRewards = (scope.__private.rewardsByRound[scope.round] || []);
	}
}

// Public methods
RoundChanges.prototype.at = function (index) {
	var fees = new bignum(this.roundFees.toPrecision(15)).dividedBy(slots.delegates).floor();
	var feesRemaining = new bignum(this.roundFees.toPrecision(15)).minus(fees.times(slots.delegates));
	var rewards = new bignum(this.roundRewards[index].toPrecision(15)).floor() || 0;

	return {
		fees: Number(fees.toFixed()),
		feesRemaining: Number(feesRemaining.toFixed()),
		rewards: Number(rewards.toFixed()),
		balance: Number(fees.add(rewards).toFixed())
	};
};

module.exports = RoundChanges;
