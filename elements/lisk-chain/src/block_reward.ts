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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

import { CHAIN_STATE_BURNT_FEE } from './constants';
import { StateStore } from './state_store';
import { BlockInstance, BlockRewardOptions } from './types';

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
): bigint => {
	const parsedHeight = parseHeight(height);

	if (parsedHeight < blockRewardArgs.rewardOffset) {
		return BigInt(0);
	}

	return BigInt(
		blockRewardArgs.milestones[
			calculateMilestone(parsedHeight, blockRewardArgs)
		],
	);
};

export const calculateSupply = (
	height: number,
	blockRewardArgs: BlockRewardOptions,
): bigint => {
	// tslint:disable-next-line no-let
	let parsedHeight = parseHeight(height);
	const distance = Math.floor(blockRewardArgs.distance);
	// tslint:disable-next-line no-let
	let supply = BigInt(blockRewardArgs.totalAmount);

	if (parsedHeight < blockRewardArgs.rewardOffset) {
		// Rewards not started yet
		return supply;
	}

	const milestone = calculateMilestone(parsedHeight, blockRewardArgs);
	const rewards = [];

	// tslint:disable-next-line no-let
	let amount = 0;
	// tslint:disable-next-line no-let
	let multiplier;

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
		supply = supply + BigInt(reward[0]) * BigInt(reward[1]);
	}

	return supply;
};

export const getTotalFees = (
	blockInstance: BlockInstance,
): { readonly totalFee: bigint; readonly totalMinFee: bigint } =>
	blockInstance.transactions.reduce(
		(prev, current) => {
			const minFee = current.minFee;

			return {
				totalFee: prev.totalFee + current.fee,
				totalMinFee: prev.totalMinFee + minFee,
			};
		},
		{ totalFee: BigInt(0), totalMinFee: BigInt(0) },
	);

export const applyFeeAndRewards = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
): Promise<void> => {
	const generatorAddress = getAddressFromPublicKey(
		blockInstance.generatorPublicKey,
	);
	const generator = await stateStore.account.get(generatorAddress);
	generator.balance += blockInstance.reward;
	generator.producedBlocks += 1;
	// If there is no transactions, no need to give fee
	if (!blockInstance.transactions.length) {
		stateStore.account.set(generatorAddress, generator);

		return;
	}
	const { totalFee, totalMinFee } = getTotalFees(blockInstance);
	// Generator only gets total fee - min fee
	const givenFee = totalFee - totalMinFee;
	// This is necessary only for genesis block case, where total fee is 0, which is invalid
	// Also, genesis block channot be reverted
	generator.balance += givenFee > 0 ? givenFee : BigInt(0);
	const totalFeeBurntStr = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
	// tslint:disable-next-line no-let
	let totalFeeBurnt = BigInt(totalFeeBurntStr || 0);
	totalFeeBurnt += givenFee > 0 ? totalMinFee : BigInt(0);

	// Update state store
	stateStore.account.set(generatorAddress, generator);
	stateStore.chain.set(CHAIN_STATE_BURNT_FEE, totalFeeBurnt.toString());
};

export const undoFeeAndRewards = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
): Promise<void> => {
	const generatorAddress = getAddressFromPublicKey(
		blockInstance.generatorPublicKey,
	);
	const generator = await stateStore.account.get(generatorAddress);
	generator.balance -= blockInstance.reward;
	generator.producedBlocks -= 1;
	// If there is no transactions, no need to give fee
	if (!blockInstance.transactions.length) {
		stateStore.account.set(generatorAddress, generator);

		return;
	}
	const { totalFee, totalMinFee } = getTotalFees(blockInstance);

	generator.balance -= totalFee - totalMinFee;
	const totalFeeBurntStr = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
	// tslint:disable-next-line no-let
	let totalFeeBurnt = BigInt(totalFeeBurntStr || 0);
	totalFeeBurnt -= totalMinFee;

	// Update state store
	stateStore.account.set(generatorAddress, generator);
	stateStore.chain.set(CHAIN_STATE_BURNT_FEE, totalFeeBurnt.toString());
};
