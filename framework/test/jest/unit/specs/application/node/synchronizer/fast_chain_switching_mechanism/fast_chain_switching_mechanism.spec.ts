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

import { when } from 'jest-when';
import { BlockInstance, Chain } from '@liskhq/lisk-chain';
import { BFT } from '@liskhq/lisk-bft';
import { Dpos } from '@liskhq/lisk-dpos';

import { BlockProcessorV2 } from '../../../../../../../../src/application/node/block_processor_v2';
import {
	FastChainSwitchingMechanism,
	Errors,
} from '../../../../../../../../src/application/node/synchronizer';
import { Processor } from '../../../../../../../../src/application/node/processor';
import { constants } from '../../../../../../../utils';
import { newBlock } from '../block';
import { registeredTransactions } from '../../../../../../../utils/registered_transactions';

import * as genesisBlockDevnet from '../../../../../../../fixtures/config/devnet/genesis_block.json';

const ChannelMock: any = jest.genMockFromModule(
	'../../../../../../../../src/controller/channels/in_memory_channel',
);

describe('fast_chain_switching_mechanism', () => {
	let bftModule: any;
	let blockProcessorV2;
	let chainModule: any;
	let dposModule: any;
	let processorModule: any;
	let fastChainSwitchingMechanism: FastChainSwitchingMechanism;

	let channelMock: any;
	let loggerMock: any;
	let dataAccessMock;

	beforeEach(() => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};
		const storageMock: any = {};

		channelMock = new ChannelMock();

		chainModule = new Chain({
			networkIdentifier: '',
			storage: storageMock,
			genesisBlock: genesisBlockDevnet as any,
			registeredTransactions,
			maxPayloadLength: constants.maxPayloadLength,
			rewardDistance: constants.rewards.distance,
			rewardOffset: constants.rewards.offset,
			rewardMilestones: constants.rewards.milestones,
			totalAmount: constants.totalAmount,
			epochTime: constants.epochTime,
			blockTime: constants.blockTime,
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

		dposModule = new Dpos({
			chain: chainModule,
			activeDelegates: constants.activeDelegates,
			standbyDelegates: constants.standbyDelegates,
			delegateListRoundOffset: constants.delegateListRoundOffset,
		});

		bftModule = new BFT({
			chain: chainModule,
			dpos: dposModule,
			activeDelegates: constants.activeDelegates,
			startingHeight: 1,
		});
		Object.defineProperty(bftModule, 'finalizedHeight', {
			get: jest.fn(() => 1),
		});

		blockProcessorV2 = new BlockProcessorV2({
			networkIdentifier: '',
			storage: storageMock,
			chainModule,
			bftModule,
			dposModule,
			logger: loggerMock,
			constants,
		});

		processorModule = new Processor({
			channel: channelMock,
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
			chain: chainModule,
			bft: bftModule,
			processor: processorModule,
			dpos: dposModule,
		});
	});

	describe('isValidFor', () => {
		const defaultGenerator = {
			address: '11121761073292744822L',
			publicKey:
				'20d381308d9a809455567af249dddd68bd2e23753e69913961fe04ac07732594',
		};

		beforeEach(() => {
			jest.spyOn(dposModule, 'isActiveDelegate');
			chainModule._lastBlock = { height: 310 };
		});

		describe('when reveivedBlock is within the two rounds of the last block', () => {
			it('should return true when the receivedBlock is from active delegate', async () => {
				dposModule.isActiveDelegate.mockResolvedValue(true);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						generatorPublicKey: defaultGenerator.publicKey,
						height: 515,
					} as BlockInstance,
					'peer-id',
				);
				expect(isValid).toEqual(true);
			});

			it('should return false when the receivedBlock is not from active delegate', async () => {
				dposModule.isActiveDelegate.mockResolvedValue(false);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						generatorPublicKey: defaultGenerator.publicKey,
						height: 515,
					} as BlockInstance,
					'peer-id',
				);
				expect(isValid).toEqual(false);
			});
		});

		describe('when reveivedBlock is not within two rounds of the last block', () => {
			it('should return false even when the block is from active delegate', async () => {
				dposModule.isActiveDelegate.mockResolvedValue(true);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						generatorPublicKey: defaultGenerator.publicKey,
						height: 619,
					} as BlockInstance,
					'peer-id',
				);
				expect(isValid).toEqual(false);
			});
		});
	});

	describe('async run()', () => {
		const aPeerId = '127.0.0.1:5000';
		let aBlock: BlockInstance;

		const checkApplyPenaltyAndAbortIsCalled = (peerId: string, err: any) => {
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

		const checkIfAbortIsCalled = (error: any) => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				{
					err: error,
					reason: error.reason,
				},
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
				.mockResolvedValue(genesisBlockDevnet as never);
			when(chainModule.dataAccess.getLastBlock)
				.calledWith()
				.mockResolvedValue(lastBlock as never);
			when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
				.calledWith(1, 2)
				.mockResolvedValue([lastBlock] as never);
			when(chainModule.dataAccess.addBlockHeader)
				.calledWith(lastBlock)
				.mockResolvedValue([] as never);
			when(chainModule.dataAccess.getLastBlockHeader)
				.calledWith()
				.mockResolvedValue(lastBlock as never);
			when(chainModule.dataAccess.getBlockHeadersWithHeights)
				.calledWith([2, 1])
				.mockResolvedValue([genesisBlockDevnet, lastBlock] as never);

			// Simulate finalized height stored in ConsensusState table is 0

			jest.spyOn(fastChainSwitchingMechanism, '_queryBlocks' as never);
			jest.spyOn(fastChainSwitchingMechanism, '_switchChain' as never);
			jest.spyOn(fastChainSwitchingMechanism, '_validateBlocks' as never);

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
					.mockResolvedValue({ data: undefined } as never);

				// Act
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected Error
				}

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
					.mockResolvedValue({ data: highestCommonBlock } as never);

				// Act
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected error
				}

				// Assert
				checkApplyPenaltyAndAbortIsCalled(
					aPeerId,
					new Errors.ApplyPenaltyAndAbortError(
						aPeerId,
						'Common block height 0 is lower than the finalized height of the chain 1',
					),
				);
				expect(
					fastChainSwitchingMechanism['_queryBlocks'],
				).toHaveBeenCalledWith(aBlock, highestCommonBlock, aPeerId);
			});

			it('should abort the syncing mechanism if the difference in height between the common block and the received block is > delegatesPerRound*2 ', async () => {
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
					.mockResolvedValue({ data: highestCommonBlock } as never);

				// Act
				// the difference in height between the common block and the received block is > delegatesPerRound*2
				const receivedBlock = newBlock({
					height:
						highestCommonBlock.height + dposModule.delegatesPerRound * 2 + 1,
				});
				await fastChainSwitchingMechanism.run(receivedBlock, aPeerId);

				// Assert
				checkIfAbortIsCalled(
					new Errors.AbortError(
						`Height difference between both chains is higher than ${dposModule.delegatesPerRound *
							2}`,
					),
				);
				expect(
					fastChainSwitchingMechanism['_queryBlocks'],
				).toHaveBeenCalledWith(receivedBlock, highestCommonBlock, aPeerId);
			});

			it('should abort the syncing mechanism if the difference in height between the common block and the last block is > delegatesPerRound*2 ', async () => {
				// Arrange
				const highestCommonBlock = newBlock({
					height: 2,
				});
				// Difference in height between the common block and the last block is > delegatesPerRound*2
				const lastBlock = newBlock({
					height:
						highestCommonBlock.height + dposModule.delegatesPerRound * 2 + 1,
				});
				when(chainModule.dataAccess.getBlockHeaderByHeight)
					.calledWith(1)
					.mockResolvedValue(genesisBlockDevnet as never);
				when(chainModule.dataAccess.getLastBlock)
					.calledWith()
					.mockResolvedValue(lastBlock as never);
				when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
					.calledWith(
						expect.objectContaining({
							fromHeight: expect.any(Number),
							toHeight: expect.any(Number),
						}),
					)
					.mockResolvedValue([lastBlock] as never);

				when(chainModule.dataAccess.addBlockHeader)
					.calledWith(lastBlock)
					.mockResolvedValue([lastBlock] as never);
				when(chainModule.dataAccess.getLastBlockHeader)
					.calledWith()
					.mockResolvedValue(lastBlock as never);
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue([genesisBlockDevnet, lastBlock] as never);

				when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
					.calledWith(1, 205)
					.mockResolvedValue([lastBlock] as never);

				const heightList = new Array(
					Math.min(
						dposModule.delegatesPerRound * 2,
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
					.mockResolvedValue(storageReturnValue as never);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock } as never);

				// Act
				const receivedBlock = newBlock({
					height:
						highestCommonBlock.height + dposModule.delegatesPerRound * 2 + 1,
				});
				await fastChainSwitchingMechanism.run(receivedBlock, aPeerId);

				// Assert
				checkIfAbortIsCalled(
					new Errors.AbortError(
						`Height difference between both chains is higher than ${dposModule.delegatesPerRound *
							2}`,
					),
				);
				expect(
					fastChainSwitchingMechanism['_queryBlocks'],
				).toHaveBeenCalledWith(receivedBlock, highestCommonBlock, aPeerId);
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
						previousBlockId: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism[
					'_requestBlocksWithinIDs'
				] = jest.fn().mockResolvedValue(requestedBlocks);

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock } as never);
				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValue(genesisBlockDevnet as never);

				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert

				for (const block of requestedBlocks) {
					const blockInstance = await processorModule.deserialize(block);

					expect(processorModule.validate).toHaveBeenCalledWith(blockInstance);
					expect(loggerMock.trace).toHaveBeenCalledWith(
						{ blockId: block.id, height: block.height },
						'Validating block',
					);
				}

				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Successfully validated blocks',
				);
				expect(
					fastChainSwitchingMechanism['_validateBlocks'],
				).toHaveBeenCalledWith(requestedBlocks, aPeerId);
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
						previousBlockId: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism[
					'_requestBlocksWithinIDs'
				] = jest.fn().mockResolvedValue(requestedBlocks);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock } as never);
				processorModule.validate.mockRejectedValue(
					new Error('validation error'),
				);

				// Act
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected error
				}

				// Assert
				checkApplyPenaltyAndAbortIsCalled(
					aPeerId,
					new Errors.ApplyPenaltyAndAbortError(
						aPeerId,
						'Block validation failed',
					),
				);
				expect(
					fastChainSwitchingMechanism['_validateBlocks'],
				).toHaveBeenCalledWith(requestedBlocks, aPeerId);
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
						previousBlockId: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism[
					'_requestBlocksWithinIDs'
				] = jest.fn().mockResolvedValue(requestedBlocks);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock } as never);

				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValue(genesisBlockDevnet as never);
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				expect(
					fastChainSwitchingMechanism['_switchChain'],
				).toHaveBeenCalledWith(highestCommonBlock, requestedBlocks, aPeerId);
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
						previousBlockId: highestCommonBlock.id,
					}),
					...new Array(34).fill(0).map(() => newBlock()),
					aBlock,
				];

				fastChainSwitchingMechanism[
					'_requestBlocksWithinIDs'
				] = jest.fn().mockResolvedValue(requestedBlocks);

				when(channelMock.invokeFromNetwork)
					.calledWith('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: highestCommonBlock } as never);

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValueOnce(genesisBlockDevnet as never)
					.calledWith({
						saveTempBlock: false,
					})
					.mockResolvedValueOnce(genesisBlockDevnet as never);

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
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected error
				}

				// Assert
				expect(
					fastChainSwitchingMechanism['_switchChain'],
				).toHaveBeenCalledWith(highestCommonBlock, requestedBlocks, aPeerId);
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
