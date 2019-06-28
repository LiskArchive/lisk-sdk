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
	ConsensusManager,
} = require('../../../../../../../src/modules/chain/bft/consensus_manager');
const bftModule = require('../../../../../../../src/modules/chain/bft/bft');

jest.mock('../../../../../../../src/modules/chain/bft/consensus_manager');

const { BFT, extractBFTBlockHeaderFromBlock } = bftModule;

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

				expect(bft.consensusManager).toBeNull();
				expect(bft.storage).toBe(storageMock);
				expect(bft.logger).toBe(loggerMock);
				expect(bft.constants).toEqual({ activeDelegates, startingHeight });
				expect(bft.BlockEntity).toBe(storageMock.entities.Block);
				expect(bft.ChainMetaEntity).toBe(storageMock.entities.ChainMeta);
			});
		});

		describe('init()', () => {
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);

				jest
					.spyOn(bft, '_initConsensusManager')
					.mockImplementation(() => jest.fn());

				jest
					.spyOn(bft, '_getLastBlockHeight')
					.mockImplementation(() => jest.fn());

				jest.spyOn(bft, 'loadBlocks').mockImplementation(() => jest.fn());
			});

			it('should invoke _initConsensusManager()', async () => {
				await bft.init();

				expect(bft._initConsensusManager).toHaveBeenCalledTimes(1);
			});

			it('should invoke _getLastBlockHeight()', async () => {
				await bft.init();

				expect(bft._getLastBlockHeight).toHaveBeenCalledTimes(1);
			});

			it('should invoke loadBlocks() for finalizedHeight if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 500;
				const lastBlockHeight = 600;

				bft._initConsensusManager.mockReturnValue({ finalizedHeight });
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init();

				expect(bft.loadBlocks).toHaveBeenCalledTimes(1);
				expect(bft.loadBlocks).toHaveBeenCalledWith({
					fromHeight: finalizedHeight,
					tillHeight: lastBlockHeight,
				});
			});

			it('should invoke loadBlocks() for lastBlockHeight - TWO_ROUNDS if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;

				bft._initConsensusManager.mockReturnValue({ finalizedHeight });
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init();

				expect(bft.loadBlocks).toHaveBeenCalledTimes(1);
				expect(bft.loadBlocks).toHaveBeenCalledWith({
					fromHeight: lastBlockHeight - activeDelegates * 2,
					tillHeight: lastBlockHeight,
				});
			});

			it('should invoke loadBlocks() for staringHeight if its highest', async () => {
				bft.constants.startingHeight = 550;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;

				bft._initConsensusManager.mockReturnValue({ finalizedHeight });
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init();

				expect(bft.loadBlocks).toHaveBeenCalledTimes(1);
				expect(bft.loadBlocks).toHaveBeenCalledWith({
					fromHeight: bft.constants.startingHeight,
					tillHeight: lastBlockHeight,
				});
			});
		});

		describe('_initConsensusManager()', () => {
			it('should call ChainMetaEntity.getKey to get stored finalized height', async () => {
				const bft = new BFT(bftParams);
				const result = await bft._initConsensusManager();

				expect(storageMock.entities.ChainMeta.getKey).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.ChainMeta.getKey).toHaveBeenCalledWith(
					'BFT.finalizedHeight'
				);
				expect(result).toBeInstanceOf(ConsensusManager);
			});

			it('should initialize consensusManager with stored FINALIZED_HEIGHT if its highest', async () => {
				const finalizedHeight = 500;
				const startingHeightLower = 300;
				storageMock.entities.ChainMeta.getKey.mockReturnValue(finalizedHeight);

				const bft = new BFT({
					...bftParams,
					...{ startingHeight: startingHeightLower },
				});

				const result = await bft._initConsensusManager();

				expect(ConsensusManager).toHaveBeenCalledTimes(1);
				expect(ConsensusManager).toHaveBeenCalledWith({
					activeDelegates,
					finalizedHeight,
				});
				expect(result).toBeInstanceOf(ConsensusManager);
			});

			it('should initialize consensusManager with stored startingHeight - TWO_ROUNDS if its highest', async () => {
				const finalizedHeight = 500;
				const startingHeightHigher = 800;
				storageMock.entities.ChainMeta.getKey.mockReturnValue(finalizedHeight);

				const bft = new BFT({
					...bftParams,
					...{ startingHeight: startingHeightHigher },
				});

				const result = await bft._initConsensusManager();

				expect(ConsensusManager).toHaveBeenCalledTimes(1);
				expect(ConsensusManager).toHaveBeenCalledWith({
					activeDelegates,
					finalizedHeight: startingHeightHigher - activeDelegates * 2,
				});
				expect(result).toBeInstanceOf(ConsensusManager);
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
					}
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

		describe('loadBlocks()', () => {
			const fromHeight = 0;
			const tillHeight = 10;
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				jest.spyOn(bftModule, 'extractBFTBlockHeaderFromBlock');
				await bft.init();
			});

			it('should call BlockEntity.get with particular parameters', async () => {
				storageMock.entities.Block.get.mockReset();
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft.loadBlocks({ fromHeight, tillHeight });

				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
					{ height_gte: fromHeight, height_lte: tillHeight },
					{
						limit: null,
						sort: 'height:asc',
					}
				);
			});

			it('should skip blocks with version !== 2', async () => {
				storageMock.entities.Block.get.mockReturnValue([
					{ version: '1' },
					{ version: '2' },
				]);

				await bft.loadBlocks({ fromHeight, tillHeight });
				expect(bftModule.extractBFTBlockHeaderFromBlock).toHaveBeenCalledTimes(
					1
				);
				expect(bftModule.extractBFTBlockHeaderFromBlock).toHaveBeenCalledWith({
					version: '2',
				});
			});

			it('should call extractBFTBlockHeaderFromBlock for every block', async () => {
				const blocks = [
					blockFixture({ version: '2', height: 8 }),
					blockFixture({ version: '2', height: 9 }),
				];
				storageMock.entities.Block.get.mockReturnValue(blocks);

				await bft.loadBlocks({ fromHeight, tillHeight });

				expect(bftModule.extractBFTBlockHeaderFromBlock).toHaveBeenCalledTimes(
					blocks.length
				);
				blocks.forEach((block, index) => {
					expect(
						bftModule.extractBFTBlockHeaderFromBlock
					).toHaveBeenNthCalledWith(index + 1, block);
				});
			});

			it('should call consensusManager.addBlockHeader for every header', async () => {
				const blocks = [
					blockFixture({ version: '2', height: 8, id: '12345acf' }),
				];
				const blockHeader = { height: 8, id: '12345acf' };
				storageMock.entities.Block.get.mockReturnValue(blocks);
				bftModule.extractBFTBlockHeaderFromBlock.mockReturnValue(blockHeader);

				await bft.loadBlocks({ fromHeight, tillHeight });

				expect(bft.consensusManager.addBlockHeader).toHaveBeenCalledTimes(1);
				expect(bft.consensusManager.addBlockHeader).toHaveBeenCalledWith(
					blockHeader
				);
			});
		});
	});
});
