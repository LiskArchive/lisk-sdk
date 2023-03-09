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
import { ModuleEndpointContext, RandomModule } from '../../../../src';
import { RandomEndpoint } from '../../../../src/modules/random/endpoint';
import { HashOnionStore } from '../../../../src/modules/random/stores/hash_onion';
import { UsedHashOnionsStore } from '../../../../src/modules/random/stores/used_hash_onions';
import { ValidatorRevealsStore } from '../../../../src/modules/random/stores/validator_reveals';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { createTransientModuleEndpointContext } from '../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import * as genesisValidators from '../../../fixtures/genesis_validators.json';

describe('RandomModuleEndpoint', () => {
	let randomEndpoint: RandomEndpoint;
	let context: ModuleEndpointContext;

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

	beforeEach(async () => {
		const randomModule = new RandomModule();
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
		it('should create a new seed and store it in the offchain store', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[1].hashOnion.hashes[1];
			const count = 1000;
			const distance = 10;

			context.params = { address, seed, count, distance };

			// Act
			await randomEndpoint.setHashOnion(context);

			const hashOnionStore = randomEndpoint['offchainStores'].get(HashOnionStore);
			const storedSeed = await hashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			// Assert
			expect(storedSeed).toEqual({
				count,
				distance,
				hashes: expect.any(Array),
			});
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
		let address: string;
		let address2: string;

		beforeEach(async () => {
			address = genesisValidators.validators[0].address;
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 10;
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
				{
					usedHashOnions: [{ count: 20, height: 2121 }],
				},
			);
		});

		it('should return error if param is empty', async () => {
			await expect(
				randomEndpoint.hasHashOnion({
					...context,
					params: {},
				}),
			).rejects.toThrow('must have required property');
		});

		it('should return hasHashOnion false with remaing 0 if hashOnion does not exist', async () => {
			const hasHashOnion = await randomEndpoint.hasHashOnion({
				...context,
				params: { address: 'lsk7tyskeefnd6p6bfksd7ytp5jyaw8f2r9foa6ch' },
			});

			// Assert
			expect(hasHashOnion.hasSeed).toBe(false);
			expect(hasHashOnion.remaining).toBe(0);
		});

		it('should return hasHashOnion true with valid remaining', async () => {
			const hasHashOnion = await randomEndpoint.hasHashOnion({ ...context, params: { address } });

			// Assert
			expect(hasHashOnion.hasSeed).toBe(true);
			expect(hasHashOnion.remaining).toEqual(1000 - 20);
		});

		it('should return hasHashOnion true with remaining the same as original when usedHashOnions does not exist', async () => {
			const hasHashOnion = await randomEndpoint.hasHashOnion({
				...context,
				params: { address: address2 },
			});

			// Assert
			expect(hasHashOnion.hasSeed).toBe(true);
			expect(hasHashOnion.remaining).toBe(1000);
		});
	});

	describe('getHashOnionUsage', () => {
		let address: string;
		let address2: string;

		beforeEach(async () => {
			// Arrange
			address = genesisValidators.validators[0].address;
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 10;
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
				{
					usedHashOnions: [{ count: 20, height: 2121 }],
				},
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
				count: 20,
				height: 2121,
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
				count: 0,
				height: 0,
				seed: expect.any(String),
			});
		});
	});

	describe('setHashOnionUsage', () => {
		it('should store the appropriate params in the offchain store', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[1].hashOnion.hashes[1];
			const count = 1000;
			const distance = 10;
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act
			await randomEndpoint.setHashOnionUsage(context);

			const hashOnionStore = randomEndpoint['offchainStores'].get(HashOnionStore);
			const usedHashOnionStore = randomEndpoint['offchainStores'].get(UsedHashOnionsStore);
			const storedSeed = await hashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);
			const usedOnionData = await usedHashOnionStore.get(
				context,
				cryptography.address.getAddressFromLisk32Address(address),
			);

			// Assert
			expect(storedSeed).toEqual({
				count,
				distance,
				hashes: expect.any(Array),
			});
			expect(usedOnionData).toEqual({
				usedHashOnions: [
					{
						count: 1000,
						height: 50,
					},
				],
			});
		});

		it('should throw error when address provided in params is invalid', async () => {
			// Arrange
			const address = ['address'];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 1000;
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.address' should be of type 'string'",
			);
		});

		it('should throw error when seed provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = ['seed'];
			const count = 1000;
			const distance = 1000;
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.seed' should be of type 'string'",
			);
		});

		it('should throw error when count provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 'count';
			const distance = 1000;
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.count' should be of type 'integer'",
			);
		});

		it('should throw error when distance provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 'distance';
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nProperty '.distance' should be of type 'integer'",
			);
		});

		it('should throw error when height provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 1000;
			const height = 'height';
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				"Lisk validator found 2 error[s]:\nProperty '.height' should be of type 'integer'\nProperty '.height' must match format \"uint32\"",
			);
		});

		it('should throw error when count is less than 1', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 0;
			const distance = 1000;
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				'Lisk validator found 1 error[s]:\nmust be >= 1',
			);
		});

		it('should throw error when distance is less than 1', async () => {
			// Arrange
			const { address } = genesisValidators.validators[0];
			const seed = genesisValidators.validators[0].hashOnion.hashes[1];
			const count = 1000;
			const distance = 0;
			const height = 50;
			context.params = { address, seed, count, distance, height };

			// Act & Assert
			await expect(randomEndpoint.setHashOnionUsage(context)).rejects.toThrow(
				'Lisk validator found 1 error[s]:\nmust be >= 1',
			);
		});
	});
});
