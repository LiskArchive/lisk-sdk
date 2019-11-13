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
const { Blocks } = require('../../../../../../../../src/modules/chain/blocks');
const { BFT } = require('../../../../../../../../src/modules/chain/bft');
const {
	BlockProcessorV2,
} = require('../../../../../../../../src/modules/chain/block_processor_v2');
const {
	FastChainSwitchingMechanism,
	Errors,
} = require('../../../../../../../../src/modules/chain/synchronizer');
const { Slots } = require('../../../../../../../../src/modules/chain/dpos');
const {
	Sequence,
} = require('../../../../../../../../src/modules/chain/utils/sequence');
const {
	Processor,
} = require('../../../../../../../../src/modules/chain/processor');
const { constants } = require('../../../../../../utils');
const { newBlock } = require('../../../chain/blocks/utils');

const genesisBlockDevnet = require('../../../../../../../fixtures/config/devnet/genesis_block');

const ChannelMock = jest.genMockFromModule(
	'../../../../../../../../src/controller/channels/in_memory_channel',
);

describe('fast_chain_switching_mechanism', () => {
	let bftModule;
	let blockProcessorV2;
	let blocksModule;
	let processorModule;
	let fastChainSwitchingMechanism;
	let slots;

	let channelMock;
	let dposModuleMock;
	let exceptions;
	let loggerMock;
	let storageMock;

	beforeEach(() => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};
		storageMock = {
			entities: {
				TempBlock: {
					get: jest.fn(),
					truncate: jest.fn(),
					isEmpty: jest.fn(),
				},
				Block: {
					get: jest.fn(),
					getOne: jest.fn(),
					begin: jest.fn(),
				},
				Account: {
					get: jest.fn(),
				},
				ChainMeta: {
					getKey: jest.fn(),
				},
			},
		};
		channelMock = new ChannelMock();

		slots = new Slots({
			epochTime: constants.EPOCH_TIME,
			interval: constants.BLOCK_TIME,
			blocksPerRound: constants.ACTIVE_DELEGATES,
		});

		bftModule = new BFT({
			storage: storageMock,
			logger: loggerMock,
			activeDelegates: constants.ACTIVE_DELEGATES,
			startingHeight: 1,
		});

		blocksModule = new Blocks({
			logger: loggerMock,
			storage: storageMock,
			slots,
			genesisBlock: genesisBlockDevnet,
			sequence: new Sequence(),
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
		});
		blocksModule.getTempBlocks = jest.fn();

		blockProcessorV2 = new BlockProcessorV2({
			blocksModule,
			bftModule,
			dposModule: dposModuleMock,
			logger: loggerMock,
			constants,
			exceptions,
		});

		processorModule = new Processor({
			channel: channelMock,
			storage: storageMock,
			blocksModule,
			logger: loggerMock,
		});
		processorModule.processValidated = jest.fn();
		processorModule.validate = jest.fn();
		processorModule.deleteLastBlock = jest.fn();
		processorModule.register(blockProcessorV2);

		fastChainSwitchingMechanism = new FastChainSwitchingMechanism({
			storage: storageMock,
			logger: loggerMock,
			channel: channelMock,
			slots,
			blocks: blocksModule,
			bft: bftModule,
			processor: processorModule,
			dpos: dposModuleMock,
			activeDelegates: constants.ACTIVE_DELEGATES,
		});
	});

	describe('async run()', () => {
		const aPeerId = '127.0.0.1:5000';
		let aBlock;

		const checkApplyPenaltyAndRestartIsCalled = (
			receivedBlock,
			peerId,
			reason,
		) => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				{ peerId, reason },
				'Applying penalty to peer and restarting synchronizer',
			);
			expect(channelMock.invoke).toHaveBeenCalledWith('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			expect(channelMock.publish).toHaveBeenCalledWith('chain:processor:sync', {
				block: receivedBlock,
			});
		};

		const checkApplyPenaltyAndAbortIsCalled = (peerId, err) => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				{ err, peerId, reason: err.reason },
				'Applying penalty to peer and aborting synchronization mechanism',
			);
			expect(channelMock.invoke).toHaveBeenCalledWith('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
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
			// blocksModule.init will check whether the genesisBlock in storage matches the genesisBlock in
			// memory. The following mock fakes this to be true
			when(storageMock.entities.Block.begin)
				.calledWith('loader:checkMemTables')
				.mockResolvedValue({ genesisBlock: genesisBlockDevnet });
			when(storageMock.entities.Account.get)
				.calledWith({ isDelegate: true }, { limit: null })
				.mockResolvedValue([{ publicKey: 'aPublicKey' }]);
			// blocksModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
			// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
			const lastBlock = newBlock({ height: genesisBlockDevnet.height + 1 });
			when(storageMock.entities.Block.get)
				.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
				.mockResolvedValue([lastBlock]);
			// Same thing but for BFT module,as it doesn't use extended flag set to true
			when(storageMock.entities.Block.get)
				.calledWith({}, { sort: 'height:desc', limit: 1 })
				.mockResolvedValue([lastBlock]);
			// BFT loads blocks from storage and extracts their headers
			when(storageMock.entities.Block.get)
				.calledWith(
					{
						height_gte: genesisBlockDevnet.height,
						height_lte: lastBlock.height,
					},
					{ limit: null, sort: 'height:asc' },
				)
				.mockResolvedValue([genesisBlockDevnet, lastBlock]);

			// Simulate finalized height stored in ChainMeta table is 0
			when(storageMock.entities.ChainMeta.getKey)
				.calledWith('BFT.finalizedHeight')
				.mockResolvedValue(0);
			jest.spyOn(fastChainSwitchingMechanism, '_queryBlocks');
			jest.spyOn(fastChainSwitchingMechanism, '_switchChain');
			jest.spyOn(fastChainSwitchingMechanism, '_validateBlocks');

			// minActiveHeightsOfDelegates is provided to deleteBlocks function
			// in block_processor_v2 from DPoS module.
			const minActiveHeightsOfDelegates = [
				genesisBlockDevnet,
				lastBlock,
			].reduce((acc, block) => {
				acc[block.generatorPublicKey] = {
					publicKey: block.generateBlocks,
					// the value is not important in this test.
					activeHeights: [1],
				};

				return acc;
			}, {});

			await blocksModule.init();
			await bftModule.init(minActiveHeightsOfDelegates);
		});

		afterEach(() => {
			jest.clearAllMocks();
			// Independently of the correct execution of the mechanisms, `active` property should be always
			// set to false upon finishing the execution
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
						id: blocksModule.lastBlock.id,
					},
				];
				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				// Simulate peer not sending back a common block
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
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
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(12); // 10 + 2 from beforeEach hooks
				expect(channelMock.invoke).toHaveBeenCalledTimes(10);
				checkApplyPenaltyAndRestartIsCalled(
					aBlock,
					aPeerId,
					"Peer didn't return a common block or its height is lower than the finalized height of the chain",
				);
				expect(fastChainSwitchingMechanism.active).toBeFalsy();
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
						id: blocksModule.lastBlock.id,
					},
				];
				// height of the common block is smaller than the finalized height:
				const highestCommonBlock = newBlock({
					height: bftModule.finalizedHeight - 1,
				});
				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
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
				checkApplyPenaltyAndRestartIsCalled(
					aBlock,
					aPeerId,
					"Peer didn't return a common block or its height is lower than the finalized height of the chain",
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
						id: blocksModule.lastBlock.id,
					},
				];
				// Common block between system and peer corresponds to last block in system (To make things easier)
				const highestCommonBlock = newBlock({
					height: blocksModule.lastBlock.height,
				});
				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
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
				// blocksModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
				// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
				when(storageMock.entities.Block.get)
					.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
					.mockResolvedValue([lastBlock]);

				// BFT loads blocks from storage and extracts their headers
				when(storageMock.entities.Block.get)
					.calledWith(
						expect.objectContaining({
							height_gte: expect.any(Number),
							height_lte: expect.any(Number),
						}),
						{ limit: null, sort: 'height:asc' },
					)
					.mockResolvedValue([lastBlock]);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = [lastBlock].reduce((acc, block) => {
					acc[block.generatorPublicKey] = {
						publicKey: block.generateBlocks,
						// the value is not important in this test.
						activeHeights: [1],
					};

					return acc;
				}, {});

				await blocksModule.init(); // Loads last block among other checks
				await bftModule.init(minActiveHeightsOfDelegates); // Loads block headers

				const heightList = new Array(
					Math.min(
						constants.ACTIVE_DELEGATES * 2,
						blocksModule.lastBlock.height,
					),
				)
					.fill(0)
					.map((_, index) => blocksModule.lastBlock.height - index);

				const storageReturnValue = heightList.map(height =>
					newBlock({ height }),
				);

				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: heightList,
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
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
						id: blocksModule.lastBlock.id,
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

				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });
				when(storageMock.entities.Block.getOne)
					.calledWith(
						{
							id_eql: highestCommonBlock.id,
						},
						{
							extended: true,
						},
					)
					.mockResolvedValue(highestCommonBlock);
				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValue(genesisBlockDevnet);

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
						id: blocksModule.lastBlock.id,
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

				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });
				when(storageMock.entities.Block.getOne)
					.calledWith(
						{
							id_eql: highestCommonBlock.id,
						},
						{
							extended: true,
						},
					)
					.mockResolvedValue(highestCommonBlock);
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
						id: blocksModule.lastBlock.id,
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

				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });
				when(storageMock.entities.Block.getOne)
					.calledWith(
						{
							id_eql: highestCommonBlock.id,
						},
						{
							extended: true,
						},
					)
					.mockResolvedValue(highestCommonBlock);
				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValue(genesisBlockDevnet);

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
					expect(storageMock.entities.TempBlock.truncate).toHaveBeenCalled();
					expect(loggerMock.info).toHaveBeenCalledWith(
						{
							currentHeight: blocksModule.lastBlock.height,
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
						id: blocksModule.lastBlock.id,
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

				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: [2, 1], //  We have lastBlock.height + genesisBlock.height present in DB
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValue(storageReturnValue);
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock });
				when(storageMock.entities.Block.getOne)
					.calledWith(
						{
							id_eql: highestCommonBlock.id,
						},
						{
							extended: true,
						},
					)
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
						fullBlock: blocksModule.lastBlock,
						height: blocksModule.lastBlock.height,
						id: blocksModule.lastBlock.id,
					},
				];

				blocksModule.getTempBlocks.mockResolvedValue(blocksInTempTable);

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
				expect(storageMock.entities.TempBlock.truncate).toHaveBeenCalled();
			});
		});
	});
});
