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

import { hash } from '@liskhq/lisk-cryptography';

import { Rounds } from './rounds';
import { BlockHeader, FixedLengthArray, RandomSeed } from './types';

interface HeadersMap {
	// tslint:disable-next-line:readonly-keyword
	[key: number]: BlockHeader;
}

const NUMBER_BYTE_SIZE = 4;
const RANDOM_SEED_BYTE_SIZE = 16;

const numberToBuffer = (data: number): Buffer => {
	const buffer = Buffer.alloc(NUMBER_BYTE_SIZE);
	buffer.writeUInt32BE(data, 0);

	return buffer;
};

const hexStrToBuffer = (str: string): Buffer => Buffer.from(str, 'hex');

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

	// tslint:disable-next-line:no-let
	for (let i = 0; i < outputSize; i += 1) {
		// tslint:disable-next-line:no-bitwise
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

	// tslint:disable-next-line:no-let
	for (let i = height - 1; i >= searchTill; i -= 1) {
		if (headersMap[i].generatorPublicKey === generatorPublicKey) {
			return headersMap[i];
		}
	}

	return undefined;
};

const isValidSeedReveal = (
	seedReveal: string,
	previousSeedReveal: string,
): boolean =>
	strippedHash(hexStrToBuffer(seedReveal)).toString('hex') ===
	previousSeedReveal;

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

	// tslint:disable-next-line:no-let
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
			continue;
		}

		// To validate seed reveal of any block in the last round
		// We have to check till second last round
		if (!isValidSeedReveal(header.seedReveal, lastForgedBlock.seedReveal)) {
			continue;
		}

		selected.push(hexStrToBuffer(header.seedReveal));
	}

	return selected;
};

export const generateRandomSeeds = (
	round: number,
	rounds: Rounds,
	headers: BlockHeader[],
	// tslint:disable-next-line:no-magic-numbers
): FixedLengthArray<RandomSeed, 2> => {
	// Middle range of a round to validate
	// tslint:disable-next-line:no-magic-numbers
	const middleThreshold = Math.floor(rounds.blocksPerRound / 2);
	const currentRound = round;
	const lastBlockHeight = headers[headers.length - 1].height;
	const startOfCurrentRound = rounds.calcRoundStartHeight(currentRound);
	const middleOfCurrentRound = rounds.calcRoundMiddleHeight(currentRound);
	const startOfLastRound = rounds.calcRoundStartHeight(currentRound - 1);
	const endOfLastRound = rounds.calcRoundEndHeight(currentRound - 1);
	// tslint:disable-next-line:no-magic-numbers
	const startOfSecondLastRound = rounds.calcRoundStartHeight(currentRound - 2);

	if (lastBlockHeight < middleOfCurrentRound) {
		throw new Error(
			`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height: ${lastBlockHeight}`,
		);
	}

	if (currentRound === 1) {
		const randomSeed1ForFirstRound = strippedHash(
			numberToBuffer(middleThreshold + 1),
		);
		const randomSeed2ForFirstRound = strippedHash(numberToBuffer(0));

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
				header.height <= middleOfCurrentRound
			) {
				acc[header.height] = header;
			}

			return acc;
		},
		{},
	);

	// From middle of current round to middle of last round
	const seedRevealsForRandomSeed1 = selectSeedReveals({
		fromHeight: startOfCurrentRound + middleThreshold,
		toHeight: startOfCurrentRound - middleThreshold,
		headersMap,
		rounds,
	});

	// From middle of current round to middle of last round
	const seedRevealsForRandomSeed2 = selectSeedReveals({
		fromHeight: endOfLastRound,
		toHeight: startOfLastRound,
		headersMap,
		rounds,
	});

	const randomSeed1 = bitwiseXOR([
		strippedHash(numberToBuffer(startOfCurrentRound + middleThreshold)),
		...seedRevealsForRandomSeed1,
	]);
	const randomSeed2 = bitwiseXOR([
		strippedHash(numberToBuffer(endOfLastRound)),
		...seedRevealsForRandomSeed2,
	]);

	return [randomSeed1, randomSeed2];
};
