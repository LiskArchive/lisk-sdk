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
import { Block, Chain, BlockHeader } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';

import { InMemoryKVStore } from '@liskhq/lisk-db';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import {
	BlockSynchronizationMechanism,
	Errors,
} from '../../../../../../src/node/consensus/synchronizer';
import { computeBlockHeightsList } from '../../../../../../src/node/consensus/synchronizer/utils';
import {
	genesisBlock as getGenesisBlock,
	createValidDefaultBlock,
	createFakeBlockHeader,
} from '../../../../../fixtures';

import { peersList } from './peers';
import {
	getHighestCommonBlockRequestSchema,
	getHighestCommonBlockResponseSchema,
	getBlocksFromIdRequestSchema,
	getBlocksFromIdResponseSchema,
} from '../../../../../../src/node/consensus/schema';

describe('block_synchronization_mechanism', () => {
	const genesisBlock = getGenesisBlock();
	const finalizedHeight = genesisBlock.header.height + 1;
	const numberOfValidators = 103;

	let chainModule: any;
	let blockExecutor: {
		validate: jest.Mock;
		verify: jest.Mock;
		executeValidated: jest.Mock;
		deleteLastBlock: jest.Mock;
		getFinalizedHeight: jest.Mock;
		getCurrentValidators: jest.Mock;
		getSlotNumber: jest.Mock;
	};
	let blockSynchronizationMechanism: BlockSynchronizationMechanism;
	let networkMock: any;

	let loggerMock: any;

	let aBlock: Block;
	let finalizedBlock: Block;
	let requestedBlocks: Block[];
	let highestCommonBlock: BlockHeader;
	let blockIdsList: Buffer[];
	let blockList: Block[];
	let dataAccessMock;

	beforeEach(async () => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};

		networkMock = {
			requestFromPeer: jest.fn(),
			getConnectedPeers: jest.fn(),
		};

		chainModule = new Chain({
			maxTransactionsSize: 15000,
			keepEventsForHeights: -1,
		});
		chainModule.init({
			db: new InMemoryKVStore(),
			networkIdentifier: Buffer.from('network-id'),
		});
		const lastBlock = await createValidDefaultBlock({
			header: { height: finalizedHeight + 1 },
		});
		chainModule['_lastBlock'] = lastBlock;

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
			getAccountsByPublicKey: jest.fn(),
			getLastBlockHeader: jest.fn(),
			resetBlockHeaderCache: jest.fn(),
		};
		chainModule.dataAccess = dataAccessMock;

		blockExecutor = {
			validate: jest.fn(),
			verify: jest.fn(),
			executeValidated: jest.fn().mockImplementation(block => {
				chainModule._lastBlock = block;
			}),
			deleteLastBlock: jest.fn(),
			getFinalizedHeight: jest.fn().mockReturnValue(finalizedHeight),
			getSlotNumber: jest.fn().mockImplementation(t => Math.floor(t / 10)),
			getCurrentValidators: jest.fn().mockResolvedValue(
				new Array(numberOfValidators).fill(0).map(() => ({
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				})),
			),
		};

		blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			logger: loggerMock,
			chain: chainModule,
			blockExecutor,
			network: networkMock,
		});
	});

	beforeEach(async () => {
		finalizedBlock = await createValidDefaultBlock({
			header: {
				height: finalizedHeight,
			},
		});

		aBlock = await createValidDefaultBlock({
			header: {
				height: 10,
				maxHeightPrevoted: 0,
				maxHeightGenerated: 0,
			},
		});
		// chainModule.init will check whether the genesisBlock in storage matches the genesisBlock in
		// memory. The following mock fakes this to be true
		when(chainModule.dataAccess.getBlockHeaderByID)
			.calledWith(genesisBlock.header.id)
			.mockResolvedValue(genesisBlock.header as never);

		when(chainModule.dataAccess.getBlockHeaderByID)
			.calledWith(finalizedBlock.header.id)
			.mockResolvedValue(finalizedBlock.header as never);

		when(chainModule.dataAccess.getAccountsByPublicKey)
			.calledWith()
			.mockResolvedValue([{ publicKey: 'aPublicKey' }] as never);
		// chainModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
		// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
		const lastBlock = await createValidDefaultBlock({
			header: { height: finalizedHeight + 1 },
		});
		chainModule['_lastBlock'] = lastBlock;

		when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
			.calledWith(genesisBlock.header.height, lastBlock.header.height)
			.mockResolvedValue([genesisBlock, finalizedBlock, lastBlock] as never);

		when(chainModule.dataAccess.getLastBlock)
			.calledWith()
			.mockResolvedValue(lastBlock as never);
		// Same thing but for BFT module,as it doesn't use extended flag set to true
		when(chainModule.dataAccess.getLastBlockHeader)
			.calledWith()
			.mockResolvedValue(lastBlock as never);
		// BFT loads blocks from storage and extracts their headers
		when(chainModule.dataAccess.getBlockHeadersWithHeights)
			.calledWith([genesisBlock.header.height, lastBlock.header.height])
			.mockResolvedValue([genesisBlock.header, lastBlock.header] as never);

		jest.spyOn(blockSynchronizationMechanism, '_requestAndValidateLastBlock' as never);
		jest.spyOn(blockSynchronizationMechanism, '_revertToLastCommonBlock' as never);
		jest.spyOn(blockSynchronizationMechanism, '_requestAndApplyBlocksToCurrentChain' as never);

		when(networkMock.getConnectedPeers)
			.calledWith()
			.mockReturnValue(peersList.connectedPeers as never);

		// Used in getHighestCommonBlock network action transactions
		const blockHeightsList = computeBlockHeightsList(
			finalizedHeight,
			numberOfValidators,
			10,
			Math.ceil(chainModule.lastBlock.header.height / numberOfValidators),
		);

		blockList = [finalizedBlock as any];
		blockIdsList = [blockList[0].header.id];

		highestCommonBlock = finalizedBlock.header;
		requestedBlocks = [
			...(await Promise.all(
				new Array(10).fill(0).map(async (_, index) =>
					createValidDefaultBlock({
						header: { height: highestCommonBlock.height + 1 + index },
					}),
				),
			)),
			aBlock,
		];

		for (const expectedPeer of peersList.expectedSelection) {
			const { peerId } = expectedPeer;
			const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
				ids: blockIdsList.map(id => id),
			});
			when(networkMock.requestFromPeer)
				.calledWith({
					procedure: 'getHighestCommonBlock',
					peerId,
					data: blockIds,
				})
				.mockResolvedValue({
					data: codec.encode(getHighestCommonBlockResponseSchema, { id: highestCommonBlock.id }),
				} as never);

			when(chainModule.dataAccess.getBlockHeaderByID)
				.calledWith(highestCommonBlock.id)
				.mockResolvedValue(highestCommonBlock as never);

			when(networkMock.requestFromPeer)
				.calledWith({
					procedure: 'getLastBlock',
					peerId,
				})
				.mockResolvedValue({
					data: aBlock.getBytes(),
				} as never);
			const encodedBlocks = requestedBlocks.map(block => block.getBytes());
			when(networkMock.requestFromPeer)
				.calledWith({
					procedure: 'getBlocksFromId',
					peerId,
					data: codec.encode(getBlocksFromIdRequestSchema, { blockId: highestCommonBlock.id }),
				})
				.mockResolvedValue({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
				} as never);
		}
		when(chainModule.dataAccess.getBlockHeadersWithHeights)
			.calledWith(blockHeightsList)
			.mockResolvedValueOnce(blockList.map(b => b.header) as never);

		when(blockExecutor.deleteLastBlock)
			.calledWith({
				saveTempBlock: true,
			})
			.mockImplementation(() => {
				chainModule._lastBlock = genesisBlock;
			});

		// eslint-disable-next-line require-atomic-updates
		chainModule._lastBlock = requestedBlocks[requestedBlocks.length - 1];
	});

	afterEach(() => {
		chainModule.resetBlockHeaderCache();
	});

	describe('async run()', () => {
		describe('compute the best peer', () => {
			it('should compute the best peer out of a list of connected peers and return it', async () => {
				const encodedBlocks = [aBlock.getBytes()];

				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getBlocksFromId',
						peerId: expect.any(String),
						data: codec.encode(getBlocksFromIdRequestSchema, { blockId: highestCommonBlock.id }),
					})
					.mockResolvedValue({
						data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
					} as never);

				await blockSynchronizationMechanism.run(aBlock);

				expect(loggerMock.trace).toHaveBeenCalledWith(
					{
						peers: peersList.connectedPeers.map(peer => peer.peerId),
					},
					'List of connected peers',
				);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Computing the best peer to synchronize from',
				);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					expect.objectContaining({
						peer: expect.any(Object),
					}),
					'Successfully computed the best peer',
				);

				expect(blockSynchronizationMechanism['_requestAndValidateLastBlock']).toHaveBeenCalledWith(
					expect.stringMatching(
						new RegExp(peersList.expectedSelection.map(peer => peer.peerId).join('|')),
					),
				);

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).toHaveBeenCalledWith(
					expect.stringMatching(
						new RegExp(peersList.expectedSelection.map(peer => peer.peerId).join('|')),
					),
				);
			});

			it('should throw an error if there are no compatible peers', async () => {
				// Arrange
				// If has one of these properties missing, it is considered an incompatible peer
				const requiredProps = ['blockVersion', 'maxHeightPrevoted', 'height'];

				for (const requiredProp of requiredProps) {
					when(networkMock.getConnectedPeers)
						.calledWith()
						.mockReturnValue(
							peersList.connectedPeers.map(peer => {
								const incompatiblePeer: any = objects.cloneDeep(peer);
								delete incompatiblePeer.options[requiredProp];
								return incompatiblePeer;
							}) as never,
						);

					// Act && Assert
					await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
						'Connected compatible peers list is empty',
					);
					expect(
						blockSynchronizationMechanism['_requestAndValidateLastBlock'],
					).not.toHaveBeenCalled();
					expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).not.toHaveBeenCalled();
				}
			});

			it('should throw an error if the list of connected peers is empty', async () => {
				// Arrange
				when(networkMock.getConnectedPeers)
					.calledWith()
					.mockReturnValue([] as never);

				// Act && Assert
				await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
					'List of connected peers is empty',
				);
				expect(
					blockSynchronizationMechanism['_requestAndValidateLastBlock'],
				).not.toHaveBeenCalled();
				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();
			});

			it('should throw an error if the peer tip does not have priority over current tip', async () => {
				when(networkMock.getConnectedPeers)
					.calledWith()
					.mockReturnValue([
						...peersList.expectedSelection.map(peer => ({
							...peer,
							options: {
								...peer.options,
								height: 0,
								maxHeightPrevoted: 0,
							},
						})),
					] as never);

				await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
					new Errors.AbortError('Peer tip does not have preference over current tip.'),
				);

				expect(
					blockSynchronizationMechanism['_requestAndValidateLastBlock'],
				).not.toHaveBeenCalled();
				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();
			});
		});

		describe('request and validate the last block of the peer', () => {
			it('should request and validate the last block of the peer and continue if block has priority (FORK_STATUS_DIFFERENT_CHAIN)', async () => {
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getBlocksFromId',
						peerId: expect.any(String),
						data: { blockId: expect.any(String) },
					})
					.mockResolvedValue({
						data: [aBlock.getBytes().toString('hex')],
					} as never);

				await blockSynchronizationMechanism.run(aBlock);

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).toHaveBeenCalled();
			});

			it('should request and validate the last block of the peer and continue if block is equal to the last block of the current chain', async () => {
				await blockSynchronizationMechanism.run(requestedBlocks[requestedBlocks.length - 1]);

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).toHaveBeenCalledWith(
					requestedBlocks[requestedBlocks.length - 1],
					highestCommonBlock,
					expect.any(String),
				);
			});

			it('should apply penalty and restart the mechanisms if the last block of the peer does not have preference over current tip', async () => {
				const receivedBlock = await createValidDefaultBlock({
					header: {
						height: 0,
					},
				});

				requestedBlocks = [
					...(await Promise.all(
						new Array(10).fill(0).map(async (_, index) =>
							createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 + index },
							}),
						),
					)),
					receivedBlock,
				];

				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getLastBlock',
							peerId,
						})
						.mockResolvedValue({
							data: receivedBlock.getBytes(),
						} as never);
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id,
							},
						})
						.mockResolvedValue({
							data: objects
								.cloneDeep(requestedBlocks)
								.reverse()
								.map(b => b.getBytes()),
						} as never);
				}

				await expect(blockSynchronizationMechanism.run(receivedBlock)).rejects.toThrow(
					Errors.ApplyPenaltyAndRestartError,
				);

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();
			});

			it('should apply penalty and restart the mechanism if the peer does not provide the last block', async () => {
				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getLastBlock',
							peerId,
						})
						.mockResolvedValue({
							data: undefined,
						} as never);
				}

				await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
					Errors.ApplyPenaltyAndRestartError,
				);

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();
			});
		});

		describe('request and revert to last common block from peer', () => {
			describe('request the highest common block', () => {
				it('should give up requesting the last common block after 3 tries, and then ban the peer and restart the mechanism', async () => {
					// Set last block to a high height
					const lastBlock = await createValidDefaultBlock({
						header: {
							height: genesisBlock.header.height + 2000,
						},
					});
					chainModule._lastBlock = lastBlock;
					// Used in getHighestCommonBlock network action transactions
					const blockHeightsList = computeBlockHeightsList(
						finalizedHeight,
						numberOfValidators,
						10,
						Math.ceil(lastBlock.header.height / numberOfValidators),
					);

					const receivedBlock = await createValidDefaultBlock({
						header: {
							height: lastBlock.header.height + 304,
						},
					});

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
							ids: blockIdsList.map(id => id),
						});
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getHighestCommonBlock',
								peerId,
								data: blockIds,
							})
							.mockResolvedValue({
								data: codec.encode(getHighestCommonBlockResponseSchema, { id: Buffer.alloc(0) }),
							} as never);

						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getLastBlock',
								peerId,
							})
							.mockResolvedValue({
								data: receivedBlock.getBytes(),
							} as never);
						const encodedBlocks = requestedBlocks.map(block => block.getBytes());
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: codec.encode(getBlocksFromIdRequestSchema, {
									blockId: highestCommonBlock.id,
								}),
							})
							.mockResolvedValue({
								data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
							} as never);
					}

					when(chainModule.dataAccess.getBlockHeadersWithHeights)
						.calledWith(blockHeightsList)
						.mockResolvedValue(blockList.map(b => b.header) as never);

					when(chainModule.dataAccess.getLastBlock)
						.calledWith()
						.mockResolvedValue(lastBlock as never);

					when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
						// If cache size initialization on chain changes this needs to be updated accordingly
						.calledWith(1496, 2001)
						.mockResolvedValue([] as never);

					// BFT loads blocks from storage and extracts their headers
					when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
						// If cache size initialization on chain changes this needs to be updated accordingly
						.calledWith(expect.any(Number), expect.any(Number))
						.mockResolvedValue([lastBlock] as never);

					await expect(blockSynchronizationMechanism.run(receivedBlock)).rejects.toThrow(
						Errors.ApplyPenaltyAndRestartError,
					);

					expect(networkMock.requestFromPeer).toHaveBeenCalledTimes(3);
					expect(networkMock.getConnectedPeers).toHaveBeenCalledTimes(1);

					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).not.toHaveBeenCalled();
				});

				it('should ban the peer and restart the mechanism if the common block height is smaller than the finalized height', async () => {
					// Used in getHighestCommonBlock network action transactions
					const blockHeightsList = computeBlockHeightsList(
						finalizedHeight,
						numberOfValidators,
						10,
						Math.ceil(chainModule.lastBlock.header.height / numberOfValidators),
					);

					blockList = [finalizedBlock];
					blockIdsList = [blockList[0].header.id];

					highestCommonBlock = createFakeBlockHeader({
						height: finalizedHeight - 1,
					}) as any; // height: 0
					requestedBlocks = [
						...(await Promise.all(
							new Array(10).fill(0).map(async (_, index) =>
								createValidDefaultBlock({
									header: { height: highestCommonBlock.height + 1 + index },
								}),
							),
						)),
						aBlock,
					];

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
							ids: blockIdsList.map(id => id),
						});
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getHighestCommonBlock',
								peerId,
								data: blockIds,
							})
							.mockResolvedValue({
								data: codec.encode(getHighestCommonBlockResponseSchema, {
									id: highestCommonBlock.id,
								}),
							} as never);
						when(chainModule.dataAccess.getBlockHeaderByID)
							.calledWith(highestCommonBlock.id)
							.mockResolvedValue(highestCommonBlock as never);

						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getLastBlock',
								peerId,
							})
							.mockResolvedValue({
								data: aBlock.getBytes(),
							} as never);
						const encodedBlocks = requestedBlocks.map(block => block.getBytes());
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: codec.encode(getBlocksFromIdRequestSchema, {
									blockId: highestCommonBlock.id,
								}),
							})
							.mockResolvedValue({
								data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
							} as never);
					}

					when(chainModule.dataAccess.getBlockHeadersWithHeights)
						.calledWith(blockHeightsList)
						.mockResolvedValueOnce(blockList.map(b => b.header) as never);

					chainModule._lastBlock = requestedBlocks[requestedBlocks.length - 1];

					await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
						Errors.ApplyPenaltyAndRestartError,
					);

					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).not.toHaveBeenCalled();
				});
			});

			describe('revert chain to highest common block', () => {
				it('should delete blocks after highest common block height and back them up to temp table', async () => {
					await blockSynchronizationMechanism.run(aBlock);

					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).toHaveBeenCalled();

					expect(blockExecutor.deleteLastBlock).toHaveBeenCalledTimes(1);
					expect(blockExecutor.deleteLastBlock).toHaveBeenCalledWith({
						saveTempBlock: true,
					});
					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).toHaveBeenCalledWith(aBlock, highestCommonBlock, expect.any(String));
				});
			});
		});

		describe('request and apply blocks to current chain', () => {
			it('should request blocks and apply them', async () => {
				requestedBlocks = [
					// From height 2 (highestCommonBlock.height + 1) to 9 (aBlock.height - 1)
					...(await Promise.all(
						new Array(8).fill(0).map(async (_, index) =>
							createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 + index },
							}),
						),
					)),
					aBlock,
					...(await Promise.all(
						new Array(10) // Extra blocks. They will be truncated
							.fill(0)
							.map(async (_, index) =>
								createValidDefaultBlock({
									header: { height: aBlock.header.height + 1 + index },
								}),
							),
					)),
				];

				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					const encodedBlocks = requestedBlocks.map(block => block.getBytes());

					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId,
							data: codec.encode(getBlocksFromIdRequestSchema, { blockId: highestCommonBlock.id }),
						})
						// getBlocksFromId returns in height desc order
						.mockResolvedValue({
							data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
						} as never);
				}

				await blockSynchronizationMechanism.run(aBlock);

				expect(networkMock.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getBlocksFromId',
					peerId: expect.any(String),
					data: codec.encode(getBlocksFromIdRequestSchema, { blockId: highestCommonBlock.id }),
				});

				expect(loggerMock.debug).toHaveBeenCalledWith(
					expect.objectContaining({
						fromId: requestedBlocks[0].header.id,
						toId: aBlock.header.id,
					}),
					'Applying obtained blocks from peer',
				);

				const blocksToApply = objects.cloneDeep(requestedBlocks);
				const blocksToNotApply = blocksToApply.splice(
					requestedBlocks.findIndex(block => block.header.id.equals(aBlock.header.id)) + 1,
				);

				expect(blockExecutor.validate).toHaveBeenCalledTimes(blocksToApply.length + 1);
				expect(blockExecutor.verify).toHaveBeenCalledTimes(blocksToApply.length);
				expect(blockExecutor.executeValidated).toHaveBeenCalledTimes(blocksToApply.length);
				for (const requestedBlock of blocksToApply) {
					expect(blockExecutor.verify).toHaveBeenCalledWith(requestedBlock);
					expect(blockExecutor.executeValidated).toHaveBeenCalledWith(requestedBlock);
				}

				for (const requestedBlock of blocksToNotApply) {
					expect(blockExecutor.verify).not.toHaveBeenCalledWith(requestedBlock);
					expect(blockExecutor.executeValidated).not.toHaveBeenCalledWith(requestedBlock);
				}
			});

			it('should give up after 10 times requesting blocks, ban the peer and restart the mechanism', async () => {
				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId,
							data: codec.encode(getBlocksFromIdRequestSchema, { blockId: highestCommonBlock.id }),
						})
						.mockResolvedValue({ data: undefined } as never);
				}
				await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
					Errors.ApplyPenaltyAndRestartError,
				);

				expect(networkMock.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getBlocksFromId',
					peerId: expect.any(String),
					data: codec.encode(getBlocksFromIdRequestSchema, { blockId: highestCommonBlock.id }),
				});

				expect(networkMock.requestFromPeer).toHaveBeenCalledTimes(12);
				expect(networkMock.getConnectedPeers).toHaveBeenCalledTimes(1);

				// Only called for last block validation
				expect(blockExecutor.validate).toHaveBeenCalledTimes(1);
				expect(blockExecutor.executeValidated).not.toHaveBeenCalled();
			});

			describe('when applying a block fails', () => {
				it('should restore blocks from temp table, ban peer and restart mechanism if new tip of the chain has no preference over previous tip', async () => {
					const previousTip = await createValidDefaultBlock({
						header: {
							height: genesisBlock.header.height + 140, // So it has preference over new tip (height <)
						},
					});

					requestedBlocks = [
						...(await Promise.all(
							new Array(10).fill(0).map(async (_, index) =>
								createValidDefaultBlock({
									header: { height: highestCommonBlock.height + 1 + index },
								}),
							),
						)),
						aBlock,
						...(await Promise.all(
							new Array(10).fill(0).map(async (_, index) =>
								createValidDefaultBlock({
									header: { height: aBlock.header.height + 1 + index },
								}),
							),
						)),
					];

					const tempTableBlocks = [
						previousTip,
						...(await Promise.all(
							new Array(previousTip.header.height - highestCommonBlock.height - 1)
								.fill(0)
								.map(async (_, index) =>
									createValidDefaultBlock({
										header: {
											height: previousTip.header.height - index - 1,
										},
									}),
								),
						)),
						{
							...(await createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 },
							})),
						},
					];

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('hex'),
								},
							})
							.mockResolvedValue({
								data: requestedBlocks.map(b => b.getBytes().toString('hex')),
							} as never);
					}

					chainModule.dataAccess.getTempBlocks
						.mockResolvedValueOnce([previousTip])
						.mockResolvedValueOnce(tempTableBlocks);

					when(blockExecutor.deleteLastBlock)
						.calledWith({
							saveTempBlock: false,
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 9 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 8 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 7 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 6 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 5 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 4 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 3 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 2 } });
						})
						.mockImplementationOnce(async () => {
							chainModule._lastBlock = await createValidDefaultBlock({ header: { height: 1 } });
						});

					const processingError = new Error('Error processing blocks');
					blockExecutor.executeValidated.mockRejectedValueOnce(processingError);

					await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
						Errors.ApplyPenaltyAndRestartError,
					);

					expect(loggerMock.error).toHaveBeenCalledWith(
						{ err: processingError },
						'Block processing failed',
					);

					expect(loggerMock.debug).toHaveBeenCalledWith(
						'Failed to apply obtained blocks from peer',
					);

					expect(loggerMock.debug).toHaveBeenCalledWith(
						{
							currentTip: expect.any(Buffer),
							previousTip: expect.anything(),
						},
						'Previous tip of the chain has preference over current tip. Restoring chain from temp table',
					);

					expect(loggerMock.debug).toHaveBeenCalledWith(
						{
							height: highestCommonBlock.height,
						},
						'Deleting blocks after height',
					);

					expect(loggerMock.debug).toHaveBeenCalledWith('Restoring blocks from temporary table');

					for (const tempTableBlock of tempTableBlocks) {
						expect(blockExecutor.executeValidated).toHaveBeenCalledWith(tempTableBlock, {
							removeFromTempTable: true,
						});
					}

					expect(loggerMock.debug).toHaveBeenCalledWith('Cleaning blocks temp table');
				});

				it('should clean up the temporary table and restart the mechanism if the new tip has preference over the last tip', async () => {
					const previousTip = await createValidDefaultBlock({
						header: {
							height: aBlock.header.height - 1, // So it doesn't have preference over new tip (height >)
							maxHeightPrevoted: 0,
							maxHeightGenerated: 0,
						},
					});

					requestedBlocks = [
						...(await Promise.all(
							new Array(10).fill(0).map(async (_, index) =>
								createValidDefaultBlock({
									header: { height: highestCommonBlock.height + 1 + index },
								}),
							),
						)),
						aBlock,
						...(await Promise.all(
							new Array(10).fill(0).map(async (_, index) =>
								createValidDefaultBlock({
									header: { height: aBlock.header.height + 1 + index },
								}),
							),
						)),
					];

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;

						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('hex'),
								},
							})
							.mockResolvedValue({
								data: [
									objects
										.cloneDeep(requestedBlocks)
										.reverse()
										.map(b => b.getBytes().toString('hex')),
								],
							} as never);
					}

					chainModule.dataAccess.getTempBlocks.mockResolvedValue([previousTip]);

					const processingError = new Error('Error processing blocks');
					blockExecutor.executeValidated.mockImplementation(block => {
						chainModule._lastBlock = block;
						if (block.header.height >= 10) {
							throw processingError;
						}
					});

					chainModule._lastBlock = aBlock;

					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId: expect.any(String),
							data: { blockId: expect.any(String) },
						})
						.mockResolvedValue({
							data: [aBlock.getBytes().toString('hex')],
						} as never);
					try {
						await blockSynchronizationMechanism.run(aBlock);
					} catch (err) {
						// Expected error
					}

					expect(loggerMock.error).toHaveBeenCalledWith(
						{ err: processingError },
						'Block processing failed',
					);

					expect(loggerMock.debug).toHaveBeenCalledWith(
						'Failed to apply obtained blocks from peer',
					);

					expect(loggerMock.debug).toHaveBeenNthCalledWith(
						14,
						{
							currentTip: expect.any(Buffer),
							previousTip: previousTip.header.id,
						},
						'Current tip of the chain has preference over previous tip',
					);

					expect(loggerMock.debug).toHaveBeenNthCalledWith(15, 'Cleaning blocks temporary table');

					expect(loggerMock.info).toHaveBeenCalledWith('Restarting block synchronization');
				});
			});
		});

		describe('computeBlockHeightsList', () => {
			it('should return height list for round 0', () => {
				expect(computeBlockHeightsList(0, 103, 10, 0)).not.toBeEmpty();
			});

			it('should return height list for given round', () => {
				const heightList = computeBlockHeightsList(
					finalizedHeight,
					numberOfValidators,
					10,
					Math.ceil(chainModule.lastBlock.header.height / numberOfValidators),
				);
				expect(heightList).not.toBeEmpty();
			});
		});
	});

	describe('isValidFor', () => {
		it('should return true if the difference in block slots between the current block slot and the finalized block slot of the system is bigger than delegatesPerRound*3', async () => {
			when(chainModule.dataAccess.getBlockHeaderByHeight)
				.calledWith(finalizedHeight)
				.mockResolvedValue(genesisBlock.header as never);
			const isValid = await blockSynchronizationMechanism.isValidFor();

			expect(isValid).toBeTruthy();
		});

		it('should return false if the difference in block slots between the current block slot and the finalized block slot of the system is smaller than delegatesPerRound*3', async () => {
			when(chainModule.dataAccess.getBlockHeaderByHeight)
				.calledWith(finalizedHeight)
				.mockResolvedValue(
					new BlockHeader({
						...genesisBlock.header['_getAllProps'](),
						timestamp: Math.floor(Date.now() / 1000),
					}) as never,
				);
			const isValid = await blockSynchronizationMechanism.isValidFor();

			expect(isValid).toBeFalsy();
		});
	});
});
