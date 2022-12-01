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
import { utils } from '@liskhq/lisk-cryptography';
import { RandomMethod } from '../../../../src/modules/random/method';
import { SEED_LENGTH } from '../../../../src/modules/random/constants';
import { blockHeaderAssetRandomModule } from '../../../../src/modules/random/schemas';
import { bitwiseXOR } from '../../../../src/modules/random/utils';
import { MethodContext } from '../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../src/testing';
import * as genesisValidators from '../../../fixtures/genesis_validators.json';
import { testCases } from './pos_random_seed_generation/pos_random_seed_generation_other_rounds.json';
import * as randomSeedsMultipleRounds from '../../../fixtures/pos_random_seed_generation/pos_random_seed_generation_other_rounds.json';
import { RandomModule } from '../../../../src/modules/random';
import {
	ValidatorRevealsStore,
	ValidatorSeedReveal,
} from '../../../../src/modules/random/stores/validator_reveals';

const strippedHashOfIntegerBuffer = (num: number) =>
	cryptography.utils.hash(utils.intToBuffer(num, 4)).slice(0, SEED_LENGTH);

describe('RandomModuleMethod', () => {
	let randomMethod: RandomMethod;
	let context: MethodContext;
	let randomStore: ValidatorRevealsStore;

	const randomModule = new RandomModule();
	const emptyBytes = Buffer.alloc(0);

	describe('isSeedRevealValid', () => {
		const twoRoundsValidators: ValidatorSeedReveal[] = [];
		const twoRoundsValidatorsHashes: { [key: string]: Buffer[] } = {};

		for (const generator of testCases[0].input.blocks) {
			const generatorAddress = cryptography.address.getAddressFromPublicKey(
				Buffer.from(generator.generatorPublicKey, 'hex'),
			);
			const seedReveal = Buffer.from(generator.asset.seedReveal, 'hex');

			twoRoundsValidators.push({
				generatorAddress,
				seedReveal,
				height: generator.height,
				valid: true,
			});

			if (!twoRoundsValidatorsHashes[generatorAddress.toString('hex')]) {
				twoRoundsValidatorsHashes[generatorAddress.toString('hex')] = [];
			}
			twoRoundsValidatorsHashes[generatorAddress.toString('hex')].push(seedReveal);
		}

		beforeEach(async () => {
			randomMethod = new RandomMethod(randomModule.stores, randomModule.events, randomModule.name);
			context = createTransientMethodContext({});
			randomStore = randomModule.stores.get(ValidatorRevealsStore);
			await randomStore.set(context, emptyBytes, {
				validatorReveals: twoRoundsValidators.slice(0, 103),
			});
		});

		it('should throw error when asset is undefined', async () => {
			// Arrange
			const validatorAddress = cryptography.address.getAddressFromPublicKey(
				Buffer.from(testCases[0].input.blocks[0].generatorPublicKey, 'hex'),
			);

			const blockAsset: BlockAsset = {
				module: randomModule.name,
				data: undefined as any,
			};

			// Act & Assert
			await expect(
				randomMethod.isSeedRevealValid(context, validatorAddress, new BlockAssets([blockAsset])),
			).rejects.toThrow('Block asset is missing.');
		});

		it('should return true for a valid seed reveal', async () => {
			for (const [address, hashes] of Object.entries(twoRoundsValidatorsHashes)) {
				// Arrange
				const blockAsset: BlockAsset = {
					module: randomModule.name,
					data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
				};
				// Act
				const isValid = await randomMethod.isSeedRevealValid(
					context,
					Buffer.from(address, 'hex'),
					new BlockAssets([blockAsset]),
				);
				// Assert
				expect(isValid).toBe(true);
			}
		});

		it('should return true if no last seed reveal found', async () => {
			// Arrange
			await randomStore.set(context, emptyBytes, { validatorReveals: [] });
			for (const [address, hashes] of Object.entries(twoRoundsValidatorsHashes)) {
				const blockAsset: BlockAsset = {
					module: randomModule.name,
					data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
				};
				// Act
				const isValid = await randomMethod.isSeedRevealValid(
					context,
					Buffer.from(address, 'hex'),
					new BlockAssets([blockAsset]),
				);
				// Assert
				expect(isValid).toBe(true);
			}
		});

		it('should return false for an invalid seed reveal when last seed is not hash of the given reveal', async () => {
			await randomStore.set(context, emptyBytes, { validatorReveals: twoRoundsValidators });
			for (const [address, hashes] of Object.entries(twoRoundsValidatorsHashes)) {
				// Arrange
				const blockAsset: BlockAsset = {
					module: randomModule.name,
					data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
				};
				// Act
				const isValid = await randomMethod.isSeedRevealValid(
					context,
					Buffer.from(address, 'hex'),
					new BlockAssets([blockAsset]),
				);
				// Assert
				expect(isValid).toBe(false);
			}
		});
	});

	describe('getRandomBytes', () => {
		const validatorsData = [
			{
				generatorAddress: Buffer.from(genesisValidators.validators[0].address, 'hex'),
				seedReveal: Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
				height: 11,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisValidators.validators[0].address, 'hex'),
				seedReveal: Buffer.from(genesisValidators.validators[0].hashOnion.hashes[2], 'hex'),
				height: 13,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisValidators.validators[0].address, 'hex'),
				seedReveal: Buffer.from(genesisValidators.validators[0].hashOnion.hashes[3], 'hex'),
				height: 17,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisValidators.validators[0].address, 'hex'),
				seedReveal: Buffer.from(genesisValidators.validators[0].hashOnion.hashes[4], 'hex'),
				height: 19,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisValidators.validators[1].address, 'hex'),
				seedReveal: Buffer.from(genesisValidators.validators[1].hashOnion.hashes[1], 'hex'),
				height: 14,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisValidators.validators[2].address, 'hex'),
				seedReveal: Buffer.from(genesisValidators.validators[2].hashOnion.hashes[1], 'hex'),
				height: 15,
				valid: false,
			},
		];

		beforeEach(async () => {
			randomMethod = new RandomMethod(randomModule.stores, randomModule.events, randomModule.name);
			context = createTransientMethodContext({});
			randomStore = randomModule.stores.get(ValidatorRevealsStore);
			await randomStore.set(context, emptyBytes, { validatorReveals: validatorsData });
		});

		it('should throw error when height is negative', async () => {
			const height = -11;
			const numberOfSeeds = 2;
			// Create a buffer from height + numberOfSeeds

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be negative.',
			);
		});

		it('should throw error when numberOfSeeds is negative', async () => {
			const height = 11;
			const numberOfSeeds = -2;
			// Create a buffer from height + numberOfSeeds

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be negative.',
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=2', async () => {
			const height = 11;
			const numberOfSeeds = 2;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[2], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([randomSeed, hashesExpected[0]]),
				hashesExpected[1],
			]);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=3', async () => {
			const height = 11;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[2], 'hex'),
				Buffer.from(genesisValidators.validators[1].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([bitwiseXOR([randomSeed, hashesExpected[0]]), hashesExpected[1]]),
				hashesExpected[2],
			]);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=4 excluding invalid seed reveal', async () => {
			const height = 11;
			const numberOfSeeds = 4;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[2], 'hex'),
				Buffer.from(genesisValidators.validators[1].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([
				bitwiseXOR([bitwiseXOR([randomSeed, hashesExpected[0]]), hashesExpected[1]]),
				hashesExpected[2],
			]);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=8, numberOfSeeds=3', async () => {
			const height = 8;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([randomSeed, hashesExpected[0]]);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return initial random bytes for height=7, numberOfSeeds=3', async () => {
			const height = 7;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				randomSeed,
			);
		});

		it('should return initial random bytes for height=20, numberOfSeeds=1', async () => {
			const height = 20;
			const numberOfSeeds = 1;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
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
				const generatorAddress = cryptography.address.getAddressFromPublicKey(
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
				randomMethod = new RandomMethod(
					randomModule.stores,
					randomModule.events,
					randomModule.name,
				);
				context = createTransientMethodContext({});
				randomStore = randomModule.stores.get(ValidatorRevealsStore);
				await randomStore.set(context, emptyBytes, { validatorReveals: validators });
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
				const randomSeed1 = await randomMethod.getRandomBytes(
					context,
					heightForSeed1,
					round === 2 ? middleThreshold : middleThreshold * 2,
				);
				// There is previous round for last round when round is 2
				const randomSeed2 =
					round === 2
						? strippedHashOfIntegerBuffer(endOfLastRound)
						: await randomMethod.getRandomBytes(context, startOfLastRound, middleThreshold * 2);
				// Assert
				expect(randomSeed1.toString('hex')).toEqual(output.randomSeed1);
				expect(randomSeed2.toString('hex')).toEqual(output.randomSeed2);
			});
		});
	});
});
