/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var __private = {};

/**
 * Main BlockReward logic.
 * Initializes variables:
 * - milestones
 * - distance
 * - rewardOffset
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires helpers/constants
 */
// Constructor
function BlockReward() {
	// Array of milestones
	this.milestones = constants.rewards.milestones;

	// Distance between each milestone
	this.distance = Math.floor(constants.rewards.distance);

	// Start rewards at block (n)
	this.rewardOffset = Math.floor(constants.rewards.offset);
}

// Private methods
/**
 * Returns absolute value from number.
 *
 * @private
 * @param {number} height - Description of the param
 * @returns {number}
 * @throws Invalid block height
 * @todo Add description of the param and return value
 */
__private.parseHeight = function(height) {
	if (isNaN(height)) {
		throw 'Invalid block height';
	} else {
		return Math.abs(height);
	}
};

// Public methods
/**
 * Description of the function.
 *
 * @param {number} height - Description of the param
 * @returns {number}
 * @todo Add description of the function, param and return value
 */
BlockReward.prototype.calcMilestone = function(height) {
	height = __private.parseHeight(height);

	var location = Math.trunc((height - this.rewardOffset) / this.distance);
	var lastMile = this.milestones[this.milestones.length - 1];

	if (location > this.milestones.length - 1) {
		return this.milestones.lastIndexOf(lastMile);
	} else {
		return location;
	}
};

/**
 * Description of the function.
 *
 * @param {number} height - Description of the param
 * @return {number}
 * @todo Add description of the function, param and return value
 */
BlockReward.prototype.calcReward = function(height) {
	height = __private.parseHeight(height);

	if (height < this.rewardOffset) {
		return 0;
	} else {
		return this.milestones[this.calcMilestone(height)];
	}
};

/**
 * Description of the function.
 *
 * @param {number} height - Description of the param
 * @return {number}
 * @todo Add description of the function, param and return value
 */
BlockReward.prototype.calcSupply = function(height) {
	height = __private.parseHeight(height);

	if (height < this.rewardOffset) {
		// Rewards not started yet
		return constants.totalAmount;
	}

	var milestone = this.calcMilestone(height);
	var supply = constants.totalAmount;
	var rewards = [];

	var amount = 0;
	var multiplier = 0;

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

	for (let i = 0; i < rewards.length; i++) {
		var reward = rewards[i];
		supply += reward[0] * reward[1];
	}

	return supply;
};

// Export
module.exports = BlockReward;
