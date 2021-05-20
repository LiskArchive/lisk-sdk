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

import { BlockHeader } from '@liskhq/lisk-chain';
import { hash, intToBuffer } from '@liskhq/lisk-cryptography';
import { Logger } from '../../logger/logger';

import { Rounds } from './rounds';
import { FixedLengthArray, RandomSeed } from './types';

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
	const result = Buffer.alloc(outputSize, 0);

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

const isValidSeedReveal = (seedReveal: Buffer, previousSeedReveal: Buffer): boolean =>
	strippedHash(seedReveal).equals(previousSeedReveal);

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
		// If header does not exist in map, consider the seed reveal is invalid
		// This happens when height is before genesis block (regenesis) or negative height in early round
		if (!header) {
			continue;
		}
		const blockRound = rounds.calcRound(header.height);

		const lastForgedBlock = findPreviousHeaderOfDelegate(
			header,
			rounds.calcRoundStartHeight(blockRound - 1),
			headersMap,
		);

		// If delegate not forged any other block earlier in current and last round
		if (!lastForgedBlock) {
			continue;
		}

		// To validate seed reveal of any block in the last round
		// We have to check till second last round
		if (!isValidSeedReveal(header.asset.seedReveal, lastForgedBlock.asset.seedReveal)) {
			continue;
		}

		selected.push(header.asset.seedReveal);
	}

	return selected;
};

export const generateRandomSeeds = ({
	round,
	rounds,
	headers,
	logger,
}: {
	round: number;
	rounds: Rounds;
	headers: ReadonlyArray<BlockHeader>;
	logger: Logger;
}): FixedLengthArray<RandomSeed, 2> => {
	// Middle range of a round to validate
	const middleThreshold = Math.floor(rounds.blocksPerRound / 2);
	const startOfRound = rounds.calcRoundStartHeight(round);
	const middleOfRound = rounds.calcRoundMiddleHeight(round);
	const startOfLastRound = rounds.calcRoundStartHeight(round - 1);
	const endOfLastRound = rounds.calcRoundEndHeight(round - 1);
	const startOfSecondLastRound = rounds.calcRoundStartHeight(round - 2);

	/**
	 * We need to build a map for current and last two rounds. To previously forged
	 * blocks we will use only current and last round. To validate seed reveal of
	 * any block from last round we have to load second last round as well.
	 */
	const headersMap = headers.reduce((acc: HeadersMap, header: BlockHeader): HeadersMap => {
		if (header.height >= startOfSecondLastRound && header.height <= middleOfRound) {
			acc[header.height] = header;
		}

		return acc;
	}, {});

	// From middle of current round to middle of last round
	logger.debug(
		{
			fromHeight: startOfRound + middleThreshold,
			toHeight: startOfRound - middleThreshold,
		},
		'Fetching seed reveals for random seed 1',
	);
	const seedRevealsForRandomSeed1 = selectSeedReveals({
		fromHeight: startOfRound + middleThreshold,
		toHeight: startOfRound - middleThreshold,
		headersMap,
		rounds,
	});

	// From middle of current round to middle of last round
	logger.debug(
		{
			fromHeight: endOfLastRound,
			toHeight: startOfLastRound,
		},
		'Fetching seed reveals for random seed 2',
	);
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
