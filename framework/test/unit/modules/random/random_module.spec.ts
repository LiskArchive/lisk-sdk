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

import {
	getAddressFromPublicKey,
	getRandomBytes,
	hash,
	hashOnion,
} from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { BlockAssets, StateStore } from '@liskhq/lisk-chain';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';
import { RandomModule } from '../../../../src/modules/random';
import { UsedHashOnionStoreObject, ValidatorReveals } from '../../../../src/modules/random/types';
import {
	EMPTY_KEY,
	STORE_PREFIX_RANDOM,
	STORE_PREFIX_USED_HASH_ONION,
} from '../../../../src/modules/random/constants';
import {
	blockHeaderAssetRandomModule,
	seedRevealSchema,
	usedHashOnionsStoreSchema,
} from '../../../../src/modules/random/schemas';
import { BlockGenerateContext } from '../../../../src/node/generator';
import { defaultNetworkIdentifier } from '../../../fixtures';
import { GenesisConfig, testing } from '../../../../src';
import {
	createBlockContext,
	createBlockHeaderWithDefaults,
	createGenesisBlockContext,
} from '../../../../src/testing';

const convertDelegateFixture = (delegates: typeof genesisDelegates.delegates) =>
	delegates.map(delegate => ({
		address: delegate.address,
		hashOnion: delegate.hashOnion,
	}));

