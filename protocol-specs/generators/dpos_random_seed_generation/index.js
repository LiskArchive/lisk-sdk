/*
 * Copyright © 2020 Lisk Foundation
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

const { hash } = require('@liskhq/lisk-cryptography');

const BaseGenerator = require('../base_generator');
const { list: sampleDelegateList } = require('./forger_list');

/* eslint-disable new-cap, no-continue */

const activeDelegates = 101;
const standByDelegates = 2;

const strippedHash = data => {
	let input;

	if (typeof data === 'number') {
		input = Buffer.alloc(4);
		input.writeUInt32BE(data, 0, 4);
	} else if (typeof data === 'string') {
		input = Buffer.from(data, 'hex');
	} else if (data instanceof Buffer) {
		input = data;
	} else {
		throw new Error('Hash input is not a valid type');
	}

	return hash(input)
		.slice(0, 16)
		.toString('hex');
};

const bitwiseXOR = hexArray => {
	if (hexArray.length === 1) {
		return hexArray[0];
	}

	const buffers = hexArray.map(hexStr => Buffer.from(hexStr, 'hex'));
	const bufferSizes = new Set(buffers.map(buffer => buffer.length));
	if (bufferSizes.size > 1) {
		throw new Error('All input for XOR should be same size');
	}
	const outputSize = [...bufferSizes][0];
	const result = Buffer.alloc(outputSize, 0, 'hex');

	for (let i = 0; i < outputSize; i += 1) {
		// eslint-disable-next-line no-bitwise
		result[i] = buffers.map(b => b[i]).reduce((a, b) => a ^ b, 0);
	}

	return result.toString('hex');
};

const generateSeedOnion = (initialSeed, size) => {
	const seeds = new Array(size);
	seeds[0] = hash(initialSeed, 'hex');

	for (let i = 1; i < size; i += 1) {
		seeds[i] = strippedHash(seeds[i - 1], 'hex');
	}

	return seeds.reverse();
};

const generateSeedReveals = ({ delegateList, numberOfBlocks }) => {
	const seeds = {};

	for (const delegate of delegateList) {
		const seedsForDelegate = generateSeedOnion(
			delegate.publicKey,
			numberOfBlocks,
		);
		const counter = 0;

		seeds[delegate.publicKey] = {
			counter,
			seeds: seedsForDelegate,
		};
	}

	return seeds;
};

const generateBlocks = ({ startHeight, numberOfBlocks, delegateList }) => {
	const seedReveals = generateSeedReveals({ delegateList, numberOfBlocks });
	const numberOfDelegates = delegateList.length;

	return new Array(numberOfBlocks).fill(0).map((_v, index) => {
		const height = startHeight + index;
		const { publicKey } = delegateList[index % numberOfDelegates];
		const seedReveal =
			seedReveals[publicKey].seeds[seedReveals[publicKey].counter];

		seedReveals[publicKey].counter += 1;

		return {
			generatorPublicKey: delegateList[index % numberOfDelegates].publicKey,
			height,
			seedReveal,
		};
	});
};

const calcRound = (height, blocksPerRound) =>
	Math.ceil(height / blocksPerRound);

const roundInfo = (round, blocksPerRound) => {
	const firstBlockHeight = round * blocksPerRound - blocksPerRound + 1;
	const lastBlockHeight = round * blocksPerRound;
	const middleBlockHeight = Math.floor(
		(firstBlockHeight + lastBlockHeight) / 2,
	);

	return {
		firstBlockHeight,
		lastBlockHeight,
		middleBlockHeight,
	};
};

const findPreviousBlockOfDelegate = (block, searchTillHeight, blocksMap) => {
	const { height, generatorPublicKey } = block;
	for (let i = height - 1; i >= searchTillHeight; i -= 1) {
		if (blocksMap[i].generatorPublicKey === generatorPublicKey) {
			return blocksMap[i];
		}
	}

	return null;
};

const isValidSeedReveal = (block, searchTillHeight, blocksMap) => {
	const { height, seedReveal, generatorPublicKey } = block;

	for (let i = height - 1; i >= searchTillHeight; i -= 1) {
		if (blocksMap[i].generatorPublicKey === generatorPublicKey) {
			return strippedHash(seedReveal) !== blocksMap[i].seedReveal;
		}
	}

	return false;
};

