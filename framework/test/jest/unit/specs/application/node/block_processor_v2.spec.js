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
const {
	BlockProcessorV2,
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
	const defaultAdditionalData = {
		lastBlockHeaders: [],
		networkIdentifier: 'network-identifier',
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
		const defaultExceptions = {};

		blockProcessor = new BlockProcessorV2({
			chainModule: chainModuleStub,
			bftModule: bftModuleStub,
			dposModule: dposModuleStub,
			storage: storageStub,
			logger: loggerStub,
			constants: defaultConstants,
			exceptions: defaultExceptions,
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
				keypair: defaultKeyPair,
				timestamp: 10,
				transactions: [],
				previousBlock: {
					height: 10,
				},
			});
			// Assert
			expect(storageStub.entities.ForgerInfo.getKey).toHaveBeenCalledWith(
				'previouslyForged',
			);
			// previousBlock.height + 1
			expect(block.maxHeightPreviouslyForged).toBe(0);
		});

		it('should save maxPreviouslyForgedHeight as the block height created', async () => {
			const previouslyForgedHeight = 100;
			// Arrange
			const maxHeightResult = JSON.stringify({
				[defaultKeyPair.publicKey.toString('hex')]: { height: 100 },
			});
			storageStub.entities.ForgerInfo.getKey.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				keypair: defaultKeyPair,
				timestamp: 10,
				transactions: [],
				previousBlock: {
					height: 10,
				},
			});
			// Assert
			expect(storageStub.entities.ForgerInfo.getKey).toHaveBeenCalledWith(
				'previouslyForged',
			);
			expect(block.maxHeightPreviouslyForged).toBe(previouslyForgedHeight);
		});

		it('should update maxPreviouslyForgedHeight to the next higher one but not change for other delegates', async () => {
			// Arrange
			const list = {
				[defaultKeyPair.publicKey.toString('hex')]: { height: 5 },
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
				keypair: defaultKeyPair,
				timestamp: 10,
				transactions: [],
				previousBlock: {
					height: 10,
				},
			});
			const maxHeightResult = JSON.stringify({
				...list,
				[defaultKeyPair.publicKey.toString('hex')]: {
					height: 11,
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 5,
				},
			});
			expect(storageStub.entities.ForgerInfo.setKey).toHaveBeenCalledWith(
				'previouslyForged',
				maxHeightResult,
			);
		});

		it('should set maxPreviouslyForgedHeight to forging height', async () => {
			// Act
			block = await blockProcessor.create.run({
				keypair: defaultKeyPair,
				timestamp: 10,
				transactions: [],
				previousBlock: {
					height: 10,
				},
			});
			const maxHeightResult = JSON.stringify({
				[defaultKeyPair.publicKey.toString('hex')]: {
					height: 11,
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
			});
			expect(storageStub.entities.ForgerInfo.setKey).toHaveBeenCalledWith(
				'previouslyForged',
				maxHeightResult,
			);
		});

		it('should not set maxPreviouslyForgedHeight to next height if lower', async () => {
			// Arrange
			storageStub.entities.ForgerInfo.getKey.mockResolvedValue(
				JSON.stringify({
					[defaultKeyPair.publicKey.toString('hex')]: { height: 15 },
				}),
			);
			// Act
			block = await blockProcessor.create.run({
				keypair: defaultKeyPair,
				timestamp: 10,
				transactions: [],
				previousBlock: {
					height: 10,
				},
			});
			expect(storageStub.entities.ForgerInfo.setKey).not.toHaveBeenCalled();
		});

		it('should return a block', async () => {
			// Act
			block = await blockProcessor.create.run({
				keypair: defaultKeyPair,
				timestamp: 10,
				transactions: [],
				previousBlock: {
					height: 10,
				},
			});
			expect(block.height).toBe(11);
			expect(block.generatorPublicKey).toBe(
				defaultKeyPair.publicKey.toString('hex'),
			);
			expect(block.maxHeightPrevoted).toBe(0);
		});
	});
});
