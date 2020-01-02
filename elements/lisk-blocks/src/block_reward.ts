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

import * as BigNum from '@liskhq/bignum';

import { BlockRewardOptions } from './types';

const parseHeight = (height: number): number => {
	if (
		typeof height === 'undefined' ||
		height === null ||
		Number.isNaN(height)
	) {
		throw new TypeError('Invalid block height');
	}

	return Math.abs(height);
};

export const calculateMilestone = (
	height: number,
	blockRewardArgs: BlockRewardOptions,
): number => {
	const parsedHeight = parseHeight(height);
	const distance = Math.floor(blockRewardArgs.distance);

	const location = Math.trunc(
		(parsedHeight - blockRewardArgs.rewardOffset) / distance,
	);
	const lastMile =
		blockRewardArgs.milestones[blockRewardArgs.milestones.length - 1];

	if (location > blockRewardArgs.milestones.length - 1) {
		return blockRewardArgs.milestones.lastIndexOf(lastMile);
	}

	return location;
};

export const calculateReward = (
	height: number,
	blockRewardArgs: BlockRewardOptions,
) => {
	const parsedHeight = parseHeight(height);

	if (parsedHeight < blockRewardArgs.rewardOffset) {
		return new BigNum(0);
	}

	return new BigNum(
		blockRewardArgs.milestones[
			calculateMilestone(parsedHeight, blockRewardArgs)
		],
	);
};

export const calculateSupply = (
	height: number,
	blockRewardArgs: BlockRewardOptions,
) => {
	// tslint:disable-next-line no-let
	let parsedHeight = parseHeight(height);
	const distance = Math.floor(blockRewardArgs.distance);
	// tslint:disable-next-line no-let
	let supply = new BigNum(blockRewardArgs.totalAmount);

	if (parsedHeight < blockRewardArgs.rewardOffset) {
		// Rewards not started yet
		return supply;
	}

	const milestone = calculateMilestone(parsedHeight, blockRewardArgs);
	const rewards = [];

	// tslint:disable-next-line no-let
	let amount = 0;
	// tslint:disable-next-line no-let
	let multiplier = 0;

	// Remove offset from height
	parsedHeight -= blockRewardArgs.rewardOffset - 1;

	// tslint:disable-next-line prefer-for-of no-let
	for (let i = 0; i < blockRewardArgs.milestones.length; i += 1) {
		if (milestone >= i) {
			multiplier = blockRewardArgs.milestones[i];

			if (parsedHeight < distance) {
				// Measure distance thus far
				amount = parsedHeight % distance;
			} else {
				amount = distance; // Assign completed milestone
				parsedHeight -= distance; // Deduct from total height

				// After last milestone
				if (parsedHeight > 0 && i === blockRewardArgs.milestones.length - 1) {
					amount += parsedHeight;
				}
			}

			rewards.push([amount, multiplier]);
		} else {
			break; // Milestone out of bounds
		}
	}

	// tslint:disable-next-line prefer-for-of no-let
	for (let i = 0; i < rewards.length; i += 1) {
		const reward = rewards[i];
		supply = supply.plus(new BigNum(reward[0]).mul(reward[1]));
	}

	return supply;
};
