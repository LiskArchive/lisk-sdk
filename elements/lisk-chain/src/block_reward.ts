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
import { Block, BlockRewardOptions } from './types';

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
	let parsedHeight = parseHeight(height);
	const distance = Math.floor(blockRewardArgs.distance);
	let supply = BigInt(blockRewardArgs.totalAmount);

	if (parsedHeight < blockRewardArgs.rewardOffset) {
		// Rewards not started yet
		return supply;
	}

	const milestone = calculateMilestone(parsedHeight, blockRewardArgs);
	const rewards = [];

	let amount = 0;
	let multiplier;

	// Remove offset from height
	parsedHeight -= blockRewardArgs.rewardOffset - 1;

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

	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < rewards.length; i += 1) {
		const reward = rewards[i];
		supply += BigInt(reward[0]) * BigInt(reward[1]);
	}

	return supply;
};

export const getTotalFees = (
	block: Block,
): { readonly totalFee: bigint; readonly totalMinFee: bigint } =>
	block.payload.reduce(
		(prev, current) => {
			const { minFee } = current;

			return {
				totalFee: prev.totalFee + current.fee,
				totalMinFee: prev.totalMinFee + minFee,
			};
		},
		{ totalFee: BigInt(0), totalMinFee: BigInt(0) },
	);

export const applyFeeAndRewards = async (
	block: Block,
	stateStore: StateStore,
): Promise<void> => {
	const generatorAddress = getAddressFromPublicKey(
		block.header.generatorPublicKey,
	);
	const generator = await stateStore.account.get(generatorAddress);
	generator.balance += block.header.reward;
	// If there is no transactions, no need to give fee
	if (!block.payload.length) {
		stateStore.account.set(generatorAddress, generator);

		return;
	}
	const { totalFee, totalMinFee } = getTotalFees(block);
	// Generator only gets total fee - min fee
	const givenFee = totalFee - totalMinFee;
	// This is necessary only for genesis block case, where total fee is 0, which is invalid
	// Also, genesis block cannot be reverted
	generator.balance += givenFee > 0 ? givenFee : BigInt(0);
	const totalFeeBurntBuffer = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
	let totalFeeBurnt =
		totalFeeBurntBuffer ? totalFeeBurntBuffer.readBigInt64BE() : BigInt(0);
	totalFeeBurnt += givenFee > 0 ? totalMinFee : BigInt(0);

	// Update state store
	const updatedTotalBurntBuffer = Buffer.alloc(8);
	updatedTotalBurntBuffer.writeBigInt64BE(totalFeeBurnt);
	stateStore.account.set(generatorAddress, generator);
	stateStore.chain.set(
		CHAIN_STATE_BURNT_FEE,
		updatedTotalBurntBuffer,
	);
};

export const undoFeeAndRewards = async (
	block: Block,
	stateStore: StateStore,
): Promise<void> => {
	const generatorAddress = getAddressFromPublicKey(
		block.header.generatorPublicKey,
	);
	const generator = await stateStore.account.get(generatorAddress);
	generator.balance -= block.header.reward;
	// If there is no transactions, no need to give fee
	if (!block.payload.length) {
		stateStore.account.set(generatorAddress, generator);

		return;
	}
	const { totalFee, totalMinFee } = getTotalFees(block);

	generator.balance -= totalFee - totalMinFee;
	const totalFeeBurntBuffer = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
	let totalFeeBurnt =
		totalFeeBurntBuffer ? totalFeeBurntBuffer.readBigInt64BE() : BigInt(0);
	totalFeeBurnt -= totalMinFee;

	// Update state store
	stateStore.account.set(generatorAddress, generator);
	const updatedTotalBurntBuffer = Buffer.alloc(8);
	updatedTotalBurntBuffer.writeBigInt64BE(totalFeeBurnt);
	stateStore.chain.set(
		CHAIN_STATE_BURNT_FEE,
		updatedTotalBurntBuffer,
	);
};