describe('RandomModule', () => {
	let randomModule: RandomModule;

	const assetStub = {
		getAsset: jest.fn(),
		setAsset: jest.fn(),
	};

	beforeEach(() => {
		randomModule = new RandomModule();
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
			const generatorConfig = { hashOnions: convertDelegateFixture(genesisDelegates.delegates) };

			await randomModule.init({
				generatorConfig,
				genesisConfig: {} as GenesisConfig,
				moduleConfig: { maxLengthReveals: 20 },
			});

			expect(randomModule['_generatorConfig']).toHaveLength(generatorConfig.hashOnions.length);
			expect(randomModule['_maxLengthReveals']).toEqual(20);
		});
	});

	describe('initBlock', () => {
		const targetDelegate = genesisDelegates.delegates[0];

		const defaultUsedHashOnion: UsedHashOnionStoreObject = {
			usedHashOnions: [
				{
					count: 5,
					height: 9,
					address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
				},
				{
					count: 6,
					height: 12,
					address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
				},
			],
		};

		const defaultUsedHashOnionUpdated: UsedHashOnionStoreObject = {
			usedHashOnions: [
				{
					address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
					count: 5,
					height: 9,
				},
				{
					address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
					count: 6,
					height: 12,
				},
				{
					address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
					count: 7,
					height: 15,
				},
			],
		};

		it('should assign seed reveal to block header asset', async () => {
			// Arrange
			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
			});

			await blockGenerateContext
				.getGeneratorStore(randomModule.id)
				.set(
					STORE_PREFIX_USED_HASH_ONION,
					codec.encode(usedHashOnionsStoreSchema, defaultUsedHashOnion),
				);

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = hashOnion(Buffer.from(seed, 'hex'), targetDelegate.hashOnion.distance, 1);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisDelegates.delegates) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.initBlock(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.id,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);
			await expect(
				blockGenerateContext.getGeneratorStore(randomModule.id).get(STORE_PREFIX_USED_HASH_ONION),
			).resolves.toEqual(codec.encode(usedHashOnionsStoreSchema, defaultUsedHashOnionUpdated));
		});

		it('should update the used hash onion', async () => {
			// Arrange

			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
			});
			await blockGenerateContext
				.getGeneratorStore(randomModule.id)
				.set(
					STORE_PREFIX_USED_HASH_ONION,
					codec.encode(usedHashOnionsStoreSchema, defaultUsedHashOnion),
				);

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = hashOnion(Buffer.from(seed, 'hex'), targetDelegate.hashOnion.distance, 1);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisDelegates.delegates) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.initBlock(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.id,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);
			await expect(
				blockGenerateContext.getGeneratorStore(randomModule.id).get(STORE_PREFIX_USED_HASH_ONION),
			).resolves.toEqual(codec.encode(usedHashOnionsStoreSchema, defaultUsedHashOnionUpdated));
		});

		it('should overwrite the used hash onion when forging the same height', async () => {
			// Arrange
			const usedHashOnionInput: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
						address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
					},
					{
						count: 6,
						height: 12,
						address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
					},
					{
						address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
						count: 7,
						height: 15,
					},
				],
			};

			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
			});
			await blockGenerateContext
				.getGeneratorStore(randomModule.id)
				.set(
					STORE_PREFIX_USED_HASH_ONION,
					codec.encode(usedHashOnionsStoreSchema, usedHashOnionInput),
				);

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = hashOnion(Buffer.from(seed, 'hex'), targetDelegate.hashOnion.distance, 1);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisDelegates.delegates) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.initBlock(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.id,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);
			await expect(
				blockGenerateContext.getGeneratorStore(randomModule.id).get(STORE_PREFIX_USED_HASH_ONION),
			).resolves.toEqual(codec.encode(usedHashOnionsStoreSchema, defaultUsedHashOnionUpdated));
		});

		it('should remove all used hash onions before finality height', async () => {
			// Arrange
			const finalizedHeight = 10;
			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
				finalizedHeight,
			});

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = hashOnion(Buffer.from(seed, 'hex'), targetDelegate.hashOnion.distance, 1);

			await blockGenerateContext
				.getGeneratorStore(randomModule.id)
				.set(
					STORE_PREFIX_USED_HASH_ONION,
					codec.encode(usedHashOnionsStoreSchema, defaultUsedHashOnion),
				);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisDelegates.delegates) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.initBlock(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			expect(assetStub.setAsset).toHaveBeenCalledWith(
				randomModule.id,
				codec.encode(blockHeaderAssetRandomModule, { seedReveal: hashes[7] }),
			);

			await expect(
				blockGenerateContext.getGeneratorStore(randomModule.id).get(STORE_PREFIX_USED_HASH_ONION),
			).resolves.toEqual(
				codec.encode(usedHashOnionsStoreSchema, {
					usedHashOnions: defaultUsedHashOnionUpdated.usedHashOnions.filter(
						u => u.height > finalizedHeight,
					),
				}),
			);
		});

		it('should use random seedReveal when all seedReveal are used', async () => {
			// Arrange
			const forgingDelegates = convertDelegateFixture(genesisDelegates.delegates);
			const maxCount = (forgingDelegates as any).find(
				(d: { address: Buffer }) => d.address.toString('hex') === targetDelegate.address,
			).hashOnion.count;

			const usedHashOnionInput: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: maxCount,
						height: 10,
						address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
					},
				],
			};

			const usedHashOnionOutput: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
						count: maxCount,
						height: 10,
					},
					{
						address: getAddressFromPublicKey(Buffer.from(targetDelegate.publicKey, 'hex')),
						count: 0,
						height: 15,
					},
				],
			};

			const loggerMock = {
				warn: jest.fn(),
			};

			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: loggerMock as any,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
			});
			await blockGenerateContext
				.getGeneratorStore(randomModule.id)
				.set(
					STORE_PREFIX_USED_HASH_ONION,
					codec.encode(usedHashOnionsStoreSchema, usedHashOnionInput),
				);

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: convertDelegateFixture(genesisDelegates.delegates) },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await randomModule.initBlock(blockGenerateContext);

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
			await expect(
				blockGenerateContext.getGeneratorStore(randomModule.id).get(STORE_PREFIX_USED_HASH_ONION),
			).resolves.toEqual(codec.encode(usedHashOnionsStoreSchema, usedHashOnionOutput));
			expect(blockGenerateContext.logger.warn).toHaveBeenCalledWith(
				'All of the hash onion has been used already. Please update to the new hash onion.',
			);
		});

		it('should use random seedReveal when there is no associated generator config', async () => {
			// Arrange
			const loggerMock = {
				warn: jest.fn(),
			};

			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: loggerMock as any,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
			});

			// Act
			await randomModule.init({
				generatorConfig: { hashOnions: [] },
				genesisConfig: {} as GenesisConfig,
				moduleConfig: {},
			});
			await expect(randomModule.initBlock(blockGenerateContext)).toResolve();

			// Assert
			expect(assetStub.setAsset).toHaveBeenCalledTimes(1);
		});
	});

	describe('initGenesisState', () => {
		let stateStore: StateStore;
		beforeEach(async () => {
			await randomModule.init({
				generatorConfig: undefined as never,
				genesisConfig: {} as never,
				moduleConfig: {
					maxLengthReveals: 206,
				},
			});
			stateStore = new StateStore(new InMemoryKVStore());
		});

		it('should store empty array to the random data store', async () => {
			const context = createGenesisBlockContext({
				stateStore,
			});

			await randomModule.initGenesisState(context.createInitGenesisStateContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);

			await expect(randomDataStore.has(EMPTY_KEY)).resolves.toBeTrue();
			const res = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
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
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: getRandomBytes(10) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
			});

			await expect(
				randomModule.verifyAssets(context.getBlockVerifyExecuteContext()),
			).rejects.toThrow('Size of the seed reveal must be 16, but received 10.');
		});

		it('should resolve if seed reveal length is 16 bytes', async () => {
			const asset = {
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: getRandomBytes(16) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
			});

			await expect(randomModule.verifyAssets(context.getBlockVerifyExecuteContext())).toResolve();
		});
	});

	describe('afterTransactionsExecute', () => {
		let stateStore: StateStore;
		const generator1 = getRandomBytes(20);
		const seed1 = getRandomBytes(16);
		const generator2 = getRandomBytes(20);
		const seed2 = getRandomBytes(16);
		const generator3 = getRandomBytes(20);
		const seed3 = getRandomBytes(16);
		const seedHash = (seed: Buffer, times: number) => {
			let res = seed;
			for (let i = 0; i < times; i += 1) {
				res = hash(res).slice(0, 16);
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
			stateStore = new StateStore(new InMemoryKVStore());
			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
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
			await randomDataStore.setWithSchema(EMPTY_KEY, { validatorReveals }, seedRevealSchema);
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
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: seedHash(seed3, 1) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
			expect(validatorReveals).toHaveLength(6);
		});

		it('should not exceed max length of seed reveal set in the config', async () => {
			const asset = {
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal: seedHash(seed3, 1) }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
			expect(validatorReveals).toHaveLength(6);

			const nextContext = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 7 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(nextContext.getBlockAfterExecuteContext());

			const updatedRandomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const {
				validatorReveals: updatedValidatorReveals,
			} = await updatedRandomDataStore.getWithSchema<ValidatorReveals>(EMPTY_KEY, seedRevealSchema);
			expect(updatedValidatorReveals).toHaveLength(6);
			expect(updatedValidatorReveals[5].height).toEqual(7);
		});

		it('should set seed reveal validity to be true if validator provides valid seed reveal', async () => {
			const seedReveal = seedHash(seed3, 1);
			const asset = {
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator3 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
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
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator1 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
			expect(validatorReveals).toHaveLength(6);
			expect(validatorReveals[5]).toEqual({
				height: 6,
				seedReveal,
				generatorAddress: generator1,
				valid: true,
			});
		});

		it('should set seed reveal validity to be false if validator provides invalid seed reveal', async () => {
			const seedReveal = seedHash(getRandomBytes(20), 1);
			const asset = {
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator3 }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
			expect(validatorReveals).toHaveLength(6);
			expect(validatorReveals[5]).toEqual({
				height: 6,
				seedReveal,
				generatorAddress: generator3,
				valid: false,
			});
		});

		it('should set seed reveal validity to be false if there is no data for the past seed reveal', async () => {
			const seedReveal = seedHash(getRandomBytes(20), 1);
			const asset = {
				moduleID: randomModule.id,
				data: codec.encode(blockHeaderAssetRandomModule, { seedReveal }),
			};
			const generator = getRandomBytes(20);
			const context = createBlockContext({
				assets: new BlockAssets([asset]),
				header: createBlockHeaderWithDefaults({ height: 6, generatorAddress: generator }),
				stateStore,
			});

			await randomModule.afterTransactionsExecute(context.getBlockAfterExecuteContext());

			const randomDataStore = stateStore.getStore(randomModule.id, STORE_PREFIX_RANDOM);
			const { validatorReveals } = await randomDataStore.getWithSchema<ValidatorReveals>(
				EMPTY_KEY,
				seedRevealSchema,
			);
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
