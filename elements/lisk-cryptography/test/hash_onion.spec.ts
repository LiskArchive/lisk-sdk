/*
 * Copyright © 2019 Lisk Foundation
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
import { hashOnion, generateHashOnionSeed } from '../src/hash_onion';

describe('hash onion', () => {
	describe('#generateHashOnionSeed', () => {
		it('should generate a random buffer', () => {
			const seed1 = generateHashOnionSeed().toString('hex');
			const seed2 = generateHashOnionSeed().toString('hex');

			expect(seed1).not.toEqual(seed2);
		});

		it('should generate a random buffer with 16 bytes', () => {
			const seed = generateHashOnionSeed();
			expect(seed).toHaveLength(16);
		});
	});

	describe('#hashOnion', () => {
		let seed: Buffer;
		let hashOnionBuffers: ReadonlyArray<Buffer>;
		beforeAll(() => {
			seed = generateHashOnionSeed();
			hashOnionBuffers = hashOnion(seed);
		});

		it('should return 1001 hash onion hashes checkpoints by default', () => {
			expect(hashOnionBuffers).toHaveLength(1001);
		});

		it('should return hash onion hashes which includes seed as the last element', () => {
			expect(hashOnionBuffers[1000]).toEqual(seed);
		});

		it('should be able to calculate the checkpoint from another checkpoint', () => {
			const firstDistanceHashes = hashOnion(
				hashOnionBuffers[1].slice(),
				1000,
				1,
			);
			expect(firstDistanceHashes[0]).toEqual(hashOnionBuffers[0]);
			expect(firstDistanceHashes[1000]).toEqual(hashOnionBuffers[1]);
		});
	});
});
