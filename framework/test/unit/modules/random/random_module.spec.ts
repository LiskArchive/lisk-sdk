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

import { getAddressFromPublicKey, hashOnion } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';
import { RandomModule } from '../../../../src/modules/random';
import { UsedHashOnionStoreObject } from '../../../../src/modules/random/types';
import { STORE_PREFIX_USED_HASH_ONION } from '../../../../src/modules/random/constants';
import {
	blockHeaderAssetRandomModule,
	usedHashOnionsStoreSchema,
} from '../../../../src/modules/random/schemas';
import { BlockGenerateContext } from '../../../../src/node/generator';
import { defaultNetworkIdentifier } from '../../../fixtures';
import { GenesisConfig, testing } from '../../../../src';

const convertDelegateFixture = (delegates: typeof genesisDelegates.delegates) =>
	delegates.map(delegate => ({
		encryptedPassphrase: delegate.encryptedPassphrase,
		address: Buffer.from(delegate.address, 'hex'),
		hashOnion: {
			...delegate.hashOnion,
			hashes: delegate.hashOnion.hashes.map(h => Buffer.from(h, 'hex')),
		},
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
		it('should assign config values', async () => {
			const generatorConfig = { delegates: convertDelegateFixture(genesisDelegates.delegates) };
			const maxLengthReveals = 10;

			await randomModule.init({
				generatorConfig,
				genesisConfig: {} as GenesisConfig,
				moduleConfig: { maxLengthReveals },
			});

			expect(randomModule['_generatorConfig']).toEqual(generatorConfig);
			expect(randomModule['_maxLengthReveals']).toEqual(maxLengthReveals);
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
			const forgingDelegates = convertDelegateFixture(genesisDelegates.delegates);

			// Act
			await randomModule.init({
				generatorConfig: { delegates: forgingDelegates },
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
			const forgingDelegates = convertDelegateFixture(genesisDelegates.delegates);

			// Act
			await randomModule.init({
				generatorConfig: { delegates: forgingDelegates },
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
			const forgingDelegates = convertDelegateFixture(genesisDelegates.delegates);

			// Act
			await randomModule.init({
				generatorConfig: { delegates: forgingDelegates },
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

		// TODO: Update and enable it after issue https://github.com/LiskHQ/lisk-sdk/issues/6836
		it.skip('should remove all used hash onions before finality height', async () => {
			// Arrange
			const blockGenerateContext: BlockGenerateContext = testing.createBlockGenerateContext({
				assets: assetStub,
				logger: testing.mocks.loggerMock,
				networkIdentifier: defaultNetworkIdentifier,
				getAPIContext: jest.fn() as any,
				getStore: jest.fn() as any,
				header: { height: 15, generatorAddress: Buffer.from(targetDelegate.address, 'hex') } as any,
			});

			const seed = targetDelegate.hashOnion.hashes[1];
			const hashes = hashOnion(Buffer.from(seed, 'hex'), targetDelegate.hashOnion.distance, 1);
			const forgingDelegates = convertDelegateFixture(genesisDelegates.delegates);

			// Act
			await randomModule.init({
				generatorConfig: { delegates: forgingDelegates },
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
				generatorConfig: { delegates: forgingDelegates },
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
	});
});