const generateRandomSeed = (blocks, blocksPerRound) => {
	// Middle range of a round to validate
	const middleThreshold = Math.floor(blocksPerRound / 2);
	const lastBlockHeight = blocks[blocks.length - 1].height;
	const currentRound = calcRound(lastBlockHeight, blocksPerRound);
	const {
		firstBlockHeight: firstBlockHeightOfCurrentRound,
		middleBlockHeight: middleBlockHeightOfCurrentRound,
	} = roundInfo(currentRound, blocksPerRound);
	const { firstBlockHeight: firstBlockHeightOfLastRound } = roundInfo(
		currentRound - 1,
		blocksPerRound,
	);
	const { firstBlockHeight: firstBlockHeightOfSecondLastRound } = roundInfo(
		currentRound - 2,
		blocksPerRound,
	);

	/**
	 * We need to build a map for current and last two rounds. To previously forged
	 * blocks we will use only current and last round. To validate seed reveal of
	 * any block from last round we have to load second last round as well.
	 */
	const blocksMap = blocks.reduce((acc, block) => {
		if (block.height >= firstBlockHeightOfSecondLastRound) {
			acc[block.height] = block;
		}
		return acc;
	}, {});

	if (lastBlockHeight < middleBlockHeightOfCurrentRound) {
		throw new Error(
			`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height ${lastBlockHeight}`,
		);
	}

	if (currentRound === 1) {
		const randomSeed1 = strippedHash(middleThreshold + 1);
		const randomSeed2 = strippedHash(0);

		return { randomSeed1, randomSeed2 };
	}

	const seedRevealsForRandomSeed1 = [];

	// From middle of current round to middle of last round
	for (
		let i = firstBlockHeightOfCurrentRound + middleThreshold;
		i >= firstBlockHeightOfCurrentRound - middleThreshold;
		i -= 1
	) {
		const block = blocksMap[i];

		// If delegate not forged any other block earlier in current and last round
		if (
			!findPreviousBlockOfDelegate(
				block,
				firstBlockHeightOfLastRound,
				blocksMap,
			)
		) {
			continue;
		}

		// to validate seed reveal of any block in the last round
		// we have to check till second last round
		if (
			!isValidSeedReveal(block, firstBlockHeightOfSecondLastRound, blocksMap)
		) {
			continue;
		}

		seedRevealsForRandomSeed1.push(block.seedReveal);
	}

	const seedRevealsForRandomSeed2 = [];
	// From middle of current round to middle of last round
	for (
		let i = firstBlockHeightOfCurrentRound - 1;
		i >= firstBlockHeightOfCurrentRound - blocksPerRound;
		i -= 1
	) {
		const block = blocksMap[i];

		// If delegate not forged any other block earlier in current and last round
		if (
			!findPreviousBlockOfDelegate(
				block,
				firstBlockHeightOfLastRound,
				blocksMap,
			)
		) {
			continue;
		}

		// to validate seed reveal of any block in the last round
		// we have to check till second last round
		if (
			!isValidSeedReveal(block, firstBlockHeightOfSecondLastRound, blocksMap)
		) {
			continue;
		}

		seedRevealsForRandomSeed1.push(block.seedReveal);
	}

	const randomSeed1 = bitwiseXOR([
		strippedHash(firstBlockHeightOfCurrentRound + middleThreshold),
		...seedRevealsForRandomSeed1,
	]);
	const randomSeed2 = bitwiseXOR([
		strippedHash(firstBlockHeightOfCurrentRound - 1),
		...seedRevealsForRandomSeed2,
	]);

	return { randomSeed1, randomSeed2 };
};

const randomSeedFirstRound = () => ({
	title: 'Random seed for first round',
	summary: 'Random seeds generation for first round',
	config: { network: 'devnet' },
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_first_round',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound,
			delegateList: sampleDelegateList.slice(0, blocksPerRound),
		});
		const { randomSeed1, randomSeed2 } = generateRandomSeed(
			blocks,
			blocksPerRound,
		);

		return [
			{
				description: 'Random seeds generation for first round',
				config: { blocksPerRound },
				input: {
					blocks,
				},
				output: {
					randomSeed1,
					randomSeed2,
				},
			},
		];
	})(),
});

