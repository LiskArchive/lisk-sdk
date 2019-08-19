/*
 * Copyright © 2018 Lisk Foundation
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
	Block: blockFixture,
} = require('../../../../../../mocha/fixtures/blocks');

const {
	FinalityManager,
} = require('../../../../../../../src/modules/chain/bft/finality_manager');

const {
	BFT,
	extractBFTBlockHeaderFromBlock,
} = require('../../../../../../../src/modules/chain/bft/bft');

describe('bft', () => {
	beforeEach(async () => {
		jest.resetAllMocks();
		jest.clearAllMocks();
	});

	describe('extractBFTBlockHeaderFromBlock', () => {
		it('should extract particular headers for bft', async () => {
			const block = blockFixture();

			const {
				id: blockId,
				height,
				maxHeightPreviouslyForged,
				prevotedConfirmedUptoHeight,
				generatorPublicKey: delegatePublicKey,
			} = block;
			const activeSinceRound = 0;

			const blockHeader = {
				blockId,
				height,
				maxHeightPreviouslyForged,
				prevotedConfirmedUptoHeight,
				delegatePublicKey,
				activeSinceRound,
			};

			expect(extractBFTBlockHeaderFromBlock(block)).toEqual(blockHeader);
		});
	});

	describe('BFT', () => {
		const storageMock = {
			entities: {
				Block: {
					get: jest.fn(),
				},
				ChainMeta: {
					getKey: jest.fn(),
				},
			},
		};
		const loggerMock = {};
		const activeDelegates = 101;
		const startingHeight = 0;
		const bftParams = {
			storage: storageMock,
			logger: loggerMock,
			activeDelegates,
			startingHeight,
		};

		describe('constructor()', () => {
			it('should create instance of BFT', async () => {
				expect(new BFT(bftParams)).toBeInstanceOf(BFT);
			});

			it('should assign all parameters correctly', async () => {
				const bft = new BFT(bftParams);

				expect(bft.finalityManager).toBeNull();
				expect(bft.storage).toBe(storageMock);
				expect(bft.logger).toBe(loggerMock);
				expect(bft.constants).toEqual({ activeDelegates, startingHeight });
				expect(bft.BlockEntity).toBe(storageMock.entities.Block);
				expect(bft.ChainMetaEntity).toBe(storageMock.entities.ChainMeta);
			});
		});

		describe('bootstrap()', () => {
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);

				jest
					.spyOn(bft, '_initFinalityManager')
					.mockImplementation(() => ({ on: jest.fn() }));

				jest
					.spyOn(bft, '_getLastBlockHeight')
					.mockImplementation(() => jest.fn());

				jest
					.spyOn(bft, 'loadBlocksFromStorage')
					.mockImplementation(() => jest.fn());
			});

			it('should invoke _initFinalityManager()', async () => {
				await bft.bootstrap();

				expect(bft._initFinalityManager).toHaveBeenCalledTimes(1);
			});

			it('should invoke _getLastBlockHeight()', async () => {
				await bft.bootstrap();

				expect(bft._getLastBlockHeight).toHaveBeenCalledTimes(1);
			});

			it('should invoke loadBlocksFromStorage() for finalizedHeight if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 500;
				const lastBlockHeight = 600;

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.bootstrap();

				expect(bft.loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft.loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: finalizedHeight,
					tillHeight: lastBlockHeight,
				});
			});

			it('should invoke loadBlocksFromStorage() for lastBlockHeight - TWO_ROUNDS if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.bootstrap();

				expect(bft.loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft.loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: lastBlockHeight - activeDelegates * 2,
					tillHeight: lastBlockHeight,
				});
			});

			it('should invoke loadBlocksFromStorage() for staringHeight if its highest', async () => {
				bft.constants.startingHeight = 550;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.bootstrap();

				expect(bft.loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft.loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: bft.constants.startingHeight,
					tillHeight: lastBlockHeight,
				});
			});
		});

		describe('loadBlocksFromStorage()', () => {
			const fromHeight = 0;
			const tillHeight = 10;
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.bootstrap();
			});

			it('should call fetch blocks from storage particular parameters', async () => {
				storageMock.entities.Block.get.mockReset();
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft.loadBlocksFromStorage({ fromHeight, tillHeight });

				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
					{ height_gte: fromHeight, height_lte: tillHeight },
					{
						limit: null,
						sort: 'height:asc',
					},
				);
			});

			// As BFT applies only to block version 2
			it('should skip loading blocks with version !== 2', async () => {
				// Arrange
				const blockWithVersion1 = blockFixture({ version: '1' });
				const blockWithVersion2 = blockFixture({ version: '2' });
				storageMock.entities.Block.get.mockReturnValue([
					blockWithVersion1,
					blockWithVersion2,
				]);

				// Act
				await bft.loadBlocksFromStorage({ fromHeight, tillHeight });

				// Assert
				expect(bft.finalityManager.headers.length).toEqual(1);
				expect(bft.finalityManager.headers.items).toEqual([
					extractBFTBlockHeaderFromBlock(blockWithVersion2),
				]);
			});

			it('should load block headers to finalityManager', async () => {
				// Arrange
				const block = blockFixture({ version: '2', height: 8 });
				const blockHeader = extractBFTBlockHeaderFromBlock(block);
				storageMock.entities.Block.get.mockReturnValue([block]);

				// Act
				await bft.loadBlocksFromStorage({ fromHeight, tillHeight });

				// Assert
				expect(bft.finalityManager.headers.items.length).toEqual(1);
				expect(bft.finalityManager.headers.items).toEqual([blockHeader]);
			});
		});

		// TODO: Remove tests for private methods
		describe('_initFinalityManager()', () => {
			it('should call ChainMetaEntity.getKey to get stored finalized height', async () => {
				const bft = new BFT(bftParams);
				const result = await bft._initFinalityManager();

				expect(storageMock.entities.ChainMeta.getKey).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.ChainMeta.getKey).toHaveBeenCalledWith(
					'BFT.finalizedHeight',
				);
				expect(result).toBeInstanceOf(FinalityManager);
			});

			it('should initialize finalityManager with stored FINALIZED_HEIGHT if its highest', async () => {
				// Arrange
				const finalizedHeight = 500;
				const startingHeightLower = 300;
				storageMock.entities.ChainMeta.getKey.mockReturnValue(finalizedHeight);
				const bft = new BFT({
					...bftParams,
					...{ startingHeight: startingHeightLower },
				});

				// Act
				const finalityManager = await bft._initFinalityManager();

				// Assert
				expect(finalityManager).toBeInstanceOf(FinalityManager);
				expect(finalityManager.activeDelegates).toEqual(activeDelegates);
				expect(finalityManager.finalizedHeight).toEqual(finalizedHeight);
			});

			it('should initialize finalityManager with stored startingHeight - TWO_ROUNDS if its highest', async () => {
				// Arrange
				const finalizedHeight = 500;
				const startingHeightHigher = 800;
				storageMock.entities.ChainMeta.getKey.mockReturnValue(finalizedHeight);
				const bft = new BFT({
					...bftParams,
					...{ startingHeight: startingHeightHigher },
				});

				// Act
				const finalityManager = await bft._initFinalityManager();

				// Assert
				expect(finalityManager).toBeInstanceOf(FinalityManager);
				expect(finalityManager.activeDelegates).toEqual(activeDelegates);
				expect(finalityManager.finalizedHeight).toEqual(
					startingHeightHigher - activeDelegates * 2,
				);
			});
		});

		describe('_getLastBlockHeight()', () => {
			it('should call BlockEntity.get with particular parameters', async () => {
				const bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft._getLastBlockHeight();

				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
					{},
					{
						limit: 1,
						sort: 'height:desc',
					},
				);
			});

			it('should return block height if block available', async () => {
				const bft = new BFT(bftParams);

				const lastBlockHeight = 5;
				const block = { height: lastBlockHeight };
				storageMock.entities.Block.get.mockReturnValue([block]);

				const result = await bft._getLastBlockHeight();

				expect(result).toEqual(lastBlockHeight);
			});

			it('should return zero if no block available', async () => {
				const bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft._getLastBlockHeight();

				const result = await bft._getLastBlockHeight();

				expect(result).toEqual(0);
			});
		});
	});
});
