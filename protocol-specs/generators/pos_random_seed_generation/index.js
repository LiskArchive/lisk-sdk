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

const { utils } = require('@liskhq/lisk-cryptography');

const BaseGenerator = require('../base_generator');
const { list: sampleValidatorList } = require('./forger_list.json');

const activeValidators = 101;
const standByValidators = 2;

const numberToBuffer = data => {
	const buffer = Buffer.alloc(4);
	buffer.writeUInt32BE(data, 0, 4);
	return buffer;
};

const hexStrToBuffer = str => Buffer.from(str, 'hex');

const strippedHash = data => {
	if (!(data instanceof Buffer)) {
		throw new Error('Hash input is not a valid type');
	}

	return utils.hash(data).subarray(0, 16);
};

const bitwiseXOR = bufferArray => {
	if (bufferArray.length === 1) {
		return bufferArray[0];
	}

	const bufferSizes = new Set(bufferArray.map(buffer => buffer.length));
	if (bufferSizes.size > 1) {
		throw new Error('All input for XOR should be same size');
	}
	const outputSize = [...bufferSizes][0];
	const result = Buffer.alloc(outputSize, 0, 'hex');

	for (let i = 0; i < outputSize; i += 1) {
		// eslint-disable-next-line no-bitwise
		result[i] = bufferArray.map(b => b[i]).reduce((a, b) => a ^ b, 0);
	}

	return result;
};

const generateSeedOnion = (initialSeed, size) => {
	const seeds = new Array(size);
	seeds[0] = utils.hash(initialSeed, 'hex');

	for (let i = 1; i < size; i += 1) {
		seeds[i] = strippedHash(seeds[i - 1], 'hex');
	}

	return seeds.reverse();
};

const generateSeedReveals = ({ validatorList, numberOfBlocks }) => {
	const seeds = {};

	for (const validator of validatorList) {
		const seedsForValidator = generateSeedOnion(validator.publicKey, numberOfBlocks);
		const counter = 0;

		seeds[validator.publicKey] = {
			counter,
			seeds: seedsForValidator,
		};
	}

	return seeds;
};

const generateBlocks = ({ startHeight, numberOfBlocks, validatorList }) => {
	const seedReveals = generateSeedReveals({ validatorList, numberOfBlocks });
	const numberOfValidators = validatorList.length;

	return new Array(numberOfBlocks).fill(0).map((_v, index) => {
		const height = startHeight + index;
		const { publicKey } = validatorList[index % numberOfValidators];
		const seedReveal = seedReveals[publicKey].seeds[seedReveals[publicKey].counter];

		seedReveals[publicKey].counter += 1;

		return {
			generatorPublicKey: validatorList[index % numberOfValidators].publicKey,
			height,
			asset: {
				seedReveal: seedReveal.toString('hex'),
			},
		};
	});
};

const calcRound = (height, blocksPerRound) => Math.ceil(height / blocksPerRound);
const startOfRound = (round, blocksPerRound) => round * blocksPerRound - blocksPerRound + 1;
const endOfRound = (round, blocksPerRound) => round * blocksPerRound;
const middleOfRound = (round, blocksPerRound) =>
	Math.floor((startOfRound(round, blocksPerRound) + endOfRound(round, blocksPerRound)) / 2);

const findPreviousBlockOfValidator = (block, searchTillHeight, blocksMap) => {
	const { height, generatorPublicKey } = block;
	const searchTill = Math.max(searchTillHeight, 1);

	for (let i = height - 1; i >= searchTill; i -= 1) {
		if (blocksMap[i].generatorPublicKey === generatorPublicKey) {
			return blocksMap[i];
		}
	}

	return null;
};

const isValidSeedReveal = (seedReveal, previousSeedReveal) =>
	strippedHash(hexStrToBuffer(seedReveal)).toString('hex') === previousSeedReveal;

