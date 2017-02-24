'use strict';

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

module.exports = RoundChanges;