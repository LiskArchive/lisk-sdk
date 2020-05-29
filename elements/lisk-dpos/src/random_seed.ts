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

import { hash, intToBuffer } from '@liskhq/lisk-cryptography';
import * as Debug from 'debug';

import { Rounds } from './rounds';
import { BlockHeader, FixedLengthArray, RandomSeed } from './types';

// eslint-disable-next-line new-cap
const debug = Debug('lisk:dpos:random_seed');

interface HeadersMap {
	[key: number]: BlockHeader;
}

const NUMBER_BYTE_SIZE = 4;
const RANDOM_SEED_BYTE_SIZE = 16;

const strippedHash = (data: Buffer): Buffer => {
	if (!(data instanceof Buffer)) {
		throw new Error('Hash input is not a valid type');
	}

	return hash(data).slice(0, RANDOM_SEED_BYTE_SIZE);
};

const bitwiseXOR = (bufferArray: Buffer[]): Buffer => {
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

const findPreviousHeaderOfDelegate = (
	header: BlockHeader,
	searchTillHeight: number,
	headersMap: HeadersMap,
): BlockHeader | undefined => {
	const { height, generatorPublicKey } = header;
	const searchTill = Math.max(searchTillHeight, 1);

	for (let i = height - 1; i >= searchTill; i -= 1) {
		if (headersMap[i].generatorPublicKey.equals(generatorPublicKey)) {
			return headersMap[i];
		}
	}

	return undefined;
};

const isValidSeedReveal = (
	seedReveal: Buffer,
	previousSeedReveal: Buffer,
): boolean => strippedHash(seedReveal).equals(previousSeedReveal);

const selectSeedReveals = ({
	fromHeight,
	toHeight,
	headersMap,
	rounds,
}: {
	readonly fromHeight: number;
	readonly toHeight: number;
	readonly headersMap: HeadersMap;
	readonly rounds: Rounds;
}): Buffer[] => {
	const selected = [];

	for (let i = fromHeight; i >= toHeight; i -= 1) {
		const header = headersMap[i];
		const blockRound = rounds.calcRound(header.height);

		const lastForgedBlock = findPreviousHeaderOfDelegate(
			header,
			rounds.calcRoundStartHeight(blockRound - 1),
			headersMap,
		);

		// If delegate not forged any other block earlier in current and last round
		if (!lastForgedBlock) {
			// eslint-disable-next-line no-continue
			continue;
		}

		// To validate seed reveal of any block in the last round
		// We have to check till second last round
		if (
			!isValidSeedReveal(
				header.asset.seedReveal,
				lastForgedBlock.asset.seedReveal,
			)
		) {
			// eslint-disable-next-line no-continue
			continue;
		}

		selected.push(header.asset.seedReveal);
	}

	return selected;
};

export const generateRandomSeeds = (
	round: number,
	rounds: Rounds,
	headers: ReadonlyArray<BlockHeader>,
): FixedLengthArray<RandomSeed, 2> => {
	// Middle range of a round to validate
	const middleThreshold = Math.floor(rounds.blocksPerRound / 2);
	const lastBlockHeight = headers[0].height;
	const startOfRound = rounds.calcRoundStartHeight(round);
	const middleOfRound = rounds.calcRoundMiddleHeight(round);
	const startOfLastRound = rounds.calcRoundStartHeight(round - 1);
	const endOfLastRound = rounds.calcRoundEndHeight(round - 1);
	const startOfSecondLastRound = rounds.calcRoundStartHeight(round - 2);

	if (lastBlockHeight < middleOfRound) {
		throw new Error(
			`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height: ${lastBlockHeight.toString()}`,
		);
	}

	if (round === 1) {
		debug('Returning static value because current round is 1');
		const randomSeed1ForFirstRound = strippedHash(
			intToBuffer(middleThreshold + 1, NUMBER_BYTE_SIZE),
		);
		const randomSeed2ForFirstRound = strippedHash(
			intToBuffer(0, NUMBER_BYTE_SIZE),
		);

		return [randomSeed1ForFirstRound, randomSeed2ForFirstRound];
	}

	/**
	 * We need to build a map for current and last two rounds. To previously forged
	 * blocks we will use only current and last round. To validate seed reveal of
	 * any block from last round we have to load second last round as well.
	 */
	const headersMap = headers.reduce(
		(acc: HeadersMap, header: BlockHeader): HeadersMap => {
			if (
				header.height >= startOfSecondLastRound &&
				header.height <= middleOfRound
			) {
				acc[header.height] = header;
			}

			return acc;
		},
		{},
	);

	// From middle of current round to middle of last round
	debug('Fetching seed reveals for random seed 1', {
		fromHeight: startOfRound + middleThreshold,
		toHeight: startOfRound - middleThreshold,
	});
	const seedRevealsForRandomSeed1 = selectSeedReveals({
		fromHeight: startOfRound + middleThreshold,
		toHeight: startOfRound - middleThreshold,
		headersMap,
		rounds,
	});

	// From middle of current round to middle of last round
	debug('Fetching seed reveals for random seed 2', {
		fromHeight: endOfLastRound,
		toHeight: startOfLastRound,
	});
	const seedRevealsForRandomSeed2 = selectSeedReveals({
		fromHeight: endOfLastRound,
		toHeight: startOfLastRound,
		headersMap,
		rounds,
	});

	const randomSeed1 = bitwiseXOR([
		strippedHash(intToBuffer(startOfRound + middleThreshold, NUMBER_BYTE_SIZE)),
		...seedRevealsForRandomSeed1,
	]);
	const randomSeed2 = bitwiseXOR([
		strippedHash(intToBuffer(endOfLastRound, NUMBER_BYTE_SIZE)),
		...seedRevealsForRandomSeed2,
	]);

	return [randomSeed1, randomSeed2];
};
