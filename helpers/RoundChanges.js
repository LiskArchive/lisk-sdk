'use strict';

var bignum = require('./bignum');
var slots = require('./slots');
var exceptions = require('./exceptions');

// Constructor
function RoundChanges (scope) {
	this.roundFees = Math.floor(scope.roundFees) || 0;
	this.roundRewards = (scope.roundRewards || []);

	// Apply exception for round if required
	if (exceptions.rounds[scope.round]) {
		// Apply rewards factor
		this.roundRewards.forEach(function (reward, index) {
			this.roundRewards[index] = new bignum(reward.toPrecision(15)).times(exceptions.rounds[scope.round].rewards_factor).floor();
		}.bind(this));

		// Apply fees factor and bonus
		this.roundFees = new bignum(this.roundFees.toPrecision(15)).times(exceptions.rounds[scope.round].fees_factor).plus(exceptions.rounds[scope.round].fees_bonus).floor();
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
