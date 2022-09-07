/*
 * Copyright © 2021 Lisk Foundation
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

import * as cryptography from '@liskhq/lisk-cryptography';
import { utils } from '@liskhq/lisk-cryptography';
import { SEED_LENGTH } from './constants';
import { ValidatorSeedReveal } from './stores/validator_reveals';

export const isSeedValidInput = (
	generatorAddress: Buffer,
	seedReveal: Buffer,
	validatorsReveal: ValidatorSeedReveal[],
) => {
	let lastSeed: ValidatorSeedReveal | undefined;
	// by construction, validatorsReveal is order by height asc. Therefore, looping from end will give highest value.
	for (let i = validatorsReveal.length - 1; i >= 0; i -= 1) {
		const validatorReveal = validatorsReveal[i];
		if (validatorReveal.generatorAddress.equals(generatorAddress)) {
			lastSeed = validatorReveal;
			break;
		}
	}
	// if the last seed is does not exist, seed reveal is invalid for use
	if (!lastSeed) {
		return false;
	}
	return lastSeed.seedReveal.equals(cryptography.utils.hash(seedReveal).slice(0, SEED_LENGTH));
};

export const getSeedRevealValidity = (
	generatorAddress: Buffer,
	seedReveal: Buffer,
	validatorsReveal: ValidatorSeedReveal[],
) => {
	let lastSeed: ValidatorSeedReveal | undefined;
	let maxheight = 0;
	for (const validatorReveal of validatorsReveal) {
		if (
			validatorReveal.generatorAddress.equals(generatorAddress) &&
			validatorReveal.height > maxheight
		) {
			maxheight = validatorReveal.height;

			lastSeed = validatorReveal;
		}
	}

	return (
		!lastSeed ||
		lastSeed.seedReveal.equals(cryptography.utils.hash(seedReveal).slice(0, SEED_LENGTH))
	);
};

export const getRandomSeed = (
	height: number,
	numberOfSeeds: number,
	validatorsReveal: ValidatorSeedReveal[],
) => {
	if (height < 0 || numberOfSeeds < 0) {
		throw new Error('Height or number of seeds cannot be negative.');
	}
	const initRandomBuffer = utils.intToBuffer(height + numberOfSeeds, 4);
	let randomSeed = cryptography.utils.hash(initRandomBuffer).slice(0, 16);
	const currentSeeds = validatorsReveal.filter(
		v => height <= v.height && v.height <= height + numberOfSeeds,
	);
	for (const seedObject of currentSeeds) {
		if (seedObject.valid) {
			randomSeed = bitwiseXOR([randomSeed, seedObject.seedReveal]);
		}
	}

	return randomSeed;
};

export const bitwiseXOR = (bufferArray: Buffer[]): Buffer => {
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
