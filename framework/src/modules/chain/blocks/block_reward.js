/*
 * Copyright © 2019 Lisk Foundation
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
const calculateMilestone = (height, blockRewardArgs) => {
	height = parseHeight(height);
	const distance = Math.floor(blockRewardArgs.distance);

	const location = Math.trunc(
		(height - blockRewardArgs.rewardOffset) / distance,
	);
	const lastMile =
		blockRewardArgs.milestones[blockRewardArgs.milestones.length - 1];

	if (location > blockRewardArgs.milestones.length - 1) {
		return blockRewardArgs.milestones.lastIndexOf(lastMile);
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
const calculateReward = (height, blockRewardArgs) => {
	height = parseHeight(height);

	if (height < blockRewardArgs.rewardOffset) {
		return new BigNum(0);
	}
	return new BigNum(
		blockRewardArgs.milestones[calculateMilestone(height, blockRewardArgs)],
	);
};

/**
 * Description of the function.
 *
 * @param {number} height
 * @returns {Bignumber}
 * @todo Add description for the function, params and the return value
 */
const calculateSupply = (height, blockRewardArgs) => {
	height = parseHeight(height);
	const distance = Math.floor(blockRewardArgs.distance);
	let supply = new BigNum(blockRewardArgs.totalAmount);

	if (height < blockRewardArgs.rewardOffset) {
		// Rewards not started yet
		return supply;
	}

	const milestone = calculateMilestone(height, blockRewardArgs);
	const rewards = [];

	let amount = 0;
	let multiplier = 0;

	// Remove offset from height
	height -= blockRewardArgs.rewardOffset - 1;

	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < blockRewardArgs.milestones.length; i++) {
		if (milestone >= i) {
			multiplier = blockRewardArgs.milestones[i];

			if (height < distance) {
				// Measure distance thus far
				amount = height % distance;
			} else {
				amount = distance; // Assign completed milestone
				height -= distance; // Deduct from total height

				// After last milestone
				if (height > 0 && i === blockRewardArgs.milestones.length - 1) {
					amount += height;
				}
			}

			rewards.push([amount, multiplier]);
		} else {
			break; // Milestone out of bounds
		}
	}

	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < rewards.length; i++) {
		const reward = rewards[i];
		supply = supply.plus(new BigNum(reward[0]).times(reward[1]));
	}

	return supply;
};

module.exports = { calculateMilestone, calculateReward, calculateSupply };
