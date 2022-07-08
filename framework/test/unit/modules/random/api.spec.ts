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

import { BlockAsset, BlockAssets } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { intToBuffer } from '@liskhq/lisk-cryptography';
import { RandomAPI } from '../../../../src/modules/random/api';
import {
	MODULE_ID_RANDOM_BUFFER,
	SEED_REVEAL_HASH_SIZE,
	STORE_PREFIX_RANDOM,
} from '../../../../src/modules/random/constants';
import {
	blockHeaderAssetRandomModule,
	seedRevealSchema,
} from '../../../../src/modules/random/schemas';
import { ValidatorSeedReveal } from '../../../../src/modules/random/types';
import { bitwiseXOR } from '../../../../src/modules/random/utils';
import { APIContext } from '../../../../src/state_machine';
import { SubStore } from '../../../../src/state_machine/types';
import { createTransientAPIContext } from '../../../../src/testing';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';
import { testCases } from './dpos_random_seed_generation/dpos_random_seed_generation_other_rounds.json';
import * as randomSeedsMultipleRounds from '../../../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_other_rounds.json';

const strippedHashOfIntegerBuffer = (num: number) =>
	cryptography.hash(intToBuffer(num, 4)).slice(0, SEED_REVEAL_HASH_SIZE);

describe('RandomModuleAPI', () => {
	let randomAPI: RandomAPI;
	let context: APIContext;
	let randomStore: SubStore;

	const emptyBytes = Buffer.alloc(0);

	describe('isSeedRevealValid', () => {
		const twoRoundsDelegates: ValidatorSeedReveal[] = [];
		const twoRoundsDelegatesHashes: { [key: string]: Buffer[] } = {};

		for (const generator of testCases[0].input.blocks) {
			const generatorAddress = cryptography.getAddressFromPublicKey(
				Buffer.from(generator.generatorPublicKey, 'hex'),
			);
			const seedReveal = Buffer.from(generator.asset.seedReveal, 'hex');

			twoRoundsDelegates.push({
				generatorAddress,
				seedReveal,
				height: generator.height,
				valid: true,
			});

			if (!twoRoundsDelegatesHashes[generatorAddress.toString('hex')]) {
				twoRoundsDelegatesHashes[generatorAddress.toString('hex')] = [];
			}
			twoRoundsDelegatesHashes[generatorAddress.toString('hex')].push(seedReveal);
		}

		beforeEach(async () => {
			randomAPI = new RandomAPI(MODULE_ID_RANDOM_BUFFER);
			context = createTransientAPIContext({});
			randomStore = context.getStore(randomAPI['moduleID'], STORE_PREFIX_RANDOM);
			await randomStore.setWithSchema(
				emptyBytes,
				{ validatorReveals: twoRoundsDelegates.slice(0, 103) },
				seedRevealSchema,
			);
		});

		it('should throw error when asset is undefined', async () => {
			// Arrange
			const delegateAddress = cryptography.getAddressFromPublicKey(
				Buffer.from(testCases[0].input.blocks[0].generatorPublicKey, 'hex'),
			);

			const blockAsset: BlockAsset = {
				moduleID: randomAPI['moduleID'],
				data: undefined as any,
			};

			// Act & Assert
			await expect(
				randomAPI.isSeedRevealValid(context, delegateAddress, new BlockAssets([blockAsset])),
			).rejects.toThrow('Block asset is missing.');
		});

		it('should return true for a valid seed reveal', async () => {
			for (const [address, hashes] of Object.entries(twoRoundsDelegatesHashes)) {
				// Arrange
				const blockAsset: BlockAsset = {
					moduleID: randomAPI['moduleID'],
					data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
				};
				// Act
				const isValid = await randomAPI.isSeedRevealValid(
					context,
					Buffer.from(address, 'hex'),
					new BlockAssets([blockAsset]),
				);
				// Assert
				expect(isValid).toEqual(true);
			}
		});

		it('should return true if no last seed reveal found', async () => {
			// Arrange
			await randomStore.setWithSchema(emptyBytes, { validatorReveals: [] }, seedRevealSchema);
			for (const [address, hashes] of Object.entries(twoRoundsDelegatesHashes)) {
				const blockAsset: BlockAsset = {
					moduleID: randomAPI['moduleID'],
					data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
				};
				// Act
				const isValid = await randomAPI.isSeedRevealValid(
					context,
					Buffer.from(address, 'hex'),
					new BlockAssets([blockAsset]),
				);
				// Assert
				expect(isValid).toEqual(true);
			}
		});

		it('should return false for an invalid seed reveal when last seed is not hash of the given reveal', async () => {
			await randomStore.setWithSchema(
				emptyBytes,
				{ validatorReveals: twoRoundsDelegates },
				seedRevealSchema,
			);
			for (const [address, hashes] of Object.entries(twoRoundsDelegatesHashes)) {
				// Arrange
				const blockAsset: BlockAsset = {
					moduleID: randomAPI['moduleID'],
					data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
				};
				// Act
				const isValid = await randomAPI.isSeedRevealValid(
					context,
					Buffer.from(address, 'hex'),
					new BlockAssets([blockAsset]),
				);
				// Assert
				expect(isValid).toEqual(false);
			}
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
			randomAPI = new RandomAPI(MODULE_ID_RANDOM_BUFFER);
			context = createTransientAPIContext({});
			randomStore = context.getStore(randomAPI['moduleID'], STORE_PREFIX_RANDOM);
			await randomStore.setWithSchema(
				emptyBytes,
				{ validatorReveals: validatorsData },
				seedRevealSchema,
			);
		});

		it('should throw error when height is negative', async () => {
			const height = -11;
			const numberOfSeeds = 2;
			// Create a buffer from height + numberOfSeeds

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be negative.',
			);
		});

		it('should throw error when numberOfSeeds is negative', async () => {
			const height = 11;
			const numberOfSeeds = -2;
			// Create a buffer from height + numberOfSeeds

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be negative.',
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=2', async () => {
			const height = 11;
			const numberOfSeeds = 2;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[2], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([randomSeed, hashesExpected[0]]),
				hashesExpected[1],
			]);

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=3', async () => {
			const height = 11;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

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

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=4 excluding invalid seed reveal', async () => {
			const height = 11;
			const numberOfSeeds = 4;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

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

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=8, numberOfSeeds=3', async () => {
			const height = 8;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([randomSeed, hashesExpected[0]]);

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return initial random bytes for height=7, numberOfSeeds=3', async () => {
			const height = 7;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				randomSeed,
			);
		});

		it('should return initial random bytes for height=20, numberOfSeeds=1', async () => {
			const height = 20;
			const numberOfSeeds = 1;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			await expect(randomAPI.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				randomSeed,
			);
		});
	});

	describe('generateRandomSeeds', () => {
		describe.each(
			[...randomSeedsMultipleRounds.testCases].map(testCase => [testCase.description, testCase]),
		)('%s', (_description, testCase) => {
			// Arrange
			const { config, input, output } = testCase as any;
			const validators: ValidatorSeedReveal[] = [];

			for (const generator of input.blocks) {
				const generatorAddress = cryptography.getAddressFromPublicKey(
					Buffer.from(generator.generatorPublicKey, 'hex'),
				);
				const seedReveal = Buffer.from(generator.asset.seedReveal, 'hex');

				validators.push({
					generatorAddress,
					seedReveal,
					height: generator.height,
					valid: true,
				});
			}

			beforeEach(async () => {
				randomAPI = new RandomAPI(MODULE_ID_RANDOM_BUFFER);
				context = createTransientAPIContext({});
				randomStore = context.getStore(randomAPI['moduleID'], STORE_PREFIX_RANDOM);
				await randomStore.setWithSchema(
					emptyBytes,
					{ validatorReveals: validators },
					seedRevealSchema,
				);
			});

			it('should generate correct random seeds', async () => {
				// Arrange
				// For randomSeed 1
				const round = Math.floor(
					input.blocks[input.blocks.length - 1].height / config.blocksPerRound,
				);
				const middleThreshold = Math.floor(config.blocksPerRound / 2);
				const startOfRound = config.blocksPerRound * (round - 1) + 1;
				// To validate seed reveal of any block in the last round we have to check till second last round that doesn't exist for last round
				const heightForSeed1 = startOfRound - (round === 2 ? 0 : middleThreshold);
				// For randomSeed 2
				const endOfLastRound = startOfRound - 1;
				const startOfLastRound = endOfLastRound - config.blocksPerRound + 1;
				// Act
				const randomSeed1 = await randomAPI.getRandomBytes(
					context,
					heightForSeed1,
					round === 2 ? middleThreshold : middleThreshold * 2,
				);
				// There is previous round for last round when round is 2
				const randomSeed2 =
					round === 2
						? strippedHashOfIntegerBuffer(endOfLastRound)
						: await randomAPI.getRandomBytes(context, startOfLastRound, middleThreshold * 2);
				// Assert
				expect(randomSeed1.toString('hex')).toEqual(output.randomSeed1);
				expect(randomSeed2.toString('hex')).toEqual(output.randomSeed2);
			});
		});
	});
});
