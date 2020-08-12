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

import { KVStore } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { Block, Chain, BlockHeader } from '@liskhq/lisk-chain';
import { BFT, ForkStatus } from '@liskhq/lisk-bft';
import { objects } from '@liskhq/lisk-utils';

import { BlockSynchronizationMechanism } from '../../../../../../../src/application/node/synchronizer';
import { computeBlockHeightsList } from '../../../../../../../src/application/node/synchronizer/utils';

import { AbortError } from '../../../../../../../src/application/node/synchronizer/errors';
import { Processor } from '../../../../../../../src/application/node/processor';
import { constants } from '../../../../../../utils';
import {
	defaultNetworkIdentifier,
	genesisBlock as getGenesisBlock,
	createValidDefaultBlock,
	encodeValidBlock,
	encodeValidBlockHeader,
	createFakeBlockHeader,
	defaultAccountSchema,
} from '../../../../../../fixtures';

import { peersList } from './peers';
import { EVENT_SYNCHRONIZER_SYNC_REQUIRED } from '../../../../../../../src/application/node/synchronizer/base_synchronizer';
import { TokenModule } from '../../../../../../../src/modules';

const { InMemoryChannel: ChannelMock } = jest.genMockFromModule(
	'../../../../../../../src/controller/channels/in_memory_channel',
);

jest.mock('@liskhq/lisk-db');

