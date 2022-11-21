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

import { utils, address } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { BlockAssets, StateStore } from '@liskhq/lisk-chain';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import * as genesisValidators from '../../../fixtures/genesis_validators.json';
import { RandomModule } from '../../../../src/modules/random';
import {
	UsedHashOnionStoreObject,
	UsedHashOnionsStore,
} from '../../../../src/modules/random/stores/used_hash_onions';
import { EMPTY_KEY } from '../../../../src/modules/random/constants';
import { blockHeaderAssetRandomModule } from '../../../../src/modules/random/schemas';
import { defaultChainID } from '../../../fixtures';
import { GenesisConfig, testing } from '../../../../src';
import {
	createBlockContext,
	createBlockHeaderWithDefaults,
	createGenesisBlockContext,
} from '../../../../src/testing';
import { InsertAssetContext } from '../../../../src/state_machine';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { ValidatorRevealsStore } from '../../../../src/modules/random/stores/validator_reveals';
import { HashOnionStore } from '../../../../src/modules/random/stores/hash_onion';

const convertDelegateFixture = (validators: typeof genesisValidators.validators) =>
	validators.map(validator => ({
		address: validator.address,
		hashOnion: validator.hashOnion,
	}));

describe('RandomModule', () => {
	let randomModule: RandomModule;
	let offchainStore: StateStore;

	const assetStub = {
		getAsset: jest.fn(),
		setAsset: jest.fn(),
	};

	beforeEach(async () => {
		randomModule = new RandomModule();
		const db = new InMemoryDatabase();
		const hashOnionStore = randomModule.offchainStores.get(HashOnionStore);
		offchainStore = new StateStore(db);
		for (const validator of genesisValidators.validators) {
			await hashOnionStore.set(
				// eslint-disable-next-line no-loop-func
				{ getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2) },
				address.getAddressFromLisk32Address(validator.address),
				{
					count: validator.hashOnion.count,
					distance: validator.hashOnion.distance,
					hashes: validator.hashOnion.hashes.map(h => Buffer.from(h, 'hex')),
				},
			);
		}
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				randomModule.init({
					genesisConfig: {} as any,
					moduleConfig: {},
					generatorConfig: undefined as any,
				}),
			).toResolve();

			expect(randomModule['_maxLengthReveals']).toEqual(206);
		});

		it('should assign config values', async () => {
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: { maxLengthReveals: 20 },
			});

			expect(randomModule['_maxLengthReveals']).toEqual(20);
		});
	});

	describe('insertAssets', () => {
		const targetDelegate = genesisValidators.validators[0];

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
			],
		};

		const defaultUsedHashOnionUpdated: UsedHashOnionStoreObject = {
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

		const targetDelegateAddress = address.getAddressFromLisk32Address(targetDelegate.address);

		it('should assign seed reveal to block header asset', async () => {
			// Arrange
			const blockGenerateContext: InsertAssetContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				chainID: defaultChainID,
				getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2),
				getMethodContext: jest.fn() as any,
				getStore: jest.fn() as any,
				// getOffchainStore: jest.fn() as any,
				header: { height: 15, generatorAddress: targetDelegateAddress } as any,
			});

			await randomModule.offchainStores
				.get(UsedHashOnionsStore)
				.set(blockGenerateContext, targetDelegateAddress, defaultUsedHashOnion);

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = utils.hashOnion(
				Buffer.from(seed, 'hex'),
				targetDelegate.hashOnion.distance,
				1,
			);

			// Act
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.insertAssets(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.name,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);
			await expect(
				randomModule.offchainStores
					.get(UsedHashOnionsStore)
					.get(blockGenerateContext, targetDelegateAddress),
			).resolves.toEqual(defaultUsedHashOnionUpdated);
		});

		it('should update the used hash onion', async () => {
			// Arrange

			const blockGenerateContext: InsertAssetContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				chainID: defaultChainID,
				getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2),
				getMethodContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: targetDelegateAddress } as any,
			});

			await randomModule.offchainStores
				.get(UsedHashOnionsStore)
				.set(blockGenerateContext, targetDelegateAddress, defaultUsedHashOnion);

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = utils.hashOnion(
				Buffer.from(seed, 'hex'),
				targetDelegate.hashOnion.distance,
				1,
			);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisValidators.validators) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.insertAssets(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.name,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);
			await expect(
				randomModule.offchainStores
					.get(UsedHashOnionsStore)
					.get(blockGenerateContext, targetDelegateAddress),
			).resolves.toEqual(defaultUsedHashOnionUpdated);
		});

		it('should overwrite the used hash onion when forging the same height', async () => {
			// Arrange
			const usedHashOnionInput: UsedHashOnionStoreObject = {
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

			const blockGenerateContext: InsertAssetContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				chainID: defaultChainID,
				getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2),
				getMethodContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: targetDelegateAddress } as any,
			});
			await randomModule.offchainStores
				.get(UsedHashOnionsStore)
				.set(blockGenerateContext, targetDelegateAddress, usedHashOnionInput);

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = utils.hashOnion(
				Buffer.from(seed, 'hex'),
				targetDelegate.hashOnion.distance,
				1,
			);

			// Act
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.insertAssets(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.name,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);
			await expect(
				randomModule.offchainStores
					.get(UsedHashOnionsStore)
					.get(blockGenerateContext, targetDelegateAddress),
			).resolves.toEqual(defaultUsedHashOnionUpdated);
		});

		it('should remove all used hash onions before finality height', async () => {
			// Arrange
			const finalizedHeight = 10;
			const blockGenerateContext: InsertAssetContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2),
				chainID: defaultChainID,
				getMethodContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: targetDelegateAddress } as any,
				finalizedHeight,
			});

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = utils.hashOnion(
				Buffer.from(seed, 'hex'),
				targetDelegate.hashOnion.distance,
				1,
			);

			await randomModule.offchainStores
				.get(UsedHashOnionsStore)
				.set(blockGenerateContext, targetDelegateAddress, defaultUsedHashOnion);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisValidators.validators) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.insertAssets(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.name,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);

			await expect(
				randomModule.offchainStores
					.get(UsedHashOnionsStore)
					.get(blockGenerateContext, targetDelegateAddress),
			).resolves.toEqual({
				usedHashOnions: defaultUsedHashOnionUpdated.usedHashOnions.filter(
					u => u.height > finalizedHeight,
				),
			});
		});

		it('should use random seedReveal when all seedReveal are used', async () => {
			// Arrange
			const forgingValidators = convertDelegateFixture(genesisValidators.validators);
			const maxCount = (forgingValidators as any).find(
				(d: { address: string }) => d.address === targetDelegate.address,
			).hashOnion.count;

			const usedHashOnionInput: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: maxCount,
						height: 10,
					},
				],
			};

			const usedHashOnionOutput: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: maxCount,
						height: 10,
					},
					{
						count: 0,
						height: 15,
					},
				],
			};

			const loggerMock = {
				warn: jest.fn(),
			};

			const blockGenerateContext: InsertAssetContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: loggerMock as any,
				getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2),
				chainID: defaultChainID,
				getMethodContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: targetDelegateAddress } as any,
			});
			await randomModule.offchainStores
				.get(UsedHashOnionsStore)
				.set(blockGenerateContext, targetDelegateAddress, usedHashOnionInput);

			// Act
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.insertAssets(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			await expect(
				randomModule.offchainStores
					.get(UsedHashOnionsStore)
					.get(blockGenerateContext, targetDelegateAddress),
			).resolves.toEqual(usedHashOnionOutput);
			expect(blockGenerateContext.logger.warn).toHaveBeenCalledWith(
				'All of the hash onion has been used already. Please update to the new hash onion.',
			);
		});

		it('should use random seedReveal when there is no associated generator config', async () => {
			// Arrange
			const loggerMock = {
				warn: jest.fn(),
			};

			const blockGenerateContext: InsertAssetContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: loggerMock as any,
				getOffchainStore: (p1, p2) => offchainStore.getStore(p1, p2),
				chainID: defaultChainID,
				getMethodContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: {
					height: 15,
					generatorAddress: address.getAddressFromLisk32Address(targetDelegate.address),
				} as any,
			});

			// Act
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});

			const usedHashOnionStore = randomModule.offchainStores.get(UsedHashOnionsStore);
			await usedHashOnionStore.set(
				blockGenerateContext,
				Buffer.from(targetDelegate.address, 'hex'),
				{ usedHashOnions: [] },
			);

			await expect(randomModule.insertAssets(blockGenerateContext)).toResolve();

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
		});
	});

	describe('initGenesisState', () => {
		let stateStore: PrefixedStateReadWriter;
		beforeEach(async () => {
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as never,
				moduleConfig: {
					maxLengthReveals: 206,
				},
			});
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		});

		it('should store empty array to the random data store', async () => {
			const context = createGenesisBlockContext({
				stateStore,
			}).createInitGenesisStateContext();

			await randomModule.initGenesisState(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);

			await expect(randomDataStore.has(context, EMPTY_KEY)).resolves.toBeTrue();
			const res = await randomDataStore.get(context, EMPTY_KEY);
			expect(res.validatorReveals).toHaveLength(0);
		});
	});

	describe('verifyAssets', () => {
		beforeEach(async () => {
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as never,
				moduleConfig: {
					maxLengthReveals: 206,
				},
			});
		});

		it('should reject if asset does not exist', async () => {
			const context = createBlockContext({
				assets: new BlockAssets(),
			});

			await expect(
				randomModule.verifyAssets(context.getBlockVerifyExecuteContext()),
			).rejects.toThrow('Random module asset must exist.');
		});

		it('should reject if seed reveal length is not 16 bytes', async () => {
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: utils.getRandomBytes(10) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
			});

			try {
				await randomModule.verifyAssets(context.getBlockVerifyExecuteContext());
			} catch (error: any) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error?.message).toInclude(`Property '.seedReveal' minLength not satisfied`);
			}
		});

		it('should resolve if seed reveal length is 16 bytes', async () => {
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: utils.getRandomBytes(16) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
			});

			await expect(randomModule.verifyAssets(context.getBlockVerifyExecuteContext())).toResolve();
		});
	});

	describe('afterTransactionsExecute', () => {
		let stateStore: PrefixedStateReadWriter;
		const generator1 = utils.getRandomBytes(20);
		const seed1 = utils.getRandomBytes(16);
		const generator2 = utils.getRandomBytes(20);
		const seed2 = utils.getRandomBytes(16);
		const generator3 = utils.getRandomBytes(20);
		const seed3 = utils.getRandomBytes(16);
		const seedHash = (seed: Buffer, times: number) => {
			let res = seed;
			for (let i = 0; i < times; i += 1) {
				res = utils.hash(res).slice(0, 16);
			}
			return res;
		};

		beforeEach(async () => {
			await randomModule.init({
				generatorConfig: {},
				genesisConfig: {} as never,
				moduleConfig: {
					maxLengthReveals: 6,
				},
			});
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const validatorReveals = [
				{
					seedReveal: seedHash(seed1, 2),
					generatorAddress: generator1,
					height: 1,
					valid: false,
				},
				{
					seedReveal: seedHash(seed2, 2),
					generatorAddress: generator2,
					height: 2,
					valid: false,
				},
				{
					seedReveal: seedHash(seed3, 2),
					generatorAddress: generator3,
					height: 3,
					valid: false,
				},
				{
					seedReveal: seedHash(seed2, 1),
					generatorAddress: generator2,
					height: 4,
					valid: true,
				},
				{
					seedReveal: seedHash(seed2, 0),
					generatorAddress: generator2,
					height: 5,
					valid: true,
				},
			];
			await randomDataStore.set({ getStore: (p1, p2) => stateStore.getStore(p1, p2) }, EMPTY_KEY, {
				validatorReveals,
			});
		});

		it('should reject if asset does not exist', async () => {
			const context = createBlockContext({
				assets: new BlockAssets(),
			});

			await expect(
				randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext()),
			).rejects.toThrow('Random module asset must exist.');
		});

		it('should append the new seed reveal value', async () => {
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: seedHash(seed3, 1) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6 }),
				stateStore,
			}).getBlockAfterExecuteContext();

			await randomModule.afterTransactionsExecute(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
			expect(validatorReveals).toHaveLength(6);
		});

		it('should not exceed max length of seed reveal set in the config', async () => {
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: seedHash(seed3, 1) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6 }),
				stateStore,
			}).getBlockAfterExecuteContext();

			await randomModule.afterTransactionsExecute(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
			expect(validatorReveals).toHaveLength(6);

			const nextContext = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 7 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(nextContext.getBlockAfterExecuteContext());

			const updatedRandomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals: updatedValidatorReveals } = await updatedRandomDataStore.get(
				context,
				EMPTY_KEY,
			);
			expect(updatedValidatorReveals).toHaveLength(6);
			expect(updatedValidatorReveals[5].height).toEqual(7);
		});

		it('should set seed reveal validity to be true if validator provides valid seed reveal', async () => {
			const seedReveal = seedHash(seed3, 1);
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator3 }),
				stateStore,
			}).getBlockAfterExecuteContext();

			await randomModule.afterTransactionsExecute(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
			expect(validatorReveals).toHaveLength(6);
			expect(validatorReveals[5]).toEqual({
				height: 6,
				seedReveal,
				generatorAddress: generator3,
				valid: true,
			});
		});

		it('should set seed reveal validity to be true when previous seed will be deleted at this execution', async () => {
			const seedReveal = seedHash(seed1, 1);
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator1 }),
				stateStore,
			}).getBlockAfterExecuteContext();

			await randomModule.afterTransactionsExecute(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
			expect(validatorReveals).toHaveLength(6);
			expect(validatorReveals[5]).toEqual({
				height: 6,
				seedReveal,
				generatorAddress: generator1,
				valid: true,
			});
		});

		it('should set seed reveal validity to be false if validator provides invalid seed reveal', async () => {
			const seedReveal = seedHash(utils.getRandomBytes(20), 1);
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator3 }),
				stateStore,
			}).getBlockAfterExecuteContext();

			await randomModule.afterTransactionsExecute(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
			expect(validatorReveals).toHaveLength(6);
			expect(validatorReveals[5]).toEqual({
				height: 6,
				seedReveal,
				generatorAddress: generator3,
				valid: false,
			});
		});

		it('should set seed reveal validity to be false if there is no data for the past seed reveal', async () => {
			const seedReveal = seedHash(utils.getRandomBytes(20), 1);
			const asset = {
				module: randomModule.name,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const generator = utils.getRandomBytes(20);
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator }),
				stateStore,
			}).getBlockAfterExecuteContext();

			await randomModule.afterTransactionsExecute(context);

			const randomDataStore = randomModule.stores.get(ValidatorRevealsStore);
			const { validatorReveals } = await randomDataStore.get(context, EMPTY_KEY);
			expect(validatorReveals).toHaveLength(6);
			expect(validatorReveals[5]).toEqual({
				height: 6,
				seedReveal,
				generatorAddress: generator,
				valid: false,
			});
		});
	});
});
