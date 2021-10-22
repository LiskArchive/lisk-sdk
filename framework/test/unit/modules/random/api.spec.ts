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
import { BIG_ENDIAN, intToBuffer } from '@liskhq/lisk-cryptography';
import { RandomAPI } from '../../../../src/modules/random/api';
import {
	MODULE_ID_RANDOM,
	SEED_REVEAL_HASH_SIZE,
	STORE_PREFIX_RANDOM,
} from '../../../../src/modules/random/constants';
import { seedRevealSchema } from '../../../../src/modules/random/schemas';
import { bitwiseXOR } from '../../../../src/modules/random/utils';
import { APIContext } from '../../../../src/node/state_machine';
import { SubStore } from '../../../../src/node/state_machine/types';
import { createTransientAPIContext } from '../../../../src/testing';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';

describe('RandomModuleAPI', () => {
	let randomAPI: RandomAPI;
	let context: APIContext;
	let randomStore: SubStore;

	const emptyBytes = Buffer.alloc(0);

	describe('isSeedRevealValid', () => {
		const validatorsData = [
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[0], 'hex'),
				height: 1,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[1].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[1].hashOnion.hashes[1], 'hex'),
				height: 3,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[2].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[2].hashOnion.hashes[1], 'hex'),
				height: 5,
				valid: true,
			},
		];

		beforeEach(async () => {
			randomAPI = new RandomAPI(MODULE_ID_RANDOM);
			context = createTransientAPIContext({});
			randomStore = context.getStore(randomAPI['moduleID'], STORE_PREFIX_RANDOM);
			await randomStore.setWithSchema(
				emptyBytes,
				{ validatorReveals: validatorsData },
				seedRevealSchema,
			);
		});

		it('should return true for a valid seed reveal', async () => {
			// Arrange
			const address = Buffer.from(genesisDelegates.delegates[0].address, 'hex');

			// Act
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[1];
			const isValid = await randomAPI.isSeedRevealValid(context, address, hashToBeChecked);
			// Assert
			expect(isValid).toEqual(true);
		});

		it('should return true if no last seed reveal found', async () => {
			// Arrange
			const address = Buffer.from(genesisDelegates.delegates[4].address, 'hex');
			// Act
			const seed = genesisDelegates.delegates[4].hashOnion.hashes[0];
			const hashes = cryptography.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[4].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[3];
			const isValid = await randomAPI.isSeedRevealValid(context, address, hashToBeChecked);
			// Assert
			expect(isValid).toEqual(true);
		});

		it('should return false for an invalid seed reveal when last seed is not hash of the given reveal', async () => {
			// Arrange
			const address = Buffer.from(genesisDelegates.delegates[1].address, 'hex');
			// Act
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[3];
			const isValid = await randomAPI.isSeedRevealValid(context, address, hashToBeChecked);
			// Assert
			expect(isValid).toEqual(false);
		});
	});

	describe('getRandomBytes', () => {
		const validatorsData = [
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
				height: 11,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[2], 'hex'),
				height: 13,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[3], 'hex'),
				height: 17,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[4], 'hex'),
				height: 19,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[1].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[1].hashOnion.hashes[1], 'hex'),
				height: 14,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[2].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[2].hashOnion.hashes[1], 'hex'),
				height: 15,
				valid: false,
			},
		];

		beforeEach(async () => {
			randomAPI = new RandomAPI(MODULE_ID_RANDOM);
			context = createTransientAPIContext({});
			randomStore = context.getStore(randomAPI['moduleID'], STORE_PREFIX_RANDOM);
			await randomStore.setWithSchema(
				emptyBytes,
				{ validatorReveals: validatorsData },
				seedRevealSchema,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=2', async () => {
			const height = 11;
			const numberOfSeeds = 2;
			// Create a buffer from height + numberOfSeeds
			const initRandomBuffer = intToBuffer(height + numberOfSeeds, 4, BIG_ENDIAN);

			const randomSeed = cryptography.hash(initRandomBuffer).slice(0, SEED_REVEAL_HASH_SIZE);

			const hashesExpected = [
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[2], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([randomSeed, hashesExpected[0]]),
				hashesExpected[1],
			]);

			await expect(randomAPI.getRandomBytes(context, 11, 2)).resolves.toEqual(xorExpected);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=3', async () => {
			const height = 11;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const initRandomBuffer = intToBuffer(height + numberOfSeeds, 4, BIG_ENDIAN);

			const randomSeed = cryptography.hash(initRandomBuffer).slice(0, SEED_REVEAL_HASH_SIZE);

			const hashesExpected = [
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[2], 'hex'),
				Buffer.from(genesisDelegates.delegates[1].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([bitwiseXOR([randomSeed, hashesExpected[0]]), hashesExpected[1]]),
				hashesExpected[2],
			]);

			await expect(randomAPI.getRandomBytes(context, 11, 3)).resolves.toEqual(xorExpected);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=4 excluding invalid seed reveal', async () => {
			const height = 11;
			const numberOfSeeds = 4;
			// Create a buffer from height + numberOfSeeds
			const initRandomBuffer = intToBuffer(height + numberOfSeeds, 4, BIG_ENDIAN);
			const randomSeed = cryptography.hash(initRandomBuffer).slice(0, SEED_REVEAL_HASH_SIZE);

			const hashesExpected = [
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[2], 'hex'),
				Buffer.from(genesisDelegates.delegates[1].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([bitwiseXOR([randomSeed, hashesExpected[0]]), hashesExpected[1]]),
				hashesExpected[2],
			]);

			await expect(randomAPI.getRandomBytes(context, 11, 4)).resolves.toEqual(xorExpected);
		});

		it('should return XOR random bytes for height=8, numberOfSeeds=3', async () => {
			const height = 8;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const initRandomBuffer = intToBuffer(height + numberOfSeeds, 4, BIG_ENDIAN);

			const randomSeed = cryptography.hash(initRandomBuffer).slice(0, SEED_REVEAL_HASH_SIZE);

			const hashesExpected = [
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([randomSeed, hashesExpected[0]]);

			await expect(randomAPI.getRandomBytes(context, 8, 3)).resolves.toEqual(xorExpected);
		});

		it('should return initial random bytes for height=7, numberOfSeeds=3', async () => {
			const height = 7;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const initRandomBuffer = intToBuffer(height + numberOfSeeds, 4, BIG_ENDIAN);

			const randomSeed = cryptography.hash(initRandomBuffer).slice(0, SEED_REVEAL_HASH_SIZE);

			await expect(randomAPI.getRandomBytes(context, 7, 3)).resolves.toEqual(randomSeed);
		});

		it('should return initial random bytes for height=20, numberOfSeeds=1', async () => {
			const height = 20;
			const numberOfSeeds = 1;
			// Create a buffer from height + numberOfSeeds
			const initRandomBuffer = intToBuffer(height + numberOfSeeds, 4, BIG_ENDIAN);

			const randomSeed = cryptography.hash(initRandomBuffer).slice(0, SEED_REVEAL_HASH_SIZE);

			await expect(randomAPI.getRandomBytes(context, 20, 1)).resolves.toEqual(randomSeed);
		});
	});
});
