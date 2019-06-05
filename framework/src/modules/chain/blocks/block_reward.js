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

const BigNum = require('@liskhq/bignum');

/**
 * Returns absolute value from number.
 *
 * @private
 * @param {number} height
 * @returns {number}
 * @throws If block height invalid
 * @todo Add description for the params and the return value
 */
const parseHeight = height => {
	if (
		typeof height === 'undefined' ||
		height === null ||
		Number.isNaN(height)
	) {
		throw new TypeError('Invalid block height');
	} else {
		return Math.abs(height);
	}
};

/**
 * Description of the function.
 *
 * @param {number} height
 * @returns {number}
 * @todo Add description for the function, params and the return value
 */
const calcMilestone = ({ height, distance, rewardOffset, milestones }) => {
	distance = Math.floor(distance);
	height = parseHeight(height);

	const location = Math.trunc((height - rewardOffset) / distance);
	const lastMile = milestones[milestones.length - 1];

	if (location > milestones.length - 1) {
		return milestones.lastIndexOf(lastMile);
	}
	return location;
};

/**
 * Description of the function.
 *
 * @param {number} height
 * @returns {Bignumber}
 * @todo Add description for the function, params and the return value
 */
const calcReward = ({ height, distance, rewardOffset, milestones }) => {
	height = parseHeight(height);

	if (height < this.rewardOffset) {
		return new BigNum(0);
	}
	return new BigNum(
		milestones[calcMilestone(height, distance, rewardOffset, milestones)]
	);
};

/**
 * Description of the function.
 *
 * @param {number} height
 * @returns {Bignumber}
 * @todo Add description for the function, params and the return value
 */
const calcSupply = ({
	height,
	distance,
	rewardOffset,
	milestones,
	totalAmount,
}) => {
	distance = Math.floor(distance);
	height = parseHeight(height);
	let supply = new BigNum(totalAmount);

	if (height < rewardOffset) {
		// Rewards not started yet
		return supply;
	}

	const milestone = calcMilestone(height);
	const rewards = [];

	let amount = 0;
	let multiplier = 0;

	// Remove offset from height
	height -= rewardOffset - 1;

	for (let i = 0; i < milestones.length; i++) {
		if (milestone >= i) {
			multiplier = milestones[i];

			if (height < distance) {
				// Measure distance thus far
				amount = height % distance;
			} else {
				amount = distance; // Assign completed milestone
				height -= distance; // Deduct from total height

				// After last milestone
				if (height > 0 && i === milestones.length - 1) {
					amount += height;
				}
			}

			rewards.push([amount, multiplier]);
		} else {
			break; // Milestone out of bounds
		}
	}

	for (let i = 0; i < rewards.length; i++) {
		const reward = rewards[i];
		supply = supply.plus(new BigNum(reward[0]).times(reward[1]));
	}

	return supply;
};

module.exports = { calcMilestone, calcSupply, calcReward };