const randomSeedForMoreRounds = () => ({
	title: 'Random seed for more than one rounds',
	summary: 'Random seeds generation more than one rounds',
	config: { network: 'devnet' },
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_other_rounds',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const blocksForTwoRounds = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
			delegateList: sampleDelegateList.slice(0, blocksPerRound),
		});
		const blocksForThreeRounds = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 3,
			delegateList: sampleDelegateList.slice(0, blocksPerRound),
		});

		return [
			{
				description: 'Random seeds generation for two rounds',
				input: {
					blocksPerRound,
					blocks: blocksForTwoRounds,
				},
				output: generateRandomSeed(blocksForTwoRounds, blocksPerRound),
			},
			{
				description: 'Random seeds generation for three rounds',
				config: { blocksPerRound },
				input: {
					blocks: blocksForTwoRounds,
				},
				output: generateRandomSeed(blocksForThreeRounds, blocksPerRound),
			},
		];
	})(),
});

const randomSeedIfNotPassedMiddleOfRound = () => ({
	title: 'Random seed for round not passed the middle of the round',
	summary: 'Random seed for round not passed the middle of the round',
	config: { network: 'devnet' },
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_not_passed_middle_of_round',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound + 2,
			delegateList: sampleDelegateList.slice(0, blocksPerRound),
		});

		const randomSeed1 = null;
		const randomSeed2 = null;

		return [
			{
				description: 'Random seed for round not passed the middle of the round',
				config: { blocksPerRound },
				input: {
					blocks,
				},
				output: {
					randomSeed1,
					randomSeed2,
				},
			},
		];
	})(),
});

const randomSeedForInvalidPreImageOfSeedReveal = () => ({
	title: 'Random seed for invalid pre image',
	summary:
		'Random seeds generation for the case when a delegate have invalid pre-image for seed reveal',
	config: { network: 'devnet' },
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_invalid_seed_reveal',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const delegateList = sampleDelegateList.slice(0, blocksPerRound);
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
			delegateList,
		});

		// Change seed reveal values for a delegate for first round
		const suspiciousDelegate = delegateList[1];
		for (const block of blocks) {
			if (
				block.generatorPublicKey === suspiciousDelegate.publicKey &&
				block.height <= blocksPerRound
			) {
				block.seedReveal = strippedHash(block.height);
			}
		}

		const { randomSeed1, randomSeed2 } = generateRandomSeed(
			blocks,
			blocksPerRound,
		);

		return [
			{
				description:
					'Random seeds generation for the case when a delegate have invalid pre-image for seed reveal',
				config: { blocksPerRound },
				input: {
					blocks,
				},
				output: {
					randomSeed1,
					randomSeed2,
				},
			},
		];
	})(),
});

const randomSeedIfForgerNotForgedEarlier = () => ({
	title: 'Random seed for not forged earlier',
	summary:
		'Random seeds generation for the case when delegate did not forged earlier',
	config: { network: 'devnet' },
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_not_forged_earlier',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const delegateList = sampleDelegateList.slice(0, blocksPerRound);
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
			delegateList,
		});

		// Change seed reveal values for a delegate for first round
		const oldDelegate = delegateList[0];
		const newDelegate = sampleDelegateList[blocksPerRound];
		for (const block of blocks) {
			if (
				block.generatorPublicKey === oldDelegate.publicKey &&
				block.height <= blocksPerRound
			) {
				block.generatorPublicKey = newDelegate.publicKey;
			}
		}

		const { randomSeed1, randomSeed2 } = generateRandomSeed(
			blocks,
			blocksPerRound,
		);

		return [
			{
				description:
					'Random seeds generation for the case when delegate did not forged earlier',
				config: {
					blocksPerRound,
				},
				input: {
					blocks,
				},
				output: {
					randomSeed1,
					randomSeed2,
				},
			},
		];
	})(),
});

module.exports = BaseGenerator.runGenerator('dpos_random_seed_generation', [
	randomSeedFirstRound,
	randomSeedForMoreRounds,
	randomSeedIfNotPassedMiddleOfRound,
	randomSeedForInvalidPreImageOfSeedReveal,
	randomSeedIfForgerNotForgedEarlier,
]);
