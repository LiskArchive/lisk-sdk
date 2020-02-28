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

const { when } = require('jest-when');
const { Chain } = require('@liskhq/lisk-chain');
const { BFT } = require('@liskhq/lisk-bft');
const { Dpos } = require('@liskhq/lisk-dpos');

const {
	BlockProcessorV2,
} = require('../../../../../../../../src/application/node/block_processor_v2');
const {
	FastChainSwitchingMechanism,
	Errors,
} = require('../../../../../../../../src/application/node/synchronizer');
const {
	Processor,
} = require('../../../../../../../../src/application/node/processor');
const { constants } = require('../../../../../../../utils');
const { newBlock } = require('../block');
const {
	registeredTransactions,
} = require('../../../../../../../utils/registered_transactions');

const genesisBlockDevnet = require('../../../../../../../fixtures/config/devnet/genesis_block');

const ChannelMock = jest.genMockFromModule(
	'../../../../../../../../src/controller/channels/in_memory_channel',
);

describe('fast_chain_switching_mechanism', () => {
	let bftModule;
	let blockProcessorV2;
	let chainModule;
	let dpos;
	let processorModule;
	let fastChainSwitchingMechanism;

	let channelMock;
	let dposModuleMock;
	let exceptions;
	let loggerMock;
	let dataAccessMock;

	beforeEach(() => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};
		const storageMock = {};

		channelMock = new ChannelMock();

		chainModule = new Chain({
			logger: loggerMock,
			storage: storageMock,
			registeredTransactions,
			genesisBlock: genesisBlockDevnet,
			blockReceiptTimeout: constants.BLOCK_RECEIPT_TIMEOUT,
			loadPerIteration: 1000,
			maxPayloadLength: constants.MAX_PAYLOAD_LENGTH,
			maxTransactionsPerBlock: constants.MAX_TRANSACTIONS_PER_BLOCK,
			activeDelegates: constants.ACTIVE_DELEGATES,
			rewardDistance: constants.REWARDS.DISTANCE,
			rewardOffset: constants.REWARDS.OFFSET,
			rewardMileStones: constants.REWARDS.MILESTONES,
			totalAmount: constants.TOTAL_AMOUNT,
			blockSlotWindow: constants.BLOCK_SLOT_WINDOW,
			epochTime: constants.EPOCH_TIME,
			blockTime: constants.BLOCK_TIME,
		});

		dataAccessMock = {
			getTempBlocks: jest.fn(),
			clearTempBlocks: jest.fn(),
			getBlockHeadersWithHeights: jest.fn(),
			getBlockByID: jest.fn(),
			getBlockHeaderByHeight: jest.fn(),
			getLastBlock: jest.fn(),
			getBlockHeadersByHeightBetween: jest.fn(),
			addBlockHeader: jest.fn(),
			getLastBlockHeader: jest.fn(),
			deserialize: chainModule.dataAccess.deserialize,
		};
		chainModule.dataAccess = dataAccessMock;

		dpos = new Dpos({
			chain: chainModule,
			activeDelegates: constants.ACTIVE_DELEGATES,
			delegateListRoundOffset: constants.DELEGATE_LIST_ROUND_OFFSET,
			exceptions: {},
		});

		bftModule = new BFT({
			chain: chainModule,
			dpos,
			activeDelegates: constants.ACTIVE_DELEGATES,
			startingHeight: 1,
		});
		Object.defineProperty(bftModule, 'finalizedHeight', {
			get: jest.fn(() => 1),
		});

		blockProcessorV2 = new BlockProcessorV2({
			chainModule,
			bftModule,
			dposModule: dposModuleMock,
			logger: loggerMock,
			constants,
			exceptions,
		});

		processorModule = new Processor({
			channel: channelMock,
			storage: storageMock,
			chainModule,
			logger: loggerMock,
		});
		processorModule.processValidated = jest.fn();
		processorModule.validate = jest.fn();
		processorModule.deleteLastBlock = jest.fn();
		processorModule.register(blockProcessorV2);

		fastChainSwitchingMechanism = new FastChainSwitchingMechanism({
			logger: loggerMock,
			channel: channelMock,
			rounds: dpos.rounds,
			chain: chainModule,
			bft: bftModule,
			processor: processorModule,
			dpos: dposModuleMock,
			activeDelegates: constants.ACTIVE_DELEGATES,
		});
	});

	describe('async run()', () => {
		const aPeerId = '127.0.0.1:5000';
		let aBlock;

		const checkApplyPenaltyAndAbortIsCalled = (peerId, err) => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				{ err, peerId, reason: err.reason },
				'Applying penalty to peer and aborting synchronization mechanism',
			);
			expect(channelMock.invoke).toHaveBeenCalledWith(
				'app:applyPenaltyOnPeer',
				{
					peerId,
					penalty: 100,
				},
			);
		};

		const checkIfAbortIsCalled = error => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				{
					err: error,
					reason: error.reason,
				},
				`Aborting synchronization mechanism with reason: ${error.reason}`,
			);
		};

		beforeEach(async () => {
			aBlock = newBlock();
			// chainModule.init will check whether the genesisBlock in storage matches the genesisBlock in
			// memory. The following mock fakes this to be true
			// chainModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
			// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
			const lastBlock = newBlock({ height: genesisBlockDevnet.height + 1 });
			when(chainModule.dataAccess.getBlockHeaderByHeight)
				.calledWith(1)
				.mockResolvedValue(genesisBlockDevnet);
			when(chainModule.dataAccess.getLastBlock)
				.calledWith()
				.mockResolvedValue(lastBlock);
			when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
				.calledWith(1, 2)
				.mockResolvedValue([lastBlock]);
			when(chainModule.dataAccess.addBlockHeader)
				.calledWith(lastBlock)
				.mockResolvedValue([]);
			when(chainModule.dataAccess.getLastBlockHeader)
				.calledWith()
				.mockResolvedValue(lastBlock);
			when(chainModule.dataAccess.getBlockHeadersWithHeights)
				.calledWith([2, 1])
				.mockResolvedValue([genesisBlockDevnet, lastBlock]);

			// Simulate finalized height stored in ChainState table is 0

			jest.spyOn(fastChainSwitchingMechanism, '_queryBlocks');
			jest.spyOn(fastChainSwitchingMechanism, '_switchChain');
			jest.spyOn(fastChainSwitchingMechanism, '_validateBlocks');

			await chainModule.init();
		});

		afterEach(() => {
			// Independently of the correct execution of the mechanisms, `active` property should be always
			// set to false upon finishing the execution
			// eslint-disable-next-line jest/no-standalone-expect
			expect(fastChainSwitchingMechanism.active).toBeFalsy();
		});

		describe('when fail to request the common block', () => {
			it('should give up after trying 10 times, apply penalty and restart the mechanism', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				// Simulate peer not sending back a common block
				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: undefined });

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				expect(channelMock.invokeFromNetwork).toHaveBeenCalledTimes(9);
				expect(channelMock.invoke).toHaveBeenCalledTimes(1);
				checkApplyPenaltyAndAbortIsCalled(
					aPeerId,
					new Errors.ApplyPenaltyAndAbortError(
						aPeerId,
						"Peer didn't return a common block",
					),
				);
			});
		});

		describe('given that the highest common block is found', () => {
			it('should apply penalty to the peer and restart syncing mechanisms if the height of the common block is smaller than the finalized height', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				// height of the common block is smaller than the finalized height:
				const highestCommonBlock = newBlock({
					height: bftModule.finalizedHeight - 1,
				});

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				checkApplyPenaltyAndAbortIsCalled(
					aPeerId,
					new Errors.ApplyPenaltyAndAbortError(
						aPeerId,
						'Common block height 0 is lower than the finalized height of the chain 1',
					),
				);
				expect(fastChainSwitchingMechanism._queryBlocks).toHaveBeenCalledWith(
					aBlock,
					highestCommonBlock,
					aPeerId,
				);
			});

			it('should abort the syncing mechanism if the difference in height between the common block and the received block is > ACTIVE_DELEGATES*2 ', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				// Common block between system and peer corresponds to last block in system (To make things easier)
				const highestCommonBlock = newBlock({
					height: chainModule.lastBlock.height,
				});
				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });

				// Act
				// the difference in height between the common block and the received block is > ACTIVE_DELEGATES*2
				const receivedBlock = newBlock({
					height:
						highestCommonBlock.height + constants.ACTIVE_DELEGATES * 2 + 1,
				});
				await fastChainSwitchingMechanism.run(receivedBlock, aPeerId);

				// Assert
				checkIfAbortIsCalled(
					new Errors.AbortError(
						`Height difference between both chains is higher than ${constants.ACTIVE_DELEGATES *
							2}`,
					),
				);
				expect(fastChainSwitchingMechanism._queryBlocks).toHaveBeenCalledWith(
					receivedBlock,
					highestCommonBlock,
					aPeerId,
				);
			});

			it('should abort the syncing mechanism if the difference in height between the common block and the last block is > ACTIVE_DELEGATES*2 ', async () => {
				// Arrange
				const highestCommonBlock = newBlock({
					height: 2,
				});
				// Difference in height between the common block and the last block is > ACTIVE_DELEGATES*2
				const lastBlock = newBlock({
					height:
						highestCommonBlock.height + constants.ACTIVE_DELEGATES * 2 + 1,
				});
				when(chainModule.dataAccess.getBlockHeaderByHeight)
					.calledWith(1)
					.mockResolvedValue(genesisBlockDevnet);
				when(chainModule.dataAccess.getLastBlock)
					.calledWith()
					.mockResolvedValue(lastBlock);
				when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
					.calledWith(
						expect.objectContaining({
							fromHeight: expect.any(Number),
							toHeight: expect.any(Number),
						}),
					)
					.mockResolvedValue([lastBlock]);

				when(chainModule.dataAccess.addBlockHeader)
					.calledWith(lastBlock)
					.mockResolvedValue([lastBlock]);
				when(chainModule.dataAccess.getLastBlockHeader)
					.calledWith()
					.mockResolvedValue(lastBlock);
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue([genesisBlockDevnet, lastBlock]);

				when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
					.calledWith(1, 205)
					.mockResolvedValue([lastBlock]);

				const heightList = new Array(
					Math.min(
						constants.ACTIVE_DELEGATES * 2,
						chainModule.lastBlock.height,
					),
				)
					.fill(0)
					.map((_, index) => chainModule.lastBlock.height - index);

				const storageReturnValue = heightList.map(height =>
					newBlock({ height }),
				);
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith(heightList)
					.mockResolvedValue(storageReturnValue);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });

				// Act
				const receivedBlock = newBlock({
					height:
						highestCommonBlock.height + constants.ACTIVE_DELEGATES * 2 + 1,
				});
				await fastChainSwitchingMechanism.run(receivedBlock, aPeerId);

				// Assert
				checkIfAbortIsCalled(
					new Errors.AbortError(
						`Height difference between both chains is higher than ${constants.ACTIVE_DELEGATES *
							2}`,
					),
				);
				expect(fastChainSwitchingMechanism._queryBlocks).toHaveBeenCalledWith(
					receivedBlock,
					highestCommonBlock,
					aPeerId,
				);
			});
		});

		describe('request and validate blocks', () => {
			it('should request blocks within a range of IDs [commonBlock.id <-> receivedBlock.id] and validate them', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				const highestCommonBlock = newBlock({
					height: genesisBlockDevnet.height,
				});

				const requestedBlocks = [
					newBlock({
						height: highestCommonBlock.height + 1,
						previousBlock: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism._requestBlocksWithinIDs = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });
				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValue(genesisBlockDevnet);

				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				let previousBlock = await processorModule.deserialize(
					highestCommonBlock,
				);

				for (const block of requestedBlocks) {
					const blockInstance = await processorModule.deserialize(block);

					expect(processorModule.validate).toHaveBeenCalledWith(blockInstance, {
						lastBlock: previousBlock,
					});
					expect(loggerMock.trace).toHaveBeenCalledWith(
						{ blockId: block.id, height: block.height },
						'Validating block',
					);
					previousBlock = blockInstance;
				}

				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Successfully validated blocks',
				);
				expect(
					fastChainSwitchingMechanism._validateBlocks,
				).toHaveBeenCalledWith(requestedBlocks, highestCommonBlock, aPeerId);
			});

			it('should apply penalty and abort if any of the blocks fail to validate', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				const highestCommonBlock = newBlock({
					height: genesisBlockDevnet.height,
				});

				const requestedBlocks = [
					newBlock({
						height: highestCommonBlock.height + 1,
						previousBlock: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism._requestBlocksWithinIDs = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });
				processorModule.validate.mockRejectedValue(
					new Error('validation error'),
				);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				checkApplyPenaltyAndAbortIsCalled(
					aPeerId,
					new Errors.ApplyPenaltyAndAbortError(
						aPeerId,
						'Block validation failed',
					),
				);
				expect(
					fastChainSwitchingMechanism._validateBlocks,
				).toHaveBeenCalledWith(requestedBlocks, highestCommonBlock, aPeerId);
			});
		});

		describe('switch to a different chain', () => {
			it('should switch to a different chain (apply list of blocks returned by the peer) and cleanup blocks temp table', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				const highestCommonBlock = newBlock({
					height: genesisBlockDevnet.height,
				});
				const requestedBlocks = [
					newBlock({
						height: highestCommonBlock.height + 1,
						previousBlock: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism._requestBlocksWithinIDs = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });

				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValue(genesisBlockDevnet);
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue);
				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				expect(fastChainSwitchingMechanism._switchChain).toHaveBeenCalledWith(
					highestCommonBlock,
					requestedBlocks,
					aPeerId,
				);
				expect(loggerMock.info).toHaveBeenCalledWith('Switching chain');
				expect(loggerMock.debug).toHaveBeenCalledWith(
					{ height: highestCommonBlock.height },
					`Deleting blocks after height ${highestCommonBlock.height}`,
				);

				expect(processorModule.deleteLastBlock).toHaveBeenCalledWith({
					saveTempBlock: true,
				});
				expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(1);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					{
						blocks: requestedBlocks.map(block => ({
							blockId: block.id,
							height: block.height,
						})),
					},
					'Applying blocks',
				);

				for (const block of requestedBlocks) {
					expect(loggerMock.trace).toHaveBeenCalledWith(
						{
							blockId: block.id,
							height: block.height,
						},
						'Applying blocks',
					);
					// expect(loggerMock.trace).toHaveBeenCalledTimes(
					// 	requestedBlocks.length,
					// );
					expect(processorModule.processValidated).toHaveBeenCalledWith(
						await processorModule.deserialize(block),
					);
					// TODO: Figure out why call count is not resetting
					// expect(processorModule.processValidated).toHaveBeenCalledTimes(
					// 	requestedBlocks.length,
					// );

					expect(loggerMock.debug).toHaveBeenCalledWith(
						'Cleaning blocks temp table',
					);
					expect(chainModule.dataAccess.clearTempBlocks).toHaveBeenCalled();
					expect(loggerMock.info).toHaveBeenCalledWith(
						{
							currentHeight: chainModule.lastBlock.height,
							highestCommonBlockHeight: highestCommonBlock.height,
						},
						'Successfully switched chains. Node is now up to date',
					);
				}
			});

			it('should delete blocks after highest common block height, restore blocks from temp table and cleanup temp table if any of the blocks returned by peer fails to apply', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlockDevnet.id,
					},
					{
						id: chainModule.lastBlock.id,
					},
				];
				const highestCommonBlock = newBlock({
					height: genesisBlockDevnet.height,
				});
				const requestedBlocks = [
					newBlock({
						height: highestCommonBlock.height + 1,
						previousBlock: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism._requestBlocksWithinIDs = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue);
				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock);

				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValueOnce(genesisBlockDevnet)
					.calledWith({
						saveTempBlock: false,
					})
					.mockResolvedValueOnce(genesisBlockDevnet);

				const blocksInTempTable = [
					{
						fullBlock: chainModule.lastBlock,
						height: chainModule.lastBlock.height,
						id: chainModule.lastBlock.id,
					},
				];

				chainModule.dataAccess.getTempBlocks.mockResolvedValue(
					blocksInTempTable,
				);

				const processingError = new Errors.BlockProcessingError();
				processorModule.processValidated.mockRejectedValueOnce(processingError);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				expect(fastChainSwitchingMechanism._switchChain).toHaveBeenCalledWith(
					highestCommonBlock,
					requestedBlocks,
					aPeerId,
				);
				expect(processorModule.processValidated).toHaveBeenCalled();
				expect(loggerMock.error).toHaveBeenCalledWith(
					{ err: processingError },
					'Error while processing blocks',
				);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					{
						height: highestCommonBlock.height,
					},
					'Deleting blocks after height',
				);
				expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(2);
				expect(processorModule.deleteLastBlock).toHaveBeenCalledWith({
					saveTempBlock: false,
				});
				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Restoring blocks from temporary table',
				);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Cleaning blocks temp table',
				);
				// Restore blocks from temp table:
				expect(processorModule.processValidated).toHaveBeenCalledWith(
					await processorModule.deserialize(blocksInTempTable[0].fullBlock),
					{
						removeFromTempTable: true,
					},
				);
				// Clear temp table:
				expect(chainModule.dataAccess.clearTempBlocks).toHaveBeenCalled();
			});
		});
	});
});
