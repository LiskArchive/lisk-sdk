/*
 * Copyright © 2023 Lisk Foundation
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
import { bitwiseXOR, isSeedValidInput } from '../../../../src/modules/random/utils';
import { bitwiseXORFixtures } from './bitwise_xor_fixtures';
import { ValidatorSeedReveal } from '../../../../src/modules/random/stores/validator_reveals';
import { SEED_LENGTH, ADDRESS_LENGTH } from '../../../../src/modules/random/constants';

describe('Random module utils', () => {
	describe('bitwiseXOR', () => {
		it('should throw if an empty array is provided as an argument', () => {
			expect(() => bitwiseXOR([])).toThrow(
				'bitwiseXOR requires at least one buffer for the input.',
			);
		});

		it('should return the first element if there are no other elements', () => {
			const buffer = Buffer.from([0, 1, 1, 1]);
			const input = [buffer];

			expect(bitwiseXOR(input)).toEqual(buffer);
		});

		it.each(bitwiseXORFixtures)('should return correct XOR value', ({ input, output }) => {
			expect(bitwiseXOR(input)).toEqual(output);
		});

		it('should throw if input elements have different length', () => {
			const input = [Buffer.from([0, 1, 1, 1]), Buffer.from([0, 0, 0, 1, 0])];

			expect(() => bitwiseXOR(input)).toThrow('All input for XOR should be same size');
		});
	});

	describe('isSeedValidInput', () => {
		const generatorAddress = utils.getRandomBytes(ADDRESS_LENGTH);
		const seed = utils.getRandomBytes(SEED_LENGTH);
		const previousSeed = utils.hash(seed).subarray(0, SEED_LENGTH);
		let validatorSeedReveals: ValidatorSeedReveal[];

		beforeEach(() => {
			let height = 100;
			validatorSeedReveals = Array(103)
				.fill(0)
				.map(() => {
					height += 1;
					return {
						generatorAddress: utils.getRandomBytes(ADDRESS_LENGTH),
						seedReveal: utils.getRandomBytes(SEED_LENGTH),
						height,
						valid: true,
					};
				});
		});

		it('should return true when a matching seed is provided corresponding to the highest seed from the generator', () => {
			validatorSeedReveals[88].generatorAddress = generatorAddress;
			validatorSeedReveals[88].seedReveal = previousSeed;

			expect(isSeedValidInput(generatorAddress, seed, validatorSeedReveals)).toBe(true);
		});

		it('should return false when a matching seed is provided, but not corresponding to the highest seed from the generator', () => {
			validatorSeedReveals[88].generatorAddress = generatorAddress;
			validatorSeedReveals[88].seedReveal = previousSeed;

			validatorSeedReveals[99].generatorAddress = generatorAddress;

			expect(isSeedValidInput(generatorAddress, seed, validatorSeedReveals)).toBe(false);
		});

		it('should return false when previous seed exists, but the provided seed does not match', () => {
			validatorSeedReveals[88].generatorAddress = generatorAddress;

			expect(isSeedValidInput(generatorAddress, seed, validatorSeedReveals)).toBe(false);
		});

		it('should return false when previous seed is missing and previous seed is required', () => {
			expect(isSeedValidInput(generatorAddress, seed, validatorSeedReveals)).toBe(false);
		});

		it('should return true for any provided seed when previous seed is missing, but it is not required', () => {
			expect(
				isSeedValidInput(
					generatorAddress,
					utils.getRandomBytes(SEED_LENGTH),
					validatorSeedReveals,
					false,
				),
			).toBe(true);
		});
	});
});
