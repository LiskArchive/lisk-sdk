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
import { when } from 'jest-when';
import { ModuleEndpointContext, RandomModule } from '../../../../src';
import { RandomEndpoint } from '../../../../src/modules/random/endpoint';
import { seedRevealSchema, setSeedSchema } from '../../../../src/modules/random/schemas';
import { createTransientModuleEndpointContext } from '../../../../src/testing';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';

describe('RandomModuleEndpoint', () => {
	let randomEndpoint: RandomEndpoint;
	let context: ModuleEndpointContext;
	const subStoreMock = jest.fn();
	const storeMock = jest.fn().mockReturnValue({ getWithSchema: subStoreMock });
	const stateStore: any = {
		getStore: storeMock,
	};

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

		beforeEach(() => {
			const randomModule = new RandomModule();
			randomEndpoint = new RandomEndpoint(randomModule.stores, randomModule.offchainStores);
			context = createTransientModuleEndpointContext({
				stateStore,
			});
			when(subStoreMock)
				.calledWith(emptyBytes, seedRevealSchema)
				.mockReturnValue({ validatorReveals: validatorsData });
		});

		it('should throw error when seedReveal provided in params is invalid', async () => {
			// Arrange
			const { address } = genesisDelegates.delegates[0];
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
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
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
				'Lisk validator found 2 error[s]:\nProperty \'.generatorAddress\' must match format "hex"\nProperty \'.seedReveal\' must match format "hex"',
			);
		});

		it('should return true for a valid seed reveal', async () => {
			// Arrange
			const { address } = genesisDelegates.delegates[0];
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
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
			const { address } = genesisDelegates.delegates[4];
			const seed = genesisDelegates.delegates[4].hashOnion.hashes[0];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
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
			const { address } = genesisDelegates.delegates[1];
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.utils.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
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

	describe('Random Module Endpoints', () => {
		beforeEach(() => {
			randomEndpoint = new RandomEndpoint(MODULE_ID_RANDOM_BUFFER);
			context = createTransientModuleEndpointContext({});
		});

		describe('setSeed', () => {
			it('should create a new seed and store it in the offchain store', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[1].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 1000;

				context.params = { address, seed, count, distance };

				// Act
				await randomEndpoint.setSeed(context);

				const storedSeed = await context
					.getOffchainStore(randomEndpoint['moduleID'])
					.getWithSchema(Buffer.from(address, 'hex'), setSeedSchema);

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
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 1000;
				context.params = { address, seed, count, distance };

				// Act & Assert
				await expect(randomEndpoint.setSeed(context)).rejects.toThrow(
					"Lisk validator found 1 error[s]:\nProperty '.address' should be of type 'string'",
				);
			});

			it('should throw error when seed provided in params is invalid', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = ['seed'];
				const count = 1000000;
				const distance = 1000;
				context.params = { address, seed, count, distance };

				// Act & Assert
				await expect(randomEndpoint.setSeed(context)).rejects.toThrow(
					"Lisk validator found 1 error[s]:\nProperty '.seed' should be of type 'string'",
				);
			});

			it('should throw error when count provided in params is invalid', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 'count';
				const distance = 1000;
				context.params = { address, seed, count, distance };

				// Act & Assert
				await expect(randomEndpoint.setSeed(context)).rejects.toThrow(
					"Lisk validator found 1 error[s]:\nProperty '.count' should be of type 'integer'",
				);
			});

			it('should throw error when distance provided in params is invalid', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 'distance';
				context.params = { address, seed, count, distance };

				// Act & Assert
				await expect(randomEndpoint.setSeed(context)).rejects.toThrow(
					"Lisk validator found 1 error[s]:\nProperty '.distance' should be of type 'integer'",
				);
			});

			it('should throw error when count is less than 1', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 0;
				const distance = 1000;
				context.params = { address, seed, count, distance };

				// Act & Assert
				await expect(randomEndpoint.setSeed(context)).rejects.toThrow(
					'Lisk validator found 1 error[s]:\nmust be >= 1',
				);
			});

			it('should throw error when distance is less than 1', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 0;
				context.params = { address, seed, count, distance };

				// Act & Assert
				await expect(randomEndpoint.setSeed(context)).rejects.toThrow(
					'Lisk validator found 1 error[s]:\nmust be >= 1',
				);
			});
		});

		describe('getSeeds', () => {
			it('should return an array of seed objects', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 1000;

				context.params = { address, seed, count, distance };

				// Act
				await randomEndpoint.setSeed(context);
				const storedSeed = await randomEndpoint.getSeeds(context);

				// Assert
				expect(storedSeed).toEqual(expect.any(Object));
			});
		});

		describe('hasSeed', () => {
			it("should return an object with a property 'hasSeed' that is a boolean and a property 'remaining' that is a number", async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 1000;

				context.params = { address, seed, count, distance };

				// Act
				await randomEndpoint.setSeed(context);
				const hasSeed = await randomEndpoint.hasSeed(context);

				// Assert
				expect(hasSeed.hasSeed).toEqual(expect.any(Boolean));
				expect(hasSeed.remaining).toEqual(expect.any(Number));
			});
		});

		describe('getSeedUsage', () => {
			it('should return the seed usage of a given address', async () => {
				// Arrange
				const { address } = genesisDelegates.delegates[0];
				const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
				const count = 1000000;
				const distance = 1000;

				context.params = { address, seed, count, distance };

				// Act
				await randomEndpoint.setSeed(context);
				const seedUsage = await randomEndpoint.getSeedUsage(context);

				// Assert
				expect(seedUsage).toEqual(expect.any(Object));
			});
		});
	});
});