describe('block_synchronization_mechanism', () => {
	const genesisBlock = getGenesisBlock();
	const finalizedHeight = genesisBlock.header.height + 1;

	let bftModule: any;
	let chainModule: any;
	let processorModule: any;
	let blockSynchronizationMechanism: BlockSynchronizationMechanism;
	let networkMock: any;

	let channelMock: any;
	let loggerMock: any;

	let aBlock: Block;
	let finalizedBlock: Block;
	let requestedBlocks: Block[];
	let highestCommonBlock: BlockHeader;
	let blockIdsList: Buffer[];
	let blockList: Block[];
	let dataAccessMock;

	beforeEach(() => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};

		channelMock = new ChannelMock();

		const blockchainDB = new KVStore('blockchain.db');

		networkMock = {
			requestFromPeer: jest.fn(),
			applyPenaltyOnPeer: jest.fn(),
			getConnectedPeers: jest.fn(),
		};

		chainModule = new Chain({
			networkIdentifier: defaultNetworkIdentifier,
			db: blockchainDB,
			genesisBlock,
			accounts: defaultAccountSchema,
			maxPayloadLength: constants.maxPayloadLength,
			rewardDistance: constants.rewards.distance,
			rewardOffset: constants.rewards.offset,
			rewardMilestones: constants.rewards.milestones,
			blockTime: constants.blockTime,
		});
		chainModule['_numberOfValidators'] = 103;

		dataAccessMock = {
			getConsensusState: jest.fn(),
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
			decode: chainModule.dataAccess.decode.bind(chainModule.dataAccess),
			decodeBlockHeader: chainModule.dataAccess.decodeBlockHeader.bind(chainModule.dataAccess),
			encodeBlockHeader: chainModule.dataAccess.encodeBlockHeader.bind(chainModule.dataAccess),
			decodeTransaction: chainModule.dataAccess.decodeTransaction.bind(chainModule.dataAccess),
		};
		chainModule.dataAccess = dataAccessMock;

		bftModule = new BFT({
			chain: chainModule,
			threshold: constants.bftThreshold,
			genesisHeight: genesisBlock.header.height,
		});

		Object.defineProperty(bftModule, 'finalizedHeight', {
			get: jest.fn(() => finalizedHeight),
		});

		processorModule = new Processor({
			channel: channelMock,
			chainModule,
			logger: loggerMock,
			bftModule,
		});
		processorModule.processValidated = jest.fn().mockImplementation(block => {
			chainModule._lastBlock = block;
		});
		processorModule.validate = jest.fn();
		processorModule.deleteLastBlock = jest.fn();
		processorModule.register(new TokenModule(constants));

		blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			logger: loggerMock,
			channel: channelMock,
			chain: chainModule,
			bft: bftModule,
			processorModule,
			networkModule: networkMock,
		});
	});

	beforeEach(async () => {
		finalizedBlock = createValidDefaultBlock({
			header: {
				height: finalizedHeight,
				asset: { maxHeightPrevoted: 0, maxHeightPreviouslyForged: 0, seedReveal: Buffer.alloc(0) },
			},
		});

		aBlock = createValidDefaultBlock({
			header: {
				height: 10,
				asset: { maxHeightPrevoted: 0, maxHeightPreviouslyForged: 0, seedReveal: Buffer.alloc(0) },
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
		const lastBlock = createValidDefaultBlock({
			header: { height: finalizedHeight + 1 },
		});

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
		jest.spyOn(blockSynchronizationMechanism.events, 'emit');

		when(networkMock.getConnectedPeers)
			.calledWith()
			.mockReturnValue(peersList.connectedPeers as never);

		await chainModule.init();
		chainModule['_numberOfValidators'] = 103;

		// Used in getHighestCommonBlock network action payload
		const blockHeightsList = computeBlockHeightsList(
			bftModule.finalizedHeight,
			chainModule.numberOfValidators,
			10,
			Math.ceil(chainModule.lastBlock.header.height / chainModule.numberOfValidators),
		);

		blockList = [finalizedBlock as any];
		blockIdsList = [blockList[0].header.id];

		highestCommonBlock = finalizedBlock.header;
		requestedBlocks = [
			...new Array(10).fill(0).map((_, index) =>
				createValidDefaultBlock({
					header: { height: highestCommonBlock.height + 1 + index },
				}),
			),
			aBlock,
		];

		for (const expectedPeer of peersList.expectedSelection) {
			const { peerId } = expectedPeer;
			when(networkMock.requestFromPeer)
				.calledWith({
					procedure: 'getHighestCommonBlock',
					peerId,
					data: {
						ids: blockIdsList.map(id => id.toString('base64')),
					},
				})
				.mockResolvedValue({
					data: encodeValidBlockHeader(highestCommonBlock).toString('base64'),
				} as never);

			when(networkMock.requestFromPeer)
				.calledWith({
					procedure: 'getLastBlock',
					peerId,
				})
				.mockResolvedValue({
					data: encodeValidBlock(aBlock).toString('base64'),
				} as never);
			when(networkMock.requestFromPeer)
				.calledWith({
					procedure: 'getBlocksFromId',
					peerId,
					data: {
						blockId: highestCommonBlock.id.toString('base64'),
					},
				})
				.mockResolvedValue({
					data: objects
						.cloneDeep(requestedBlocks)
						.reverse()
						.map(b => encodeValidBlock(b).toString('base64')),
				} as never);
		}
		when(chainModule.dataAccess.getBlockHeadersWithHeights)
			.calledWith(blockHeightsList)
			.mockResolvedValueOnce(blockList.map(b => b.header) as never);

		when(processorModule.deleteLastBlock)
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
		const expectApplyPenaltyAndRestartIsCalled = (receivedBlock: Block, reason: string) => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				expect.objectContaining({
					peerId: expect.any(String),
					reason,
				}),
				'Applying penalty to peer and restarting synchronizer',
			);
			expect(networkMock.applyPenaltyOnPeer).toHaveBeenCalledWith(
				expect.objectContaining({
					peerId: expect.any(String),
					penalty: 100,
				}),
			);
			expect(blockSynchronizationMechanism.events.emit).toHaveBeenCalledWith(
				EVENT_SYNCHRONIZER_SYNC_REQUIRED,
				{
					block: receivedBlock,
					peerId: expect.any(String),
				},
			);
		};

		const expectRestartIsCalled = (receivedBlock: Block) => {
			expect(blockSynchronizationMechanism.events.emit).toHaveBeenCalledWith(
				EVENT_SYNCHRONIZER_SYNC_REQUIRED,
				{
					block: receivedBlock,
				},
			);
		};

		afterEach(() => {
			// Independently of the correct execution of the mechanisms, `active` property should be always
			// set to false upon finishing the execution
			// eslint-disable-next-line jest/no-standalone-expect
			expect(blockSynchronizationMechanism.active).toBeFalsy();
		});

		describe('compute the best peer', () => {
			it('should compute the best peer out of a list of connected peers and return it', async () => {
				jest.spyOn(bftModule, 'forkChoice');
				when(networkMock.requestFromPeer)
					.calledWith({
						procedure: 'getBlocksFromId',
						peerId: expect.any(String),
						data: { blockId: expect.any(String) },
					})
					.mockResolvedValue({
						data: [encodeValidBlock(aBlock).toString('base64')],
					} as never);

				await blockSynchronizationMechanism.run(aBlock);

				expect(loggerMock.trace).toHaveBeenCalledWith(
					{
						peers: peersList.connectedPeers.map(peer => peer.peerId),
					},
					'List of connected peers',
				);
				expect(bftModule.forkChoice).toHaveBeenCalledWith(
					{
						id: Buffer.alloc(0),
						previousBlockID: Buffer.alloc(0),
						version: 2,
						height: expect.any(Number),
						asset: {
							maxHeightPrevoted: expect.any(Number),
						},
					},
					chainModule.lastBlock.header,
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

				try {
					await blockSynchronizationMechanism.run(aBlock);
				} catch (err) {
					// Expected error
				}

				expect(loggerMock.info).toHaveBeenCalledWith(
					{
						error: new AbortError(
							'Peer tip does not have preference over current tip. Fork status: 6',
						),
						reason: 'Peer tip does not have preference over current tip. Fork status: 6',
					},
					'Aborting synchronization mechanism',
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
						data: [encodeValidBlock(aBlock).toString('base64')],
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
				const receivedBlock = createValidDefaultBlock({
					header: {
						height: 0,
						asset: {
							maxHeightPrevoted: 0,
							seedReveal: Buffer.alloc(0),
							maxHeightPreviouslyForged: 0,
						},
					},
				});

				requestedBlocks = [
					...new Array(10).fill(0).map((_, index) =>
						createValidDefaultBlock({
							header: { height: highestCommonBlock.height + 1 + index },
						}),
					),
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
							data: encodeValidBlock(receivedBlock).toString('base64'),
						} as never);
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id.toString('base64'),
							},
						})
						.mockResolvedValue({
							data: objects
								.cloneDeep(requestedBlocks)
								.reverse()
								.map(b => encodeValidBlock(b).toString('base64')),
						} as never);
				}

				try {
					await blockSynchronizationMechanism.run(receivedBlock);
				} catch (err) {
					// Expected error
				}

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();

				expectApplyPenaltyAndRestartIsCalled(
					receivedBlock,
					'The tip of the chain of the peer is not valid or is not in a different chain',
				);
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

				try {
					await blockSynchronizationMechanism.run(aBlock);
				} catch (err) {
					// Expected error
				}

				expect(blockSynchronizationMechanism['_revertToLastCommonBlock']).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();

				expectApplyPenaltyAndRestartIsCalled(aBlock, 'Peer did not provide its last block');
			});
		});

		describe('request and revert to last common block from peer', () => {
			describe('request the highest common block', () => {
				it('should give up requesting the last common block after 3 tries, and then ban the peer and restart the mechanism', async () => {
					// Set last block to a high height
					const lastBlock = createValidDefaultBlock({
						header: {
							height: genesisBlock.header.height + 2000,
						},
					});
					// Used in getHighestCommonBlock network action payload
					const blockHeightsList = computeBlockHeightsList(
						bftModule.finalizedHeight,
						chainModule.numberOfValidators,
						10,
						Math.ceil(lastBlock.header.height / chainModule.numberOfValidators),
					);

					const receivedBlock = createValidDefaultBlock({
						header: {
							height: lastBlock.header.height + 304,
							reward: chainModule.calculateReward(lastBlock.header.height + 304),
						},
					});

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getHighestCommonBlock',
								peerId,
								data: {
									ids: blockIdsList.map(id => id.toString('base64')),
								},
							})
							.mockResolvedValue({ data: undefined } as never);

						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getLastBlock',
								peerId,
							})
							.mockResolvedValue({
								data: encodeValidBlock(receivedBlock).toString('base64'),
							} as never);
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: objects
									.cloneDeep(requestedBlocks)
									.reverse()
									.map(b => encodeValidBlock(b).toString('base64')),
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

					await chainModule.init();
					chainModule['_numberOfValidators'] = 103;

					try {
						await blockSynchronizationMechanism.run(receivedBlock);
					} catch (err) {
						// Expected error
					}

					expect(networkMock.requestFromPeer).toHaveBeenCalledTimes(3);
					expect(networkMock.getConnectedPeers).toHaveBeenCalledTimes(1);
					expect(networkMock.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);

					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).not.toHaveBeenCalled();

					expectApplyPenaltyAndRestartIsCalled(
						receivedBlock,
						'No common block has been found between the chain and the targeted peer',
					);
				});

				it('should ban the peer and restart the mechanism if the common block height is smaller than the finalized height', async () => {
					// Used in getHighestCommonBlock network action payload
					const blockHeightsList = computeBlockHeightsList(
						bftModule.finalizedHeight,
						chainModule.numberOfValidators,
						10,
						Math.ceil(chainModule.lastBlock.header.height / chainModule.numberOfValidators),
					);

					blockList = [finalizedBlock];
					blockIdsList = [blockList[0].header.id];

					highestCommonBlock = createFakeBlockHeader({
						height: bftModule.finalizedHeight - 1,
					}) as any; // height: 0
					requestedBlocks = [
						...new Array(10).fill(0).map((_, index) =>
							createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 + index },
							}),
						),
						aBlock,
					];

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getHighestCommonBlock',
								peerId,
								data: {
									ids: blockIdsList.map(id => id.toString('base64')),
								},
							})
							.mockResolvedValue({
								data: encodeValidBlockHeader(highestCommonBlock).toString('base64'),
							} as never);

						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getLastBlock',
								peerId,
							})
							.mockResolvedValue({
								data: encodeValidBlock(aBlock).toString('base64'),
							} as never);
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: requestedBlocks.map(b => encodeValidBlock(b).toString('base64')),
							} as never);
					}

					when(chainModule.dataAccess.getBlockHeadersWithHeights)
						.calledWith(blockHeightsList)
						.mockResolvedValueOnce(blockList.map(b => b.header) as never);

					chainModule._lastBlock = requestedBlocks[requestedBlocks.length - 1];

					try {
						await blockSynchronizationMechanism.run(aBlock);
					} catch (err) {
						// Expected error
					}

					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).not.toHaveBeenCalled();

					expectApplyPenaltyAndRestartIsCalled(
						aBlock,
						'The last common block height is less than the finalized height of the current chain',
					);
				});
			});

			describe('revert chain to highest common block ', () => {
				it('should delete blocks after highest common block height and back them up to temp table', async () => {
					await blockSynchronizationMechanism.run(aBlock);

					expect(
						blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
					).toHaveBeenCalled();

					expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(1);
					expect(processorModule.deleteLastBlock).toHaveBeenCalledWith({
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
					...new Array(8).fill(0).map((_, index) =>
						createValidDefaultBlock({
							header: { height: highestCommonBlock.height + 1 + index },
						}),
					),
					aBlock,
					...new Array(10) // Extra blocks. They will be truncated
						.fill(0)
						.map((_, index) =>
							createValidDefaultBlock({
								header: { height: aBlock.header.height + 1 + index },
							}),
						),
				];

				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id.toString('base64'),
							},
						})
						// getBlocksFromId returns in height desc order
						.mockResolvedValue({
							data: objects
								.cloneDeep(requestedBlocks)
								.reverse()
								.map(b => encodeValidBlock(b).toString('base64')),
						} as never);
				}

				await blockSynchronizationMechanism.run(aBlock);

				expect(networkMock.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getBlocksFromId',
					peerId: expect.any(String),
					data: {
						blockId: highestCommonBlock.id.toString('base64'),
					},
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

				expect(processorModule.processValidated).toHaveBeenCalledTimes(blocksToApply.length);
				for (const requestedBlock of blocksToApply) {
					expect(processorModule.processValidated).toHaveBeenCalledWith(requestedBlock);
				}

				for (const requestedBlock of blocksToNotApply) {
					expect(processorModule.processValidated).not.toHaveBeenCalledWith(requestedBlock);
				}
			});

			it('should give up after 10 times requesting blocks, ban the peer and restart the mechanism', async () => {
				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id.toString('base64'),
							},
						})
						.mockResolvedValue({ data: undefined } as never);
				}
				try {
					await blockSynchronizationMechanism.run(aBlock);
				} catch (err) {
					// Expected error
				}

				expect(networkMock.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getBlocksFromId',
					peerId: expect.any(String),
					data: {
						blockId: highestCommonBlock.id.toString('base64'),
					},
				});

				expect(networkMock.requestFromPeer).toHaveBeenCalledTimes(12);
				expect(networkMock.getConnectedPeers).toHaveBeenCalledTimes(1);
				expect(networkMock.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);

				expect(processorModule.processValidated).not.toHaveBeenCalled();

				expectApplyPenaltyAndRestartIsCalled(
					aBlock,
					"Peer didn't return any block after requesting blocks",
				);
			});

			describe('when applying a block fails', () => {
				it('should restore blocks from temp table, ban peer and restart mechanism if new tip of the chain has no preference over previous tip', async () => {
					const previousTip = createValidDefaultBlock({
						header: {
							height: genesisBlock.header.height + 140, // So it has preference over new tip (height <)
							asset: {
								maxHeightPrevoted: 0,
								seedReveal: Buffer.alloc(0),
								maxHeightPreviouslyForged: 0,
							},
						},
					});

					requestedBlocks = [
						...new Array(10).fill(0).map((_, index) =>
							createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 + index },
							}),
						),
						aBlock,
						...new Array(10).fill(0).map((_, index) =>
							createValidDefaultBlock({
								header: { height: aBlock.header.height + 1 + index },
							}),
						),
					];

					const tempTableBlocks = [
						previousTip,
						...new Array(previousTip.header.height - highestCommonBlock.height - 1)
							.fill(0)
							.map((_, index) =>
								createValidDefaultBlock({
									header: {
										height: previousTip.header.height - index - 1,
									},
								}),
							),
						{
							...createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 },
							}),
						},
					];

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: requestedBlocks.map(b => encodeValidBlock(b).toString('base64')),
							} as never);
					}

					chainModule.dataAccess.getTempBlocks
						.mockResolvedValueOnce([previousTip])
						.mockResolvedValueOnce(tempTableBlocks);

					when(processorModule.deleteLastBlock)
						.calledWith({
							saveTempBlock: false,
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 9 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 8 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 7 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 6 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 5 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 4 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 3 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 2 } });
						})
						.mockImplementationOnce(() => {
							chainModule._lastBlock = createValidDefaultBlock({ header: { height: 1 } });
						});

					const processingError = new Error('Error processing blocks');
					processorModule.processValidated.mockRejectedValueOnce(processingError);

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
						expect(processorModule.processValidated).toHaveBeenCalledWith(tempTableBlock, {
							removeFromTempTable: true,
						});
					}

					expect(loggerMock.debug).toHaveBeenCalledWith('Cleaning blocks temp table');

					expectApplyPenaltyAndRestartIsCalled(
						aBlock,
						'New tip of the chain has no preference over the previous tip before synchronizing',
					);
				});

				it('should clean up the temporary table and restart the mechanism if the new tip has preference over the last tip', async () => {
					const previousTip = createValidDefaultBlock({
						header: {
							height: aBlock.header.height - 1, // So it doesn't have preference over new tip (height >)
							asset: {
								maxHeightPrevoted: aBlock.header.asset.maxHeightPrevoted,
								seedReveal: Buffer.alloc(0),
								maxHeightPreviouslyForged: 0,
							},
						},
					});

					requestedBlocks = [
						...new Array(10).fill(0).map((_, index) =>
							createValidDefaultBlock({
								header: { height: highestCommonBlock.height + 1 + index },
							}),
						),
						aBlock,
						...new Array(10).fill(0).map((_, index) =>
							createValidDefaultBlock({
								header: { height: aBlock.header.height + 1 + index },
							}),
						),
					];

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;

						when(networkMock.requestFromPeer)
							.calledWith({
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: [
									objects
										.cloneDeep(requestedBlocks)
										.reverse()
										.map(b => encodeValidBlock(b).toString('base64')),
								],
							} as never);
					}

					chainModule.dataAccess.getTempBlocks.mockResolvedValue([previousTip]);

					const processingError = new Error('Error processing blocks');
					processorModule.processValidated.mockRejectedValueOnce(processingError);
					jest.spyOn(bftModule, 'forkChoice').mockReturnValue(ForkStatus.DIFFERENT_CHAIN);

					chainModule._lastBlock = aBlock;

					when(networkMock.requestFromPeer)
						.calledWith({
							procedure: 'getBlocksFromId',
							peerId: expect.any(String),
							data: { blockId: expect.any(String) },
						})
						.mockResolvedValue({
							data: [encodeValidBlock(aBlock).toString('base64')],
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

					expectRestartIsCalled(aBlock as any);
				});
			});
		});

		describe('computeBlockHeightsList', () => {
			it('should return height list for round 0', () => {
				expect(computeBlockHeightsList(0, 103, 10, 0)).not.toBeEmpty();
			});

			it('should return height list for given round', () => {
				const heightList = computeBlockHeightsList(
					bftModule.finalizedHeight,
					chainModule.numberOfValidators,
					10,
					Math.ceil(chainModule.lastBlock.header.height / chainModule.numberOfValidators),
				);
				expect(heightList).not.toBeEmpty();
			});
		});
	});

	describe('isValidFor', () => {
		it('should return true if the difference in block slots between the current block slot and the finalized block slot of the system is bigger than delegatesPerRound*3', async () => {
			when(chainModule.dataAccess.getBlockHeaderByHeight)
				.calledWith(bftModule.finalizedHeight)
				.mockResolvedValue(genesisBlock.header as never);
			const isValid = await blockSynchronizationMechanism.isValidFor();

			expect(isValid).toBeTruthy();
		});

		it('should return false if the difference in block slots between the current block slot and the finalized block slot of the system is smaller than delegatesPerRound*3', async () => {
			when(chainModule.dataAccess.getBlockHeaderByHeight)
				.calledWith(bftModule.finalizedHeight)
				.mockResolvedValue({
					...genesisBlock.header,
					timestamp: Date.now(),
				} as never);
			const isValid = await blockSynchronizationMechanism.isValidFor();

			expect(isValid).toBeFalsy();
		});
	});
});
