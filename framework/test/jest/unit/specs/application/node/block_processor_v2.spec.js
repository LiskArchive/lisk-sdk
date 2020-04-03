/*
 * Copyright © 2019 Lisk Foundation
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

'use strict';

const { StateStore } = require('@liskhq/lisk-chain');
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const {
	BlockProcessorV2,
	getBytes,
} = require('../../../../../../src/application/node/block_processor_v2');

describe('block processor v2', () => {
	const defaultKeyPair = {
		privateKey: Buffer.from(
			'a8e169d600922cc214030a287948828d80b31776139cea9c209968374695aa9ac326f1068baa038b97f28f6cfe6b37e6c7041c3ea035c79c5923cd62f2b1f167',
			'hex',
		),
		publicKey: Buffer.from(
			'c326f1068baa038b97f28f6cfe6b37e6c7041c3ea035c79c5923cd62f2b1f167',
			'hex',
		),
	};
	const defaultAddress = getAddressFromPublicKey(
		defaultKeyPair.publicKey.toString('hex'),
	);
	const defaultAdditionalData = {
		lastBlockHeaders: [],
		networkIdentifier:
			'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e',
	};

	let blockProcessor;
	let chainModuleStub;
	let bftModuleStub;
	let dposModuleStub;
	let storageStub;
	let loggerStub;

	beforeEach(async () => {
		chainModuleStub = {
			newStateStore: jest.fn().mockResolvedValue({}),
			undo: jest.fn(),
			blockReward: {
				calculateReward: jest.fn().mockReturnValue(5),
			},
			lastBlock: {
				height: 102,
			},
		};
		bftModuleStub = {
			init: jest.fn(),
			deleteBlocks: jest.fn(),
			maxHeightPrevoted: 0,
			isBFTProtocolCompliant: jest.fn().mockReturnValue(true),
		};

		dposModuleStub = {
			undo: jest.fn(),
			isDPoSProtocolCompliant: jest.fn().mockReturnValue(true),
		};
		storageStub = {
			entities: {
				ForgerInfo: {
					getKey: jest.fn(),
					setKey: jest.fn(),
				},
			},
		};
		loggerStub = {};

		const defaultConstants = {};

		blockProcessor = new BlockProcessorV2({
			networkIdentifier: defaultAdditionalData.networkIdentifier,
			chainModule: chainModuleStub,
			bftModule: bftModuleStub,
			dposModule: dposModuleStub,
			storage: storageStub,
			logger: loggerStub,
			constants: defaultConstants,
		});
	});

	describe('init', () => {
		it('should initialize BFT module', async () => {
			// Arrange & Act
			const stateStore = new StateStore(storageStub, defaultAdditionalData);
			await blockProcessor.init.run({ stateStore });
			// Assert
			expect(bftModuleStub.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('undo', () => {
		it('should reject the promise when dpos undo fails', async () => {
			const stateStore = new StateStore(storageStub, defaultAdditionalData);
			dposModuleStub.undo.mockRejectedValue(new Error('Invalid error'));
			await expect(
				blockProcessor.undo.run({ block: { height: 1 }, stateStore }),
			).rejects.toThrow('Invalid error');
		});

		it('should reject the promise when bft deleteBlocks fails', async () => {
			const stateStore = new StateStore(storageStub, defaultAdditionalData);
			bftModuleStub.deleteBlocks.mockRejectedValue(new Error('Invalid error'));
			await expect(
				blockProcessor.undo.run({ block: { height: 1 }, stateStore }),
			).rejects.toThrow('Invalid error');
		});
	});

	describe('create', () => {
		let block;

		it('should set maxPreviouslyForgedHeight to zero when the delegate did not forge before', async () => {
			// Arrange
			const maxHeightResult = JSON.stringify({});
			storageStub.entities.ForgerInfo.getKey.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					seedReveal: '00000000000000000000000000000000',
					timestamp: 10,
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			// Assert
			expect(storageStub.entities.ForgerInfo.getKey).toHaveBeenCalledWith(
				'forger:previouslyForged',
			);
			// previousBlock.height + 1
			expect(block.maxHeightPreviouslyForged).toBe(0);
		});

		it('should save maxPreviouslyForgedHeight as the block height created', async () => {
			const previouslyForgedHeight = 100;
			// Arrange
			const maxHeightResult = JSON.stringify({
				[defaultAddress]: { height: 100 },
			});
			storageStub.entities.ForgerInfo.getKey.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			// Assert
			expect(storageStub.entities.ForgerInfo.getKey).toHaveBeenCalledWith(
				'forger:previouslyForged',
			);
			expect(block.maxHeightPreviouslyForged).toBe(previouslyForgedHeight);
		});

		it('should update maxPreviouslyForgedHeight to the next higher one but not change for other delegates', async () => {
			// Arrange
			const list = {
				[defaultAddress]: { height: 5 },
				a: { height: 4 },
				b: { height: 6 },
				c: { height: 7 },
				x: { height: 8 },
			};
			storageStub.entities.ForgerInfo.getKey.mockResolvedValue(
				JSON.stringify(list),
			);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			const maxHeightResult = JSON.stringify({
				...list,
				[defaultAddress]: {
					height: 11,
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 5,
				},
			});
			expect(storageStub.entities.ForgerInfo.setKey).toHaveBeenCalledWith(
				'forger:previouslyForged',
				maxHeightResult,
			);
		});

		it('should set maxPreviouslyForgedHeight to forging height', async () => {
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			const maxHeightResult = JSON.stringify({
				[defaultAddress]: {
					height: 11,
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
			});
			expect(storageStub.entities.ForgerInfo.setKey).toHaveBeenCalledWith(
				'forger:previouslyForged',
				maxHeightResult,
			);
		});

		it('should not set maxPreviouslyForgedHeight to next height if lower', async () => {
			// Arrange
			storageStub.entities.ForgerInfo.getKey.mockResolvedValue(
				JSON.stringify({
					[defaultAddress]: { height: 15 },
				}),
			);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			expect(storageStub.entities.ForgerInfo.setKey).not.toHaveBeenCalled();
		});

		it('should include seed reveal as specified in the block', async () => {
			// Arange
			const seedReveal = 'c04ecc8875400b2f51110f76cbb3dc28';
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal,
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			expect(block.height).toBe(11);
			expect(block.seedReveal).toBe(seedReveal);
		});

		it('should return a block', async () => {
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					},
				},
			});
			expect(block.height).toBe(11);
			expect(block.generatorPublicKey).toBe(
				defaultKeyPair.publicKey.toString('hex'),
			);
			expect(block.maxHeightPrevoted).toBe(0);
		});
	});

	describe('getBytes', () => {
		const defaultSeedReveal = 'c04ecc8875400b2f51110f76cbb3dc28';
		const block = {
			version: 2,
			totalAmount: BigInt(0),
			totalFee: BigInt(0),
			seedReveal: defaultSeedReveal,
			reward: 5,
			payloadHash:
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			timestamp: 10,
			numberOfTransactions: 0,
			payloadLength: 0,
			previousBlockId: undefined,
			generatorPublicKey:
				'c326f1068baa038b97f28f6cfe6b37e6c7041c3ea035c79c5923cd62f2b1f167',
			transactions: [],
			height: 11,
			maxHeightPreviouslyForged: 0,
			maxHeightPrevoted: 0,
			blockSignature:
				'768a0a5709861b4ea7ff502d5049219a3ebb0a79554abac17eaabb4fe0acf19e80e4799c1a718baccd95e8062026631c181077c70f768d6ec2ef08dde45fe90e',
		};

		it('should include seedReveal after previousBlockId', async () => {
			const bytes = getBytes(block);
			// version(4), timestamp(4), previousBlockID(8)
			const seedRevealBytes = bytes.slice(16, 16 + 16);
			expect(seedRevealBytes.toString('hex')).toEqual(defaultSeedReveal);
		});
	});
});
