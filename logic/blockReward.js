'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var __private = {};

// Constructor
function BlockReward () {
	// Array of milestones
	this.milestones = constants.rewards.milestones;

	// Distance between each milestone
	this.distance = Math.floor(constants.rewards.distance);

	// Start rewards at block (n)
	this.rewardOffset = Math.floor(constants.rewards.offset);
}

// Private methods
__private.parseHeight = function (height) {
	if (isNaN(height)) {
		throw 'Invalid block height';
	} else {
		return Math.abs(height);
	}
};

// Public methods
BlockReward.prototype.calcMilestone = function (height) {
	height = __private.parseHeight(height);

	var location = Math.trunc((height - this.rewardOffset) / this.distance);
	var lastMile = this.milestones[this.milestones.length - 1];

	if (location > (this.milestones.length - 1)) {
		return this.milestones.lastIndexOf(lastMile);
	} else {
		return location;
	}
};

BlockReward.prototype.calcReward = function (height) {
	height = __private.parseHeight(height);

	if (height < this.rewardOffset) {
		return 0;
	} else {
		return this.milestones[this.calcMilestone(height)];
	}
};

BlockReward.prototype.calcSupply = function (height) {
	height = __private.parseHeight(height);

	if (height < this.rewardOffset) {
		// Rewards not started yet
		return constants.totalAmount;
	}

	var milestone = this.calcMilestone(height);
	var supply    = constants.totalAmount;
	var rewards   = [];

	var amount = 0, multiplier = 0;

	// Remove offset from height
	height -= this.rewardOffset - 1;

	for (var i = 0; i < this.milestones.length; i++) {
		if (milestone >= i) {
			multiplier = this.milestones[i];

			if (height < this.distance) {
				// Measure this.distance thus far
				amount = height % this.distance;
			} else {
				amount = this.distance; // Assign completed milestone
				height -= this.distance; // Deduct from total height

				// After last milestone
				if (height > 0 && i === this.milestones.length - 1) {
					amount += height;
				}
			}

			rewards.push([amount, multiplier]);
		} else {
			break; // Milestone out of bounds
		}
	}

	for (i = 0; i < rewards.length; i++) {
		var reward = rewards[i];
		supply += reward[0] * reward[1];
	}

	return supply;
};

// Export
module.exports = BlockReward;