const selectSeedReveal = ({ fromHeight, toHeight, blocksMap, blocksPerRound }) => {
	const selected = [];

	for (let i = fromHeight - 1; i >= toHeight; i -= 1) {
		const block = blocksMap[i];
		const blockRound = calcRound(block.height, blocksPerRound);

		const lastForgedBlock = findPreviousBlockOfValidator(
			block,
			startOfRound(blockRound - 1, blocksPerRound),
			blocksMap,
		);

		// If validator not forged any other block earlier in current and last round
		if (!lastForgedBlock) {
			continue;
		}

		// to validate seed reveal of any block in the last round
		// we have to check till second last round
		if (!isValidSeedReveal(block.asset.seedReveal, lastForgedBlock.asset.seedReveal)) {
			continue;
		}

		selected.push(hexStrToBuffer(block.asset.seedReveal));
	}

	return selected;
};

const generateRandomSeed = (blocks, blocksPerRound) => {
	// Middle range of a round to validate
	const middleThreshold = Math.floor(blocksPerRound / 2);
	const lastBlockHeight = blocks[blocks.length - 1].height;
	const currentRound = calcRound(lastBlockHeight, blocksPerRound);
	const startOfCurrentRound = startOfRound(currentRound, blocksPerRound);
	const middleOfCurrentRound = middleOfRound(currentRound, blocksPerRound);
	const startOfLastRound = startOfRound(currentRound - 1, blocksPerRound);
	const endOfLastRound = endOfRound(currentRound - 1, blocksPerRound);

	/**
	 * We need to build a map for current and last two rounds. To previously forged
	 * blocks we will use only current and last round. To validate seed reveal of
	 * any block from last round we have to load second last round as well.
	 */
	const blocksMap = blocks.reduce((acc, block) => {
		if (block.height >= startOfRound(currentRound - 2, blocksPerRound)) {
			acc[block.height] = block;
		}
		return acc;
	}, {});

	if (lastBlockHeight < middleOfCurrentRound) {
		throw new Error(
			`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height ${lastBlockHeight}`,
		);
	}

	if (currentRound === 1) {
		const randomSeed1 = strippedHash(numberToBuffer(middleThreshold + 1)).toString('hex');
		const randomSeed2 = strippedHash(numberToBuffer(0)).toString('hex');

		return { randomSeed1, randomSeed2 };
	}

	// From middle of current round to middle of last round
	const seedRevealsForRandomSeed1 = selectSeedReveal({
		fromHeight: startOfCurrentRound + middleThreshold,
		toHeight: startOfCurrentRound - middleThreshold,
		blocksMap,
		blocksPerRound,
	});

	// From middle of current round to middle of last round
	const seedRevealsForRandomSeed2 = selectSeedReveal({
		fromHeight: endOfLastRound,
		toHeight: startOfLastRound,
		blocksMap,
		blocksPerRound,
	});

	const randomSeed1 = bitwiseXOR([
		strippedHash(numberToBuffer(startOfCurrentRound + middleThreshold)),
		...seedRevealsForRandomSeed1,
	]);
	const randomSeed2 = bitwiseXOR([
		strippedHash(numberToBuffer(endOfLastRound)),
		...seedRevealsForRandomSeed2,
	]);

	return {
		randomSeed1,
		randomSeed2,
	};
};

