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
		input = Buffer.from(data.toString(16), 'hex');
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
	Math.floor((height - 1) / blocksPerRound) + 1;

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

const generateRandomSeed = (blocks, blocksPerRound) => {
	// Middle range of a round to validate
	const middleThreshold = Math.floor(blocksPerRound / 2);

	const lastBlockHeight = blocks[blocks.length - 1].height;

	// Current round
	const currentRound = calcRound(lastBlockHeight, blocksPerRound);
	const {
		firstBlockHeight: firstBlockHeightOfCurrentRound,
		middleBlockHeight: middleBlockHeightOfCurrentRound,
	} = roundInfo(currentRound, blocksPerRound);

	if (lastBlockHeight < middleBlockHeightOfCurrentRound) {
		throw new Error(
			`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height ${lastBlockHeight}`,
		);
	}

	if (
		lastBlockHeight >= middleBlockHeightOfCurrentRound &&
		currentRound === 1
	) {
		const randomSeed1 = strippedHash(middleThreshold + 1);
		const randomSeed2 = strippedHash(0);

		return { randomSeed1, randomSeed2 };
	}

	const { firstBlockHeight: firstBlockHeightOfLastRound } = roundInfo(
		currentRound - 1,
		blocksPerRound,
	);

	// Filter blocks which will be used for random seed computation
	// It will be hash may by block height
	const filteredBlocksMap = blocks.reduce((acc, block) => {
		if (block.height >= firstBlockHeightOfLastRound) {
			acc[block.height] = block;
		}
		return acc;
	}, {});

	// Build a seed reveal map by block height
	const seedRevealMap = Object.values(filteredBlocksMap).reduce(
		(acc, block) => {
			acc[block.height] = block.seedReveal;
			return acc;
		},
		{},
	);

	// Build a forged blocks map by generator public key
	const forgedBlocksMap = Object.values(filteredBlocksMap).reduce((acc, b) => {
		if (!acc[b.generatorPublicKey]) {
			acc[b.generatorPublicKey] = [];
		}
		acc[b.generatorPublicKey].push(b.height);
		return acc;
	}, {});

	const seedRevealsForRandomSeed1 = [];

	// From middle of current round to middle of last round
	for (
		let i = firstBlockHeightOfCurrentRound + middleThreshold;
		i >= firstBlockHeightOfCurrentRound - middleThreshold;
		i -= 1
	) {
		const { generatorPublicKey, seedReveal } = filteredBlocksMap[i];
		const [previousForgedHeight] = forgedBlocksMap[generatorPublicKey];

		// If forged only 1 block in round at height i or previous round
		// don't use that seed reveal
		if (!previousForgedHeight || previousForgedHeight === i) {
			continue;
		}

		const previousSeedReveal = seedRevealMap[previousForgedHeight];

		if (strippedHash(seedReveal) !== previousSeedReveal) {
			continue;
		}

		seedRevealsForRandomSeed1.push(seedReveal);
	}

	const seedRevealsForRandomSeed2 = [];
	// From middle of current round to middle of last round
	for (
		let i = firstBlockHeightOfCurrentRound - 1;
		i >= firstBlockHeightOfCurrentRound - blocksPerRound;
		i -= 1
	) {
		const { generatorPublicKey, seedReveal } = filteredBlocksMap[i];
		const [previousForgedHeight] = forgedBlocksMap[generatorPublicKey];

		// If forged only 1 block in current and last round
		// don't use that seed reveal
		if (!previousForgedHeight || previousForgedHeight === i) {
			continue;
		}

		const previousSeedReveal = seedRevealMap[previousForgedHeight];

		if (strippedHash(seedReveal) !== previousSeedReveal) {
			continue;
		}

		seedRevealsForRandomSeed1.push(seedReveal);
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
	config: 'devnet',
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
				input: {
					blocksPerRound,
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
	config: 'devnet',
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_other_rounds',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 3,
			delegateList: sampleDelegateList.slice(0, blocksPerRound),
		});
		const { randomSeed1, randomSeed2 } = generateRandomSeed(
			blocks,
			blocksPerRound,
		);

		return [
			{
				input: {
					blocksPerRound,
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

const randomSeedIfNotPassedMiddleOfRound = () => ({
	title: 'Random seed for round not passed the middle of the round',
	summary: 'Random seed for round not passed the middle of the round',
	config: 'devnet',
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
				input: {
					blocksPerRound,
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
	config: 'devnet',
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
				input: {
					blocksPerRound,
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
	config: 'devnet',
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
				input: {
					blocksPerRound,
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
