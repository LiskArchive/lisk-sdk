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

import { utils } from '@liskhq/lisk-cryptography';
import { SEED_LENGTH } from './constants';
import { ValidatorSeedReveal } from './stores/validator_reveals';

export const isSeedValidInput = (
	generatorAddress: Buffer,
	seedReveal: Buffer,
	validatorReveals: ValidatorSeedReveal[],
	previousSeedRequired = true,
) => {
	let lastSeed: ValidatorSeedReveal | undefined;
	// by construction, validatorsReveal is order by height asc. Therefore, looping from end will give highest value.
	for (let i = validatorReveals.length - 1; i >= 0; i -= 1) {
		const validatorReveal = validatorReveals[i];
		if (validatorReveal.generatorAddress.equals(generatorAddress)) {
			lastSeed = validatorReveal;
			break;
		}
	}

	if (!lastSeed) {
		return !previousSeedRequired;
	}
	return lastSeed.seedReveal.equals(utils.hash(seedReveal).subarray(0, SEED_LENGTH));
};

export const getRandomSeed = (
	height: number,
	numberOfSeeds: number,
	validatorsReveal: ValidatorSeedReveal[],
) => {
	if (!Number.isInteger(height) || !Number.isInteger(numberOfSeeds)) {
		throw new Error('Height or number of seeds cannot be non integer.');
	}
	if (height < 0 || numberOfSeeds < 0) {
		throw new Error('Height or number of seeds cannot be negative.');
	}

	const initRandomBuffer = utils.intToBuffer(height + numberOfSeeds, 4);
	const currentSeeds = [utils.hash(initRandomBuffer).subarray(0, 16)];
	let isInFuture = true;

	for (const validatorReveal of validatorsReveal) {
		if (validatorReveal.height >= height) {
			isInFuture = false;
			if (validatorReveal.height < height + numberOfSeeds && validatorReveal.valid) {
				currentSeeds.push(validatorReveal.seedReveal);
			}
		}
	}

	if (isInFuture) {
		throw new Error('Height is in the future.');
	}

	return bitwiseXOR(currentSeeds);
};

export const bitwiseXOR = (bufferArray: Buffer[]): Buffer => {
	if (bufferArray.length === 0) {
		throw new Error('bitwiseXOR requires at least one buffer for the input.');
	}

	if (bufferArray.length === 1) {
		return bufferArray[0];
	}

	const size = bufferArray[0].length;
	for (let i = 1; i < bufferArray.length; i += 1) {
		if (bufferArray[i].length !== size) {
			throw new Error('All input for XOR should be same size');
		}
	}

	const result = Buffer.alloc(size);

	for (let i = 0; i < size; i += 1) {
		// eslint-disable-next-line no-bitwise
		result[i] = bufferArray.map(b => b[i]).reduce((a, b) => a ^ b, 0);
	}

	return result;
};
