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
import { objects } from '@liskhq/lisk-utils';
import { RandomMethod } from '../../../../src/modules/random/method';
import { SEED_LENGTH } from '../../../../src/modules/random/constants';
import { blockHeaderAssetRandomModule } from '../../../../src/modules/random/schemas';
import { bitwiseXOR } from '../../../../src/modules/random/utils';
import { MethodContext } from '../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../src/testing';
import * as genesisValidators from '../../../fixtures/genesis_validators.json';
import { testCases } from '../../../fixtures/pos_random_seed_generation/pos_random_seed_generation_other_rounds.json';
import { RandomModule } from '../../../../src/modules/random';
import {
	ValidatorRevealsStore,
	ValidatorSeedReveal,
} from '../../../../src/modules/random/stores/validator_reveals';

const strippedHashOfIntegerBuffer = (num: number) =>
	cryptography.utils.hash(cryptography.utils.intToBuffer(num, 4)).subarray(0, SEED_LENGTH);

describe('RandomModuleMethod', () => {
	let randomMethod: RandomMethod;
	let context: MethodContext;
	let randomStore: ValidatorRevealsStore;

	const randomModule = new RandomModule();
	const EMPTY_BYTES = Buffer.alloc(0);

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
			await randomStore.set(context, EMPTY_BYTES, {
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

		it('should return true if the last revealed seed by generatorAddress in validatorReveals array is equal to the hash of seedReveal', async () => {
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
			await randomStore.set(context, EMPTY_BYTES, { validatorReveals: [] });
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

		it('should return false if there is a last revealed seed by generatorAddress in validatorReveals array but it is not equal to the hash of seedReveal', async () => {
			await randomStore.set(context, EMPTY_BYTES, { validatorReveals: twoRoundsValidators });
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

		it('should return true if generatorAddress is not present in any element of validatorReveals array', async () => {
			// Arrange
			const { generatorAddress } = twoRoundsValidators[5];
			const twoRoundsValidatorsClone1 = objects.cloneDeep(twoRoundsValidators);
			twoRoundsValidatorsClone1[5].generatorAddress = Buffer.alloc(0);
			await randomStore.set(context, EMPTY_BYTES, {
				validatorReveals: twoRoundsValidatorsClone1.slice(0, 103),
			});
			const hashes = twoRoundsValidatorsHashes[generatorAddress.toString('hex')];
			const blockAsset: BlockAsset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
			};
			// Act
			const isValid = await randomMethod.isSeedRevealValid(
				context,
				generatorAddress,
				new BlockAssets([blockAsset]),
			);
			// Assert
			expect(isValid).toBe(true);
		});

		it('should return false if seedreveal is not a 16-bytes value', async () => {
			// Arrange
			const { generatorAddress } = twoRoundsValidators[5];
			const twoRoundsValidatorsClone2 = twoRoundsValidators;
			twoRoundsValidatorsClone2[5].seedReveal = cryptography.utils.getRandomBytes(17);
			await randomStore.set(context, EMPTY_BYTES, {
				validatorReveals: twoRoundsValidatorsClone2.slice(0, 103),
			});
			const hashes = twoRoundsValidatorsHashes[generatorAddress.toString('hex')];
			const blockAsset: BlockAsset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
			};
			// Act
			const isValid = await randomMethod.isSeedRevealValid(
				context,
				generatorAddress,
				new BlockAssets([blockAsset]),
			);
			// Assert
			expect(isValid).toBe(false);
		});

		it('should return false if generatorAddress is not a 20-byte input', async () => {
			// Arrange
			const generatorAddress = cryptography.utils.getRandomBytes(21);
			const twoRoundsValidatorsClone3 = objects.cloneDeep(twoRoundsValidators);
			twoRoundsValidatorsClone3[5].generatorAddress = generatorAddress;
			await randomStore.set(context, EMPTY_BYTES, {
				validatorReveals: twoRoundsValidatorsClone3.slice(0, 103),
			});
			const hashes =
				twoRoundsValidatorsHashes[twoRoundsValidators[5].generatorAddress.toString('hex')];
			const blockAsset: BlockAsset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[1] }),
			};
			// Act
			const isValid = await randomMethod.isSeedRevealValid(
				context,
				generatorAddress,
				new BlockAssets([blockAsset]),
			);
			// Assert
			expect(isValid).toBe(false);
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
			await randomStore.set(context, EMPTY_BYTES, { validatorReveals: validatorsData });
		});

		it('should throw error when height is negative', async () => {
			const height = -11;
			const numberOfSeeds = 2;

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be negative.',
			);
		});

		it('should throw error when numberOfSeeds is negative', async () => {
			const height = 11;
			const numberOfSeeds = -2;

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be negative.',
			);
		});

		it('should throw error if for every seedObject element in validatorReveals height > seedObject.height', async () => {
			const height = 35;
			const numberOfSeeds = 5;

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height is in the future.',
			);
		});

		it('should throw error when height is non integer input', async () => {
			const height = 5.1;
			const numberOfSeeds = 2;

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be non integer.',
			);
		});

		it('should throw error when number of seeds is non integer input', async () => {
			const height = 5;
			const numberOfSeeds = 0.3;

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height or number of seeds cannot be non integer.',
			);
		});

		it('should return XOR random bytes as 16 bytes value for height=11, numberOfSeeds=3', async () => {
			const height = 11;
			const numberOfSeeds = 3;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[2], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([randomSeed, ...hashesExpected]);

			expect(xorExpected).toHaveLength(16);
			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=4', async () => {
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
			const xorExpected = bitwiseXOR([randomSeed, ...hashesExpected]);

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).resolves.toEqual(
				xorExpected,
			);
		});

		it('should return XOR random bytes for height=11, numberOfSeeds=5 excluding invalid seed reveal', async () => {
			const height = 11;
			const numberOfSeeds = 5;
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

		it('should return XOR random bytes for height=8, numberOfSeeds=4', async () => {
			const height = 8;
			const numberOfSeeds = 4;
			// Create a buffer from height + numberOfSeeds
			const randomSeed = strippedHashOfIntegerBuffer(height + numberOfSeeds);

			const hashesExpected = [
				Buffer.from(genesisValidators.validators[0].hashOnion.hashes[1], 'hex'),
			];
			// Do XOR of randomSeed with hashes of seed reveal with height >= randomStoreValidator.height >= height + numberOfSeeds
			const xorExpected = bitwiseXOR([randomSeed, ...hashesExpected]);

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

		it('should throw error for height=20, numberOfSeeds=1', async () => {
			const height = 20;
			const numberOfSeeds = 1;

			await expect(randomMethod.getRandomBytes(context, height, numberOfSeeds)).rejects.toThrow(
				'Height is in the future.',
			);
		});
	});

	describe('getRandomBytes from protocol specs', () => {
		describe.each([...testCases].map(testCase => [testCase.description, testCase]))(
			'%s',
			(_description, testCase) => {
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
					await randomStore.set(context, EMPTY_BYTES, { validatorReveals: validators });
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
			},
		);
	});
});
