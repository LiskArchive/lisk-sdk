var constants = require('./constants.js');

function BlockStatus() {
	var milestones = [
		500000000, // Initial Reward
		400000000, // Milestone 1
		300000000, // Milestone 2
		200000000, // Milestone 3
		100000000  // Milestone 4
	];

	var distance = 3000000; // Distance between each milestone

	var parseHeight = function (height) {
		height = parseInt(height);

		if (isNaN(height)) {
			throw new Error('Invalid block height');
		} else {
			return Math.abs(height);
		}
	};

	this.calcMilestone = function (height) {
		var location = (parseHeight(height) / distance).toFixed(0),
		    lastMile = milestones[milestones.length - 1];

		if (location > milestones.length) {
			return lastMile;
		} else {
			return location;
		}
	};

	this.calcReward = function (height) {
		return milestones[this.calcMilestone(height)];
	};

	this.calcSupply = function (height) {
		var height    = parseHeight(height),
		    milestone = this.calcMilestone(height),
		    supply    = constants.totalAmount / Math.pow(10,8),
		    rewards   = [];

		var amount = 0, multiplier = 0;

		for (var i = 0; i < milestones.length; i++) {
			if (milestone >= i) {
				multiplier = (milestones[i] / Math.pow(10,8));

				if (height < distance) {
					amount = height % distance;
				} else {
					amount = distance;
					height -= distance;
				}

				rewards.push([amount, multiplier]);
			} else {
				break;
			}
		}

		for (i = 0; i < rewards.length; i++) {
			var reward = rewards[i];

			supply += reward[0] * reward[1];
			if (i == 0) { supply -= reward[1]; }
		}

		return supply * Math.pow(10,8);
	};
}

// Exports
module.exports = BlockStatus;
