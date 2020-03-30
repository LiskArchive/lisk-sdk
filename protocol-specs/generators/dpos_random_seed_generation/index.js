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

const H = data => {
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

const XOR = hexArray => {
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
		seeds[i] = H(seeds[i - 1], 'hex');
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

const round = (height, n) => Math.floor((height - 1) / n) + 1;

const roundFlags = (r, n) => {
	const firstBlock = r * n - n + 1;
	const lastBlock = r * n;
	const middleBlock = Math.floor((firstBlock + lastBlock) / 2);

	return {
		round: r,
		firstBlock,
		lastBlock,
		middleBlock,
	};
};

const generateRandomSeed = (blocks, blocksPerRound) => {
	// Last block height
	const l = blocks[blocks.length - 1].height;

	// Number of blocks in a round
	const n = blocksPerRound;

	// Current round
	const r = roundFlags(round(l, n), n);

	// First block of current round
	const { firstBlock: h } = r;

	// Middle range of a round
	const m = Math.floor(n / 2);

	if (l < r.middleBlock) {
		throw new Error(
			`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height ${l}`,
		);
	}

	if (l >= r.middleBlock && r.round === 1) {
		const randomSeed1 = H(m + 1);
		const randomSeed2 = H(0);

		return { randomSeed1, randomSeed2 };
	}

	const { firstBlock: firstBlockBlockOfLastBlockRound } = roundFlags(
		r.round - 1,
		n,
	);

	const filteredBlocks = blocks.reduce((acc, b) => {
		if (b.height >= firstBlockBlockOfLastBlockRound) {
			acc[b.height] = b;
		}
		return acc;
	}, {});

	const seedRevealMap = Object.values(filteredBlocks).reduce((acc, b) => {
		acc[b.height] = b.seedReveal;
		return acc;
	}, {});

	const forgedBlocksMap = Object.values(filteredBlocks).reduce((acc, b) => {
		if (!acc[b.generatorPublicKey]) {
			acc[b.generatorPublicKey] = [];
		}
		acc[b.generatorPublicKey].push(b.height);
		return acc;
	}, {});

	const seedRevealsForRandomSeed1 = [];

	// From middle of current round to middle of last round
	for (let i = h + m; i >= h - m; i -= 1) {
		const { generatorPublicKey, seedReveal } = filteredBlocks[i];
		const [previousForgedHeight] = forgedBlocksMap[generatorPublicKey];

		// If forged only 1 block in current and last round
		// don't use that seed reveal
		if (!previousForgedHeight || previousForgedHeight === i) {
			continue;
		}

		const previousSeedReveal = seedRevealMap[previousForgedHeight];

		if (H(seedReveal) !== previousSeedReveal) {
			continue;
		}

		seedRevealsForRandomSeed1.push(seedReveal);
	}

	const seedRevealsForRandomSeed2 = [];
	// From middle of current round to middle of last round
	for (let i = h - 1; i >= h - n; i -= 1) {
		const { generatorPublicKey, seedReveal } = filteredBlocks[i];
		const [previousForgedHeight] = forgedBlocksMap[generatorPublicKey];

		// If forged only 1 block in current and last round
		// don't use that seed reveal
		if (!previousForgedHeight || previousForgedHeight === i) {
			continue;
		}

		const previousSeedReveal = seedRevealMap[previousForgedHeight];

		if (H(seedReveal) !== previousSeedReveal) {
			continue;
		}

		seedRevealsForRandomSeed1.push(seedReveal);
	}

	const randomSeed1 = XOR([H(h + m), ...seedRevealsForRandomSeed1]);
	const randomSeed2 = XOR([H(h - 1), ...seedRevealsForRandomSeed2]);

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

const randomSeedSecondRound = () => ({
	title: 'Random seed for second round',
	summary: 'Random seeds generation for second round',
	config: 'devnet',
	runner: 'dpos_random_seed_generation',
	handler: 'dpos_random_seed_generation_second_round',
	testCases: (() => {
		const blocksPerRound = activeDelegates + standByDelegates;
		const blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: blocksPerRound * 2,
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
				block.seedReveal = H(block.height);
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
	randomSeedSecondRound,
	randomSeedIfNotPassedMiddleOfRound,
	randomSeedForInvalidPreImageOfSeedReveal,
	randomSeedIfForgerNotForgedEarlier,
]);
