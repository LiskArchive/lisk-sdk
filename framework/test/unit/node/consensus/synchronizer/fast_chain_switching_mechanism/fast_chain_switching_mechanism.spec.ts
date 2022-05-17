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
import { codec } from '@liskhq/lisk-codec';
import { Block, Chain } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey, getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import {
	FastChainSwitchingMechanism,
	Errors,
} from '../../../../../../src/node/consensus/synchronizer';
import {
	genesisBlock as getGenesisBlock,
	createValidDefaultBlock,
	createFakeBlockHeader,
} from '../../../../../fixtures';
import {
	getHighestCommonBlockRequestSchema,
	getHighestCommonBlockResponseSchema,
} from '../../../../../../src/node/consensus/schema';

describe('fast_chain_switching_mechanism', () => {
	const genesisBlock = getGenesisBlock();
	const finalizedHeight = genesisBlock.header.height + 1;
	const numberOfValidators = 103;

	let finalizedBlock: Block;
	let lastBlock: Block;

	let chainModule: any;
	let blockExecutor: any;
	let fastChainSwitchingMechanism: FastChainSwitchingMechanism;

	let loggerMock: any;
	let networkMock: any;
	let dataAccessMock;

	beforeEach(() => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};

		networkMock = {
			requestFromPeer: jest.fn(),
		};

		chainModule = new Chain({
			maxTransactionsSize: 15000,
			keepEventsForHeights: -1,
		});
		chainModule.init({
			db: new InMemoryKVStore(),
			networkIdentifier: Buffer.from('network-id'),
		});
		chainModule._lastBlock = { header: { height: 310 } };

		dataAccessMock = {
			getConsensusState: jest.fn(),
			setConsensusState: jest.fn(),
			getTempBlocks: jest.fn(),
			clearTempBlocks: jest.fn(),
			getBlockHeadersWithHeights: jest.fn(),
			getBlockByID: jest.fn(),
			getBlockHeaderByHeight: jest.fn(),
			getBlockHeaderByID: jest.fn(),
			getLastBlock: jest.fn(),
			getBlockHeadersByHeightBetween: jest.fn(),
			addBlockHeader: jest.fn(),
			getLastBlockHeader: jest.fn(),
		};
		chainModule.dataAccess = dataAccessMock;

		blockExecutor = {
			validate: jest.fn(),
			verify: jest.fn(),
			executeValidated: jest.fn(),
			deleteLastBlock: jest.fn(),
			getFinalizedHeight: jest.fn().mockReturnValue(1),
			getSlotNumber: jest.fn(),
			getCurrentValidators: jest.fn().mockResolvedValue(
				new Array(numberOfValidators).fill(0).map(() => ({
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				})),
			),
		};

		fastChainSwitchingMechanism = new FastChainSwitchingMechanism({
			logger: loggerMock,
			chain: chainModule,
			blockExecutor,
			network: networkMock,
		});
	});

	describe('isValidFor', () => {
		const defaultGenerator = {
			address: Buffer.from('76986142c56e589a35ac2a78c64f6cc4d5df2d28', 'hex'),
			publicKey: Buffer.from(
				'20d381308d9a809455567af249dddd68bd2e23753e69913961fe04ac07732594',
				'hex',
			),
		};

		beforeEach(() => {
			chainModule._lastBlock = { header: { height: 310 } };
		});

		describe('when receivedBlock is within the two rounds of the last block', () => {
			it('should return true when the receivedBlock is from consensus participant', async () => {
				blockExecutor.getCurrentValidators.mockResolvedValue([
					{
						address: getAddressFromPublicKey(defaultGenerator.publicKey),
						bftWeight: BigInt(1),
					},
					...new Array(102).fill(0).map(() => ({
						address: getRandomBytes(20),
						bftWeight: BigInt(1),
					})),
				]);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						header: {
							generatorAddress: getAddressFromPublicKey(defaultGenerator.publicKey),
							height: 515,
						},
					} as Block,
					'peer-id',
				);
				expect(isValid).toEqual(true);
			});

			it('should return true when the receivedBlock is not from consensus participant', async () => {
				blockExecutor.getCurrentValidators.mockResolvedValue([
					{
						address: getAddressFromPublicKey(defaultGenerator.publicKey),
						voteWeight: BigInt(0),
					},
				]);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						header: {
							generatorAddress: getAddressFromPublicKey(defaultGenerator.publicKey),
							height: 515,
						},
					} as Block,
					'peer-id',
				);
				expect(isValid).toEqual(false);
			});

			it('should return true when the receivedBlock is not current validator', async () => {
				blockExecutor.getCurrentValidators.mockResolvedValue([
					{ address: getRandomBytes(20), isConsensusParticipant: false },
				]);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						header: {
							generatorAddress: getAddressFromPublicKey(defaultGenerator.publicKey),
							height: 515,
						},
					} as Block,
					'peer-id',
				);
				expect(isValid).toEqual(false);
			});
		});

		describe('when receivedBlock is not within two rounds of the last block', () => {
			it('should return false even when the block is from consensus participant', async () => {
				blockExecutor.getCurrentValidators.mockResolvedValue([
					{
						address: getAddressFromPublicKey(defaultGenerator.publicKey),
						bftWeight: BigInt(1),
					},
				]);
				const isValid = await fastChainSwitchingMechanism.isValidFor(
					{
						header: {
							generatorAddress: getAddressFromPublicKey(defaultGenerator.publicKey),
							height: 619,
						},
					} as Block,
					'peer-id',
				);
				expect(isValid).toEqual(false);
			});
		});
	});

	describe('async run()', () => {
		const aPeerId = '127.0.0.1:5000';
		let aBlock: Block;

		beforeEach(async () => {
			finalizedBlock = await createValidDefaultBlock({
				header: { height: finalizedHeight },
			});

			aBlock = await createValidDefaultBlock();
			// chainModule.init will check whether the genesisBlock in storage matches the genesisBlock in
			// memory. The following mock fakes this to be true
			// chainModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
			// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
			lastBlock = await createValidDefaultBlock({
				header: { height: finalizedHeight + 1 },
			});

			jest.spyOn(blockExecutor, 'getCurrentValidators').mockResolvedValue([
				{
					address: aBlock.header.generatorAddress,
					bftWeight: BigInt(1),
				},
				...new Array(numberOfValidators - 1).fill(0).map(() => ({
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				})),
			]);

			chainModule._lastBlock = lastBlock;

			when(chainModule.dataAccess.getBlockHeaderByID)
				.calledWith(genesisBlock.header.id)
				.mockResolvedValue(genesisBlock.header as never);

			when(chainModule.dataAccess.getBlockHeaderByID)
				.calledWith(finalizedBlock.header.id)
				.mockResolvedValue(finalizedBlock.header as never);

			when(chainModule.dataAccess.getLastBlock)
				.calledWith()
				.mockResolvedValue(lastBlock as never);

			when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
				.calledWith(genesisBlock.header.height, lastBlock.header.height)
				.mockResolvedValue([genesisBlock, finalizedBlock, lastBlock] as never);

			when(chainModule.dataAccess.addBlockHeader)
				.calledWith(lastBlock)
				.mockResolvedValue([] as never);

			when(chainModule.dataAccess.getLastBlockHeader)
				.calledWith()
				.mockResolvedValue(lastBlock as never);

			when(chainModule.dataAccess.getBlockHeadersWithHeights)
				.calledWith([2, 1])
				.mockResolvedValue([genesisBlock.header, lastBlock.header] as never);

			// Simulate finalized height stored in ConsensusState table is 0

			jest.spyOn(fastChainSwitchingMechanism, '_queryBlocks' as never);
			jest.spyOn(fastChainSwitchingMechanism, '_switchChain' as never);
			jest.spyOn(fastChainSwitchingMechanism, '_validateBlocks' as never);
		});

		describe('when fail to request the common block', () => {
			it('should give up after trying 10 times, apply penalty and restart the mechanism', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				// Simulate peer not sending back a common block
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: Buffer.alloc(0) }),
					} as never);

				// Act
				await expect(fastChainSwitchingMechanism.run(aBlock, aPeerId)).rejects.toThrow(
					new Errors.ApplyPenaltyAndAbortError(aPeerId, "Peer didn't return a common block"),
				);

				// Assert
				expect(networkMock.requestFromPeer).toHaveBeenCalledTimes(9);
			});
		});

		describe('given that the highest common block is found', () => {
			it('should apply penalty to the peer and restart syncing mechanisms if the height of the common block is smaller than the finalized height', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				// height of the common block is smaller than the finalized height:
				const highestCommonBlock = createFakeBlockHeader({
					height: 0,
				});

				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				// Act
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected error
				}

				// Assert
				expect(fastChainSwitchingMechanism['_queryBlocks']).toHaveBeenCalledWith(
					aBlock,
					highestCommonBlock,
					aPeerId,
				);
			});

			it('should abort the syncing mechanism if the difference in height between the common block and the received block is > delegatesPerRound*2', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];
				// Common block between system and peer corresponds to last block in system (To make things easier)
				const highestCommonBlock = createFakeBlockHeader({
					height: chainModule.lastBlock.header.height,
				});
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				// Act
				// the difference in height between the common block and the received block is > delegatesPerRound*2
				const receivedBlock = await createValidDefaultBlock({
					header: {
						height: highestCommonBlock.height + numberOfValidators * 2 + 1,
					},
				});
				await expect(fastChainSwitchingMechanism.run(receivedBlock, aPeerId)).rejects.toThrow(
					new Errors.AbortError(
						`Height difference between both chains is higher than ${numberOfValidators * 2}`,
					),
				);

				// Assert
				expect(fastChainSwitchingMechanism['_queryBlocks']).toHaveBeenCalledWith(
					receivedBlock,
					highestCommonBlock,
					aPeerId,
				);
			});

			it('should abort the syncing mechanism if the difference in height between the common block and the last block is > delegatesPerRound*2', async () => {
				// Arrange
				const highestCommonBlock = createFakeBlockHeader({
					height: lastBlock.header.height + 1,
				});
				// Difference in height between the common block and the last block is > delegatesPerRound*2
				lastBlock = await createValidDefaultBlock({
					header: {
						height: highestCommonBlock.height + numberOfValidators * 2 + 1,
					},
				});
				when(chainModule.dataAccess.getBlockHeaderByHeight)
					.calledWith(1)
					.mockResolvedValue(genesisBlock.header as never);
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
					.mockResolvedValue([genesisBlock.header, lastBlock.header] as never);

				when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
					.calledWith(1, 205)
					.mockResolvedValue([lastBlock] as never);

				const heightList = new Array(
					Math.min(numberOfValidators * 2, chainModule.lastBlock.header.height),
				)
					.fill(0)
					.map((_, index) => chainModule.lastBlock.header.height - index);

				const storageReturnValue = heightList.map(height => createFakeBlockHeader({ height }));
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith(heightList)
					.mockResolvedValue(storageReturnValue as never);

				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);

				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				// Act
				const receivedBlock = await createValidDefaultBlock({
					header: {
						height: highestCommonBlock.height + numberOfValidators * 2 + 1,
					},
				});
				await expect(fastChainSwitchingMechanism.run(receivedBlock, aPeerId)).rejects.toThrow(
					new Errors.AbortError(
						`Height difference between both chains is higher than ${numberOfValidators * 2}`,
					),
				);

				// Assert
				expect(fastChainSwitchingMechanism['_queryBlocks']).toHaveBeenCalledWith(
					receivedBlock,
					highestCommonBlock,
					aPeerId,
				);
			});
		});

		describe('request and validate blocks', () => {
			it('should retry to request blocks for 10 times then apply penalty and restart', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{
						id: finalizedBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];

				const highestCommonBlock = createFakeBlockHeader({
					height: finalizedBlock.header.height,
				});

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never)
					.calledWith({
						procedure: 'getBlocksFromId',
						peerId: aPeerId,
						data: expect.anything(),
					})
					.mockRejectedValue(new Error('Invalid connection') as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				// Act
				await expect(fastChainSwitchingMechanism.run(aBlock, aPeerId)).rejects.toThrow(
					Errors.ApplyPenaltyAndAbortError,
				);
				// Assert
				// 10 times with getBlocksFromId and 1 time with getHighestCommonBlock
				expect(networkMock.requestFromPeer).toHaveBeenCalledTimes(11);
			});

			it('should request blocks within a range of IDs [commonBlock.id <-> receivedBlock.id] and validate them', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{
						id: finalizedBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];

				const highestCommonBlock = createFakeBlockHeader({
					height: finalizedBlock.header.height,
				});

				const requestedBlocks = [
					await createValidDefaultBlock({
						header: {
							height: highestCommonBlock.height + 1,
							previousBlockID: highestCommonBlock.id,
						},
					}),
					...(await Promise.all(new Array(34).fill(0).map(async () => createValidDefaultBlock()))),
					aBlock,
				];

				fastChainSwitchingMechanism['_requestBlocksWithinIDs'] = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);
				when(blockExecutor.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockImplementation(() => {
						chainModule._lastBlock = genesisBlock;
					});

				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue({
						header: highestCommonBlock,
						transactions: [],
					} as never);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert

				for (const block of requestedBlocks) {
					expect(blockExecutor.verify).toHaveBeenCalledWith(block);
					expect(loggerMock.trace).toHaveBeenCalledWith(
						{ blockId: block.header.id, height: block.header.height },
						'Validating block',
					);
				}

				expect(loggerMock.debug).toHaveBeenCalledWith('Successfully validated blocks');
				expect(fastChainSwitchingMechanism['_validateBlocks']).toHaveBeenCalledWith(
					requestedBlocks,
					aPeerId,
				);
			});

			it('should apply penalty and abort if any of the blocks fail to validate', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];
				const highestCommonBlock = createFakeBlockHeader({
					height: finalizedBlock.header.height,
				});

				const requestedBlocks = [
					await createValidDefaultBlock({
						header: {
							height: highestCommonBlock.height + 1,
							previousBlockID: highestCommonBlock.id,
						},
					}),
					...(await Promise.all(new Array(34).fill(0).map(async () => createValidDefaultBlock()))),
					aBlock,
				];

				fastChainSwitchingMechanism['_requestBlocksWithinIDs'] = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);
				blockExecutor.verify.mockImplementation(() => {
					throw new Error('validation error');
				});

				// Act
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected error
				}

				// Assert
				expect(fastChainSwitchingMechanism['_validateBlocks']).toHaveBeenCalledWith(
					requestedBlocks,
					aPeerId,
				);
			});
		});

		describe('switch to a different chain', () => {
			it('should switch to a different chain (apply list of blocks returned by the peer) and cleanup blocks temp table', async () => {
				// Arrange
				const storageReturnValue = [
					{
						id: genesisBlock.header.id,
					},
					{ id: finalizedBlock.header.id },
					{
						id: chainModule.lastBlock.header.id,
					},
				];
				const highestCommonBlock = createFakeBlockHeader({
					height: finalizedBlock.header.height,
				});
				const requestedBlocks = [
					await createValidDefaultBlock({
						header: {
							height: highestCommonBlock.height + 1,
							previousBlockID: highestCommonBlock.id,
						},
					}),
					...(await Promise.all(new Array(34).fill(0).map(async () => createValidDefaultBlock()))),
					aBlock,
				];

				fastChainSwitchingMechanism['_requestBlocksWithinIDs'] = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				when(blockExecutor.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockImplementation(() => {
						chainModule._lastBlock = genesisBlock;
					});
				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue({
						header: highestCommonBlock,
						transactions: [],
					} as never);

				// Act
				await fastChainSwitchingMechanism.run(aBlock, aPeerId);

				// Assert
				expect(fastChainSwitchingMechanism['_switchChain']).toHaveBeenCalledWith(
					highestCommonBlock,
					requestedBlocks,
					aPeerId,
				);
				expect(loggerMock.info).toHaveBeenCalledWith('Switching chain');
				expect(loggerMock.debug).toHaveBeenCalledWith(
					{ height: highestCommonBlock.height },
					`Deleting blocks after height ${highestCommonBlock.height}`,
				);

				expect(blockExecutor.deleteLastBlock).toHaveBeenCalledWith({
					saveTempBlock: true,
				});
				expect(blockExecutor.deleteLastBlock).toHaveBeenCalledTimes(1);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					{
						blocks: requestedBlocks.map(block => ({
							blockId: block.header.id,
							height: block.header.height,
						})),
					},
					'Applying blocks',
				);

				for (const block of requestedBlocks) {
					expect(loggerMock.trace).toHaveBeenCalledWith(
						{
							blockId: block.header.id,
							height: block.header.height,
						},
						'Applying blocks',
					);
					expect(blockExecutor.executeValidated).toHaveBeenCalledWith(block);
					expect(loggerMock.debug).toHaveBeenCalledWith('Cleaning blocks temp table');
					expect(chainModule.dataAccess.clearTempBlocks).toHaveBeenCalled();
					expect(loggerMock.info).toHaveBeenCalledWith(
						{
							currentHeight: chainModule.lastBlock.header.height,
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
						id: genesisBlock.header.id,
					},
					{
						id: finalizedBlock.header.id,
					},
					{
						id: chainModule.lastBlock.header.id,
					},
				];
				const highestCommonBlock = createFakeBlockHeader({
					height: finalizedBlock.header.height,
				});
				const requestedBlocks = [
					await createValidDefaultBlock({
						header: {
							height: highestCommonBlock.height + 1,
							previousBlockID: highestCommonBlock.id,
						},
					}),
					...(await Promise.all(new Array(34).fill(0).map(async () => createValidDefaultBlock()))),
					aBlock,
				];

				fastChainSwitchingMechanism['_requestBlocksWithinIDs'] = jest
					.fn()
					.mockResolvedValue(requestedBlocks);

				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
					ids: storageReturnValue.map(blocks => blocks.id),
				});
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getHighestCommonBlock',
						peerId: aPeerId,
						data: blockIds,
					})
					.mockResolvedValue({
						data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
					} as never);
				when(chainModule.dataAccess.getBlockHeaderByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				when(chainModule.dataAccess.getBlockHeadersWithHeights)
					.calledWith([2, 1])
					.mockResolvedValue(storageReturnValue as never);
				when(chainModule.dataAccess.getBlockByID)
					.calledWith(highestCommonBlock.id)
					.mockResolvedValue(highestCommonBlock as never);

				blockExecutor.deleteLastBlock.mockImplementation(async () => {
					chainModule._lastBlock = await createValidDefaultBlock({
						header: { height: chainModule._lastBlock.header.height - 1 },
					});
				});

				const blocksInTempTable = [chainModule.lastBlock];

				chainModule.dataAccess.getTempBlocks.mockResolvedValue(blocksInTempTable);

				const processingError = new Errors.BlockProcessingError();
				blockExecutor.executeValidated.mockRejectedValueOnce(processingError);

				// Act
				try {
					await fastChainSwitchingMechanism.run(aBlock, aPeerId);
				} catch (err) {
					// Expected error
				}

				// Assert
				expect(fastChainSwitchingMechanism['_switchChain']).toHaveBeenCalledWith(
					highestCommonBlock,
					requestedBlocks,
					aPeerId,
				);
				expect(blockExecutor.executeValidated).toHaveBeenCalled();
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
				expect(loggerMock.debug).toHaveBeenCalledWith('Restoring blocks from temporary table');
				expect(loggerMock.debug).toHaveBeenCalledWith('Cleaning blocks temp table');
				// Restore blocks from temp table:
				expect(blockExecutor.executeValidated).toHaveBeenCalledWith(blocksInTempTable[0], {
					removeFromTempTable: true,
				});
				// Clear temp table:
				expect(chainModule.dataAccess.clearTempBlocks).toHaveBeenCalled();
			});
		});
	});
});
