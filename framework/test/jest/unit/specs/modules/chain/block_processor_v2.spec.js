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

const {
	BlockProcessorV2,
} = require('../../../../../../src/modules/chain/block_processor_v2');
const { StateStore } = require('../../../../../../src/modules/chain/blocks');

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

	let blockProcessor;
	let blocksModuleStub;
	let bftModuleStub;
	let dposModuleStub;
	let storageStub;
	let loggerStub;

	beforeEach(async () => {
		blocksModuleStub = {
			blockReward: {
				calculateReward: jest.fn().mockReturnValue(5),
			},
		};
		bftModuleStub = {
			init: jest.fn(),
			maxHeightPrevoted: 0,
			isBFTProtocolCompliant: jest.fn().mockReturnValue(true),
		};

		dposModuleStub = {
			getMinActiveHeightsOfDelegates: jest.fn(),
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
			blocksModule: blocksModuleStub,
			bftModule: bftModuleStub,
			dposModule: dposModuleStub,
			storage: storageStub,
			logger: loggerStub,
			constants: defaultConstants,
			exceptions: defaultExceptions,
		});
	});

	describe('init', () => {
		it('should get activeSince from dpos for 2 rounds', async () => {
			// Arrange & Act
			const stateStore = new StateStore(storageStub);
			await blockProcessor.init.run({ stateStore });
			// Assert
			expect(
				dposModuleStub.getMinActiveHeightsOfDelegates,
			).toHaveBeenCalledWith(2);
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
				'maxHeightPreviouslyForged',
			);
			expect(block.maxHeightPreviouslyForged).toBe(0);
		});

		it('should save maxPreviouslyForgedHeight as the block height created', async () => {
			const previouslyForgedHeight = 100;
			// Arrange
			const maxHeightResult = JSON.stringify({
				[defaultKeyPair.publicKey.toString('hex')]: 100,
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
				'maxHeightPreviouslyForged',
			);
			expect(block.maxHeightPreviouslyForged).toBe(previouslyForgedHeight);
		});

		it('should set maxPreviouslyForgedHeight to previously forged height', async () => {
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
				[defaultKeyPair.publicKey.toString('hex')]: 11,
			});
			expect(storageStub.entities.ForgerInfo.setKey).toHaveBeenCalledWith(
				'maxHeightPreviouslyForged',
				maxHeightResult,
			);
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
