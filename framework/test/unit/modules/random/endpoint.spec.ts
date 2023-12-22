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
import { Types, Modules } from '../../../../src';
import { RandomEndpoint } from '../../../../src/modules/random/endpoint';
import { HashOnionStore } from '../../../../src/modules/random/stores/hash_onion';
import {
	UsedHashOnionStoreObject,
	UsedHashOnionsStore,
} from '../../../../src/modules/random/stores/used_hash_onions';
import { ValidatorRevealsStore } from '../../../../src/modules/random/stores/validator_reveals';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { createTransientModuleEndpointContext } from '../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import * as genesisValidators from '../../../fixtures/genesis_validators.json';
import { MAX_HASH_COMPUTATION } from '../../../../src/modules/random/constants';

describe('RandomModuleEndpoint', () => {
	let randomEndpoint: RandomEndpoint;
	let context: Types.ModuleEndpointContext;

	const validatorsData = [
		{
			generatorAddress: cryptography.address.getAddressFromLisk32Address(
				genesisValidators.validators[0].address,
			),
			seedReveal: Buffer.from(genesisValidators.validators[0].hashOnion.hashes[0], 'hex'),
			height: 1,
			valid: true,
		},
		{
			generatorAddress: cryptography.address.getAddressFromLisk32Address(
				genesisValidators.validators[1].address,
			),
			seedReveal: Buffer.from(genesisValidators.validators[1].hashOnion.hashes[1], 'hex'),
			height: 3,
			valid: true,
		},
		{
			generatorAddress: cryptography.address.getAddressFromLisk32Address(
				genesisValidators.validators[2].address,
			),
			seedReveal: Buffer.from(genesisValidators.validators[2].hashOnion.hashes[1], 'hex'),
			height: 5,
			valid: true,
		},
	];

	const emptyBytes = Buffer.alloc(0);
	const defaultUsedHashOnion: UsedHashOnionStoreObject = {
		usedHashOnions: [
			{
				count: 5,
				height: 9,
			},
			{
				count: 6,
				height: 12,
			},
			{
				count: 7,
				height: 15,
			},
		],
	};

	beforeEach(async () => {
		const randomModule = new Modules.Random.RandomModule();
		randomEndpoint = new RandomEndpoint(randomModule.stores, randomModule.offchainStores);
		const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createTransientModuleEndpointContext({
			stateStore,
		});
		const validatorRevealStore = randomModule.stores.get(ValidatorRevealsStore);
		await validatorRevealStore.set(
			{ getStore: (p1, p2) => stateStore.getStore(p1, p2) },
			emptyBytes,
			{ validatorReveals: validatorsData },
		);
	});

	describe('isSeedRevealValid', () => {
		it('should throw error when seedReveal provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const hashToBeChecked = '12345%$#6';
			context.params = { generatorAddress: address, seedReveal: hashToBeChecked };

			// Act & Assert
			await expect(randomEndpoint.isSeedRevealValid(context)).rejects.toThrow(
				'Lisk validator found 1 error[s]:\nProperty \'.seedReveal\' must match format "hex"',
			);
		});

		it('should throw error when generatorAddress provided in params is invalid', async () => {
			// Arrange
			const address = ['address'];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisValidators.validators[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[1].toString('hex');
			context.params = { generatorAddress: address, seedReveal: hashToBeChecked };

			// Act & Assert
			await expect(randomEndpoint.isSeedRevealValid(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.generatorAddress' should be of type 'string'",
			);
		});

		it('should throw error when seedReveal and address provided in params are both invalid', async () => {
			// Arrange
			const address = '777777777&&&';
			const hashToBeChecked = '12345%$#6';
			context.params = { generatorAddress: address, seedReveal: hashToBeChecked };

			// Act & Assert
			await expect(randomEndpoint.isSeedRevealValid(context)).rejects.toThrow(
				'Lisk validator found 2 error[s]:\nProperty \'.generatorAddress\' must match format "lisk32"\nProperty \'.seedReveal\' must match format "hex"',
			);
		});

		it('should return true for a valid seed reveal', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisValidators.validators[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[1].toString('hex');
			context.params = { generatorAddress: address, seedReveal: hashToBeChecked };

			// Act
			const isValid = await randomEndpoint.isSeedRevealValid(context);

			// Assert
			expect(isValid).toEqual({ valid: true });
		});

		it('should return true if no last seed reveal found', async () => {
			// Arrange
			const { address } = genesisValidators.validators[4];
			const seed = genesisValidators.validators[4].hashOnion.hashes[0];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisValidators.validators[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[3].toString('hex');
			context.params = { generatorAddress: address, seedReveal: hashToBeChecked };

			// Act
			const isValid = await randomEndpoint.isSeedRevealValid(context);

			// Assert
			expect(isValid).toEqual({ valid: true });
		});

		it('should return false for an invalid seed reveal when last seed is not hash of the given reveal', async () => {
			// Arrange
			const { address } = genesisValidators.validators[1];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisValidators.validators[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[3].toString('hex');
			context.params = { generatorAddress: address, seedReveal: hashToBeChecked };

			// Act
			const isValid = await randomEndpoint.isSeedRevealValid(context);

			// Assert
			expect(isValid).toEqual({ valid: false });
		});
	});

	describe('setHashOnion', () => {
		it('should create a new hash onion and set used hash onion count to 0', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[1].hashOnion.hashes[1];
			const count = 1000;
			const distance = 10;

			context.params = { address, seed, count, distance };

			// Act
			await randomEndpoint.setHashOnion(context);

			// Assert
			const hashOnionStore = randomEndpoint['offchainStores'].get(HashOnionStore);
			const storedSeed = await hashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			expect(storedSeed).toEqual({
				count,
				distance,
				hashes: expect.any(Array),
			});

			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			const usedHashOnions = await usedHashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			expect(usedHashOnions.usedHashOnions[0].count).toBe(0);
			expect(usedHashOnions.usedHashOnions[0].height).toBe(0);
		});

		it('should set hash onion and set used hash onion count to 0', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = 1000;
			const distance = 10;
			const hashes = cryptography.utils.hashOnion(
				cryptography.utils.generateHashOnionSeed(),
				count,
				distance,
			);

			context.params = { address, hashes: hashes.map(h => h.toString('hex')), count, distance };

			// Act
			await randomEndpoint.setHashOnion(context);

			// Assert
			const hashOnionStore = randomEndpoint['offchainStores'].get(HashOnionStore);
			const storedSeed = await hashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			expect(storedSeed).toEqual({
				count,
				distance,
				hashes: expect.any(Array),
			});

			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			const usedHashOnions = await usedHashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			expect(usedHashOnions.usedHashOnions[0].count).toBe(0);
			expect(usedHashOnions.usedHashOnions[0].height).toBe(0);
		});

		it('should throw error when address provided in params is invalid', async () => {
			// Arrange
			const address = ['address'];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 1000;
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.address' should be of type 'string'",
			);
		});

		it('should throw error when seed provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = ['seed'];
			const count = 1000;
			const distance = 1000;
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.seed' should be of type 'string'",
			);
		});

		it('should throw error when distance is greater than count', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = '7c73f00f64fcebbab49a6145ef14a843';
			const count = 1000;
			const distance = 1001;
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Invalid count. Count must be multiple of distance',
			);
		});

		it('should throw error when hashes is provided but not count', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const distance = 1000;
			context.params = { address, hashes: ['7c73f00f64fcebbab49a6145ef14a843'], distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Hashes must be provided with count and distance.',
			);
		});

		it('should throw error when hashes is provided but not distance', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = 1000000;
			context.params = { address, hashes: ['7c73f00f64fcebbab49a6145ef14a843'], count };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Hashes must be provided with count and distance.',
			);
		});

		it('should throw error when hashes property is empty', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = MAX_HASH_COMPUTATION * 10;
			context.params = {
				address,
				hashes: [],
				count,
				distance: 1,
			};

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'must NOT have fewer than 1 items',
			);
		});

		it('should throw error when count is not multiple of distance', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = 10;
			context.params = {
				address,
				hashes: ['7c73f00f64fcebbab49a6145ef14a843'],
				count,
				distance: 3,
			};

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Invalid count. Count must be multiple of distance.',
			);
		});

		it('should throw error when hashes length does not match with count and distance', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = 2;
			context.params = {
				address,
				hashes: [
					'7c73f00f64fcebbab49a6145ef14a843',
					'7c73f00f64fcebbab49a6145ef14a843',
					'7c73f00f64fcebbab49a6145ef14a843',
				],
				count,
				distance: 2,
			};

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Invalid length of hashes. hashes must have 2 elements',
			);
		});

		it('should throw error when hashes has an element not 16 bytes', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = 1000000;
			const distance = 10000;
			context.params = { address, hashes: ['7c73f00f64fcebbab49a6145ef14a84300'], count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.hashes.0' must NOT have more than 32 characters",
			);
		});

		it(`should throw error when count without hashes is greater than ${MAX_HASH_COMPUTATION}`, async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const count = MAX_HASH_COMPUTATION + 1;
			context.params = { address, count, distance: 1 };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				`Count is too big. In order to set count greater than ${MAX_HASH_COMPUTATION}`,
			);
		});

		it('should throw error when count provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 'count';
			const distance = 1000;
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.count' should be of type 'integer'",
			);
		});

		it('should throw error when distance provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 'distance';
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.distance' should be of type 'integer'",
			);
		});

		it('should throw error when count is less than 1', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 0;
			const distance = 1000;
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Lisk validator found 1 error[s]:\nmust be >= 1',
			);
		});

		it('should throw error when distance is less than 1', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 0;
			context.params = { address, seed, count, distance };

			// Act & Assert
			await expect(randomEndpoint.setHashOnion(context)).rejects.toThrow(
				'Lisk validator found 1 error[s]:\nmust be >= 1',
			);
		});
	});

	describe('getHashOnionSeeds', () => {
		let address: string;

		beforeEach(async () => {
			// Arrange
			address = genesisValidators.validators[0].address;
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 10;

			await randomEndpoint.setHashOnion({ ...context, params: { address, seed, count, distance } });
		});

		it('should return an array of seed objects', async () => {
			// Act
			const storedSeed = await randomEndpoint.getHashOnionSeeds(context);

			// Assert
			expect(storedSeed.seeds).toHaveLength(1);
			expect(storedSeed.seeds[0]).toEqual({
				address,
				count: 1000,
				distance: 10,
				seed: expect.any(String),
			});
		});
	});

	describe('hasHashOnion', () => {
		const count = 1000;
		const distance = 10;

		it('should return error if param is empty', async () => {
			await expect(
				randomEndpoint.hasHashOnion({
					...context,
					params: {},
				}),
			).rejects.toThrow('must have required property');
		});

		it('should return hasSeed false with 0 remaining hashes if hashOnion does not exist', async () => {
			const hasHashOnion = await randomEndpoint.hasHashOnion({
				...context,
				params: { address: 'lsk7tyskeefnd6p6bfksd7ytp5jyaw8f2r9foa6ch' },
			});

			// Assert
			expect(hasHashOnion.hasSeed).toBe(false);
			expect(hasHashOnion.remaining).toBe(0);
		});

		it('should return hasSeed true with valid number of remaining hashes', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const usedCount = 20;

			await randomEndpoint.setHashOnion({ ...context, params: { address, count, distance } });

			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			await usedHashOnionStore.set(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
				{
					usedHashOnions: [{ count: usedCount, height: 2121 }],
				},
			);

			// Act
			const hasHashOnion = await randomEndpoint.hasHashOnion({ ...context, params: { address } });

			// Assert
			expect(hasHashOnion.hasSeed).toBe(true);
			expect(hasHashOnion.remaining).toBe(count - usedCount);
		});

		it('should return hasSeed true with all remaining hashes when usedHashOnions does not exist', async () => {
			// Arrange
			const { address } = genesisValidators.validators[1];
			await randomEndpoint.setHashOnion({ ...context, params: { address, count, distance } });

			// Act
			const hasHashOnion = await randomEndpoint.hasHashOnion({
				...context,
				params: { address },
			});

			// Assert
			expect(hasHashOnion.hasSeed).toBe(true);
			expect(hasHashOnion.remaining).toBe(count);
		});

		it('should return hasSeed false with 0 remaining hashes when a hash onion is used up', async () => {
			// Arrange
			const { address } = genesisValidators.validators[2];

			await randomEndpoint.setHashOnion({ ...context, params: { address, count, distance } });

			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			await usedHashOnionStore.set(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
				{
					usedHashOnions: [{ count, height: 8888 }],
				},
			);

			// Act
			const hasHashOnion = await randomEndpoint.hasHashOnion({ ...context, params: { address } });

			// Assert
			expect(hasHashOnion.hasSeed).toBe(false);
			expect(hasHashOnion.remaining).toBe(0);
		});
	});

	describe('getHashOnionUsage', () => {
		const seed = genesisValidators.validators[0].hashOnion.hashes[1];
		const count = 1000;
		const distance = 10;
		let address: string;
		let address2: string;

		beforeEach(async () => {
			// Arrange
			address = genesisValidators.validators[0].address;
			address2 = genesisValidators.validators[1].address;

			await randomEndpoint.setHashOnion({ ...context, params: { address, seed, count, distance } });
			await randomEndpoint.setHashOnion({
				...context,
				params: { address: address2, count, distance },
			});

			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			await usedHashOnionStore.set(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
				defaultUsedHashOnion,
			);
		});

		it('should reject if the seed does not exist', async () => {
			// Act
			await expect(
				randomEndpoint.getHashOnionUsage({
					...context,
					params: { address: 'lsk7tyskeefnd6p6bfksd7ytp5jyaw8f2r9foa6ch' },
				}),
			).rejects.toThrow('does not exist');
		});

		it('should return the seed usage of a given address', async () => {
			// Act
			const seedUsage = await randomEndpoint.getHashOnionUsage({ ...context, params: { address } });

			// Assert
			expect(seedUsage).toEqual({
				usedHashOnions: defaultUsedHashOnion.usedHashOnions,
				seed: genesisValidators.validators[0].hashOnion.hashes[1],
			});
		});

		it('should return the seed usage when usedHashOnion does not exist', async () => {
			// Act
			const seedUsage = await randomEndpoint.getHashOnionUsage({
				...context,
				params: { address: address2 },
			});

			// Assert
			expect(seedUsage).toEqual({
				usedHashOnions: [{ count: 0, height: 0 }],
				seed: expect.any(String),
			});
		});
	});

	describe('setHashOnionUsage', () => {
		it('should store the appropriate params in the offchain store', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			context.params = { address, usedHashOnions: defaultUsedHashOnion.usedHashOnions };

			// Act
			await randomEndpoint.setHashOnionUsage(context);

			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			const usedOnionData = await usedHashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			// Assert
			expect(usedOnionData).toEqual({
				usedHashOnions: defaultUsedHashOnion.usedHashOnions,
			});
		});

		it('should throw error when address provided in params is invalid', async () => {
			// Arrange
			const address = ['address'];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const distance = 1000;
			context.params = {
				address,
				seed,
				distance,
				usedHashOnions: defaultUsedHashOnion.usedHashOnions,
			};

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.address' should be of type 'string'",
			);
		});

		it('should throw error when count provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 'count';
			const distance = 1000;
			const height = 50;
			context.params = { address, seed, distance, usedHashOnions: [{ count, height }] };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.usedHashOnions.0.count' should be of type 'integer'",
			);
		});

		it('should throw error when height provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 1000;
			const height = 'height';
			context.params = { address, seed, distance, usedHashOnions: [{ count, height }] };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.usedHashOnions.0.height' should be of type 'integer'",
			);
		});
	});
});
