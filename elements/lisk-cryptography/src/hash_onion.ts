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
 *
 */

import { hash } from './hash';
import { getRandomBytes } from './nacl';

const HASH_SIZE = 16;
const INPUT_SIZE = 64;
const defaultCount = 1000000;
const defaultDistance = 1000;

export const generateHashOnionSeed = (): Buffer =>
	hash(getRandomBytes(INPUT_SIZE)).slice(0, HASH_SIZE);

export const hashOnion = (
	seed: Buffer,
	count: number = defaultCount,
	distance: number = defaultDistance,
): ReadonlyArray<Buffer> => {
	if (count < distance) {
		throw new Error('Invalid count or distance. Count must be greater than distance');
	}

	if (count % distance !== 0) {
		throw new Error('Invalid count. Count must be multiple of distance');
	}

	let previousHash = seed;
	const hashes = [seed];

	for (let i = 1; i <= count; i += 1) {
		const nextHash = hash(previousHash).slice(0, HASH_SIZE);
		if (i % distance === 0) {
			hashes.push(nextHash);
		}
		previousHash = nextHash;
	}

	return hashes.reverse();
};