const randomSeedFirstRound = () => ({
	title: 'Random seed for first round',
	summary: 'Random seeds generation for first round',
	config: { network: 'devnet' },
	runner: 'pos_random_seed_generation',
	handler: 'pos_random_seed_generation_first_round',
	testCases: (() => {
		const blocksPerRound = activeValidators + standByValidators;
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound,
			validatorList: sampleValidatorList.slice(0, blocksPerRound),
		});
		const { randomSeed1, randomSeed2 } = generateRandomSeed(blocks, blocksPerRound);

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
	runner: 'pos_random_seed_generation',
	handler: 'pos_random_seed_generation_other_rounds',
	testCases: (() => {
		const blocksPerRound = activeValidators + standByValidators;
		const blocksForTwoRounds = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
			validatorList: sampleValidatorList.slice(0, blocksPerRound),
		});

		const blocksForThreeRounds = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 3,
			validatorList: sampleValidatorList.slice(0, blocksPerRound),
		});

		const blocksForFiveRounds = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 5,
			validatorList: sampleValidatorList.slice(0, blocksPerRound),
		});

		return [
			{
				description: 'Random seeds generation for two rounds',
				config: { blocksPerRound },
				input: {
					blocks: blocksForTwoRounds,
				},
				output: generateRandomSeed(blocksForTwoRounds, blocksPerRound),
			},
			{
				description: 'Random seeds generation for three rounds',
				config: { blocksPerRound },
				input: {
					blocks: blocksForThreeRounds,
				},
				output: generateRandomSeed(blocksForThreeRounds, blocksPerRound),
			},
			{
				description: 'Random seeds generation for five rounds',
				config: { blocksPerRound },
				input: {
					blocks: blocksForFiveRounds,
				},
				output: generateRandomSeed(blocksForFiveRounds, blocksPerRound),
			},
		];
	})(),
});

const randomSeedIfNotPassedMiddleOfRound = () => ({
	title: 'Random seed for round not passed the middle of the round',
	summary: 'Random seed for round not passed the middle of the round',
	config: { network: 'devnet' },
	runner: 'pos_random_seed_generation',
	handler: 'pos_random_seed_generation_not_passed_middle_of_round',
	testCases: (() => {
		const blocksPerRound = activeValidators + standByValidators;
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound + 2,
			validatorList: sampleValidatorList.slice(0, blocksPerRound),
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
		'Random seeds generation for the case when a validator have invalid pre-image for seed reveal',
	config: { network: 'devnet' },
	runner: 'pos_random_seed_generation',
	handler: 'pos_random_seed_generation_invalid_seed_reveal',
	testCases: (() => {
		const blocksPerRound = activeValidators + standByValidators;
		const validatorList = sampleValidatorList.slice(0, blocksPerRound);
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
			validatorList,
		});

		// Change seed reveal values for a validator for first round
		const suspiciousValidator = validatorList[1];
		for (const block of blocks) {
			if (
				block.generatorPublicKey === suspiciousValidator.publicKey &&
				block.height <= blocksPerRound
			) {
				block.asset.seedReveal = strippedHash(numberToBuffer(block.height)).toString('hex');
			}
		}

		const { randomSeed1, randomSeed2 } = generateRandomSeed(blocks, blocksPerRound);

		return [
			{
				description:
					'Random seeds generation for the case when a validator have invalid pre-image for seed reveal',
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
	summary: 'Random seeds generation for the case when validator did not forged earlier',
	config: { network: 'devnet' },
	runner: 'pos_random_seed_generation',
	handler: 'pos_random_seed_generation_not_forged_earlier',
	testCases: (() => {
		const blocksPerRound = activeValidators + standByValidators;
		const validatorList = sampleValidatorList.slice(0, blocksPerRound);
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
			validatorList,
		});

		// Change seed reveal values for a validator for first round
		const oldValidator = validatorList[0];
		const newValidator = sampleValidatorList[blocksPerRound];
		for (const block of blocks) {
			if (block.generatorPublicKey === oldValidator.publicKey && block.height <= blocksPerRound) {
				block.generatorPublicKey = newValidator.publicKey;
			}
		}

		const { randomSeed1, randomSeed2 } = generateRandomSeed(blocks, blocksPerRound);

		return [
			{
				description: 'Random seeds generation for the case when validator did not forged earlier',
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

module.exports = BaseGenerator.runGenerator('pos_random_seed_generation', [
	randomSeedFirstRound,
	randomSeedForMoreRounds,
	randomSeedIfNotPassedMiddleOfRound,
	randomSeedForInvalidPreImageOfSeedReveal,
	randomSeedIfForgerNotForgedEarlier,
]);
