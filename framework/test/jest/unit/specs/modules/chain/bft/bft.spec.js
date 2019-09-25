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

const generateBlocks = ({ startHeight, numberOfBlocks }) =>
	new Array(numberOfBlocks)
		.fill(0)
		.map((_v, index) =>
			blockFixture({ height: startHeight + index, version: '2' }),
		);

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
					setKey: jest.fn(),
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

		describe('#constructor', () => {
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

		describe('#init', () => {
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
					.spyOn(bft, '_loadBlocksFromStorage')
					.mockImplementation(() => jest.fn());
			});

			it('should invoke _initFinalityManager()', async () => {
				await bft.init();

				expect(bft._initFinalityManager).toHaveBeenCalledTimes(1);
			});

			it('should invoke _getLastBlockHeight()', async () => {
				await bft.init();

				expect(bft._getLastBlockHeight).toHaveBeenCalledTimes(1);
			});

			it('should invoke _loadBlocksFromStorage() for finalizedHeight if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 500;
				const lastBlockHeight = 600;

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init();

				expect(bft._loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft._loadBlocksFromStorage).toHaveBeenCalledWith({
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

				await bft.init();

				expect(bft._loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft._loadBlocksFromStorage).toHaveBeenCalledWith({
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

				await bft.init();

				expect(bft._loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft._loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: bft.constants.startingHeight,
					tillHeight: lastBlockHeight,
				});
			});
		});

		describe('#addNewBlock', () => {
			const block1 = blockFixture({ height: 1, version: '2' });
			const lastFinalizedHeight = 5;

			let bft;
			let txStub;

			beforeEach(async () => {
				storageMock.entities.Block.get.mockReturnValue([]);
				bft = new BFT(bftParams);
				storageMock.entities.ChainMeta.getKey.mockReturnValue(
					lastFinalizedHeight,
				);
				txStub = jest.fn();
				await bft.init();
				storageMock.entities.Block.get.mockClear();
			});

			describe('when valid block which does not change the finality is added', () => {
				it('should update the latest finalized height to storage', async () => {
					await bft.addNewBlock(block1, txStub);
					expect(storageMock.entities.ChainMeta.setKey).toHaveBeenCalledWith(
						'BFT.finalizedHeight',
						lastFinalizedHeight,
						txStub,
					);
				});
			});
		});

		describe('#deleteBlocks', () => {
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();
				storageMock.entities.Block.get.mockClear();
			});

			it('should reject with error if no blocks are provided', async () => {
				// Act & Assert
				await expect(bft.deleteBlocks()).rejects.toThrow(
					'Must provide blocks which are deleted',
				);
			});

			it('should reject with error if blocks are not provided as array', async () => {
				// Act & Assert
				await expect(bft.deleteBlocks({})).rejects.toThrow(
					'Must provide list of blocks',
				);
			});

			it('should reject with error if blocks deleted contains block with lower than finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				storageMock.entities.ChainMeta.getKey.mockReturnValue(5);
				await bft.init();
				const blocks = [
					blockFixture({ height: 4, version: '2' }),
					blockFixture({ height: 5, version: '2' }),
					blockFixture({ height: 6, version: '2' }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should reject with error if blocks deleted contains block with same as finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				storageMock.entities.ChainMeta.getKey.mockReturnValue(5);
				await bft.init();
				const blocks = [
					blockFixture({ height: 5, version: '2' }),
					blockFixture({ height: 6, version: '2' }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should delete the block headers form list for all given blocks', async () => {
				// Arrange
				const block1 = blockFixture({ height: 1, version: '2' });
				const block2 = blockFixture({ height: 2, version: '2' });
				const block3 = blockFixture({ height: 3, version: '2' });
				const block4 = blockFixture({ height: 4, version: '2' });
				await bft.addNewBlock(block1);
				await bft.addNewBlock(block2);
				await bft.addNewBlock(block3);
				await bft.addNewBlock(block4);

				// Act
				await bft.deleteBlocks([block3, block4]);

				// Assert
				expect(bft.finalityManager.minHeight).toEqual(1);
				expect(bft.finalityManager.maxHeight).toEqual(2);
				expect(bft.finalityManager.headers.items).toEqual([
					extractBFTBlockHeaderFromBlock(block1),
					extractBFTBlockHeaderFromBlock(block2),
				]);
			});

			it('should load more blocks from storage if remaining in headers list is less than 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const blocksToDelete = 50;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 100 blocks from height 401 to 500
				const blocksInBft = blocks.slice(400);

				// Last 50 blocks from height 451 to 500
				const blockToDelete = blocks.slice(-blocksToDelete);

				// Will fetch 202 - (450 - 401) = 153 more blocks
				const blocksFetchedFromStorage = blocks.slice(400 - 153, 400).reverse();

				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block);
				}

				// When asked by BFT, return last [blocksToDelete] blocks ()
				storageMock.entities.Block.get.mockReturnValue(
					blocksFetchedFromStorage,
				);

				// Act - Delete top 50 blocks (500-450 height)
				await bft.deleteBlocks(blockToDelete);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(450);
				expect(bft.finalityManager.minHeight).toEqual(
					450 - activeDelegates * 2,
				);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenLastCalledWith(
					{ height_lte: 400, height_gte: 450 - activeDelegates * 2 },
					{ limit: null, sort: 'height:desc' },
				);
			});

			it('should not load more blocks from storage if remaining in headers list is more than 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const blocksToDelete = 50;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 300 blocks from height 201 to 500
				const blocksInBft = blocks.slice(200);

				// Last 50 blocks from height 451 to 500
				const blockToDelete = blocks.slice(-blocksToDelete);

				// Load last 300 blocks to bft (201 to 500)
				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block);
				}

				// Act
				await bft.deleteBlocks(blockToDelete);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(450);
				expect(bft.finalityManager.minHeight).toEqual(201);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(0);
			});

			it('should not load more blocks from storage if remaining in headers list is exactly 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 300 blocks from height 201 to 500
				const blocksInBft = blocks.slice(200);

				// Delete blocks keeping exactly two rounds in the list from (201 to 298)
				const blockToDelete = blocks.slice(
					-1 * (300 - activeDelegates * 2 - 1),
				);

				// Load last 300 blocks to bft (201 to 500)
				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block);
				}

				// Act
				await bft.deleteBlocks(blockToDelete);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(403);
				expect(bft.finalityManager.minHeight).toEqual(
					403 - activeDelegates * 2,
				);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(0);
			});
		});

		// TODO: Remove tests for private methods
		describe('#_initFinalityManager', () => {
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

		describe('#_getLastBlockHeight', () => {
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

		describe('#_loadBlocksFromStorage', () => {
			const fromHeight = 0;
			const tillHeight = 10;
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();
			});

			it('should call fetch blocks from storage particular parameters', async () => {
				storageMock.entities.Block.get.mockReset();
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft._loadBlocksFromStorage({ fromHeight, tillHeight });

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
				await bft._loadBlocksFromStorage({ fromHeight, tillHeight });

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
				await bft._loadBlocksFromStorage({ fromHeight, tillHeight });

				// Assert
				expect(bft.finalityManager.headers.items.length).toEqual(1);
				expect(bft.finalityManager.headers.items).toEqual([blockHeader]);
			});
		});
	});
});
