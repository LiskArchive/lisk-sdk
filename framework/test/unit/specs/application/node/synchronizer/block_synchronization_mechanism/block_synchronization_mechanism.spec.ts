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

import { cloneDeep } from 'lodash';
import { KVStore } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { Block, Chain, BlockHeader } from '@liskhq/lisk-chain';
import { BFT } from '@liskhq/lisk-bft';
import { Dpos } from '@liskhq/lisk-dpos';

import { BlockProcessorV2 } from '../../../../../../../src/application/node/block_processor_v2';
import { BlockSynchronizationMechanism } from '../../../../../../../src/application/node/synchronizer';
import { computeBlockHeightsList } from '../../../../../../../src/application/node/synchronizer/utils';

import { AbortError } from '../../../../../../../src/application/node/synchronizer/errors';
import { Processor } from '../../../../../../../src/application/node/processor';
import { constants } from '../../../../../../utils';
import { registeredTransactions } from '../../../../../../utils/registered_transactions';
import {
	defaultNetworkIdentifier,
	genesisBlock as getGenesisBlock,
	createValidDefaultBlock,
	encodeValidBlock,
	encodeValidBlockHeader,
	createFakeBlockHeader,
} from '../../../../../../fixtures';
import {
	accountAssetSchema,
	defaultAccountAsset,
} from '../../../../../../../src/application/node/account';

import { peersList } from './peers';
import { EVENT_SYNCHRONIZER_SYNC_REQUIRED } from '../../../../../../../src/application/node/synchronizer/base_synchronizer';

const { InMemoryChannel: ChannelMock } = jest.genMockFromModule(
	'../../../../../../../src/controller/channels/in_memory_channel',
);

jest.mock('@liskhq/lisk-db');

describe('block_synchronization_mechanism', () => {
	const genesisBlock = getGenesisBlock();

	let bftModule: any;
	let blockProcessorV2;
	let chainModule: any;
	let dposModule: any;
	let processorModule: any;
	let blockSynchronizationMechanism: BlockSynchronizationMechanism;

	let channelMock: any;
	let loggerMock: any;

	let aBlock: Block;
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
		const forgerDB = new KVStore('forger.db');

		chainModule = new Chain({
			networkIdentifier: defaultNetworkIdentifier,
			db: blockchainDB,
			genesisBlock,
			registeredTransactions,
			registeredBlocks: { 2: BlockProcessorV2.schema },
			accountAsset: {
				schema: accountAssetSchema,
				default: defaultAccountAsset,
			},
			maxPayloadLength: constants.maxPayloadLength,
			rewardDistance: constants.rewards.distance,
			rewardOffset: constants.rewards.offset,
			rewardMilestones: constants.rewards.milestones,
			totalAmount: constants.totalAmount,
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
			getAccountsByPublicKey: jest.fn(),
			getLastBlockHeader: jest.fn(),
			resetBlockHeaderCache: jest.fn(),
			decode: chainModule.dataAccess.decode.bind(chainModule.dataAccess),
			decodeBlockHeader: chainModule.dataAccess.decodeBlockHeader.bind(
				chainModule.dataAccess,
			),
			encodeBlockHeader: chainModule.dataAccess.encodeBlockHeader.bind(
				chainModule.dataAccess,
			),
			decodeTransaction: chainModule.dataAccess.decodeTransaction.bind(
				chainModule.dataAccess,
			),
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
			forgerDB,
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

		blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			logger: loggerMock,
			channel: channelMock,
			chain: chainModule,
			bft: bftModule,
			dpos: dposModule,
			processorModule,
		});
	});

	beforeEach(async () => {
		aBlock = createValidDefaultBlock({
			header: { height: 10, asset: { maxHeightPrevoted: 0 } },
		});
		// chainModule.init will check whether the genesisBlock in storage matches the genesisBlock in
		// memory. The following mock fakes this to be true
		when(chainModule.dataAccess.getBlockHeaderByHeight)
			.calledWith(1)
			.mockResolvedValue(genesisBlock.header as never);
		when(chainModule.dataAccess.getAccountsByPublicKey)
			.calledWith()
			.mockResolvedValue([{ publicKey: 'aPublicKey' }] as never);
		// chainModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
		// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
		const lastBlock = createValidDefaultBlock({
			header: { height: genesisBlock.header.height + 1 },
		});
		when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
			.calledWith(1, 2)
			.mockResolvedValue([lastBlock] as never);
		when(chainModule.dataAccess.getBlockHeaderByHeight)
			.calledWith(1)
			.mockResolvedValue(genesisBlock.header as never);
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

		jest.spyOn(
			blockSynchronizationMechanism,
			'_requestAndValidateLastBlock' as never,
		);
		jest.spyOn(
			blockSynchronizationMechanism,
			'_revertToLastCommonBlock' as never,
		);
		jest.spyOn(
			blockSynchronizationMechanism,
			'_requestAndApplyBlocksToCurrentChain' as never,
		);
		jest.spyOn(blockSynchronizationMechanism.events, 'emit');

		when(channelMock.invoke)
			.calledWith('app:getConnectedPeers')
			.mockResolvedValue(peersList.connectedPeers as never);

		await chainModule.init();

		// Used in getHighestCommonBlock network action payload
		const blockHeightsList = computeBlockHeightsList(
			bftModule.finalizedHeight,
			dposModule.delegatesPerRound,
			10,
			dposModule.rounds.calcRound(chainModule.lastBlock.header.height),
		);

		blockList = [genesisBlock as any];
		blockIdsList = [blockList[0].header.id];

		highestCommonBlock = genesisBlock.header;
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
			when(channelMock.invokeFromNetwork)
				.calledWith('requestFromPeer', {
					procedure: 'getHighestCommonBlock',
					peerId,
					data: {
						ids: blockIdsList.map(id => id.toString('base64')),
					},
				})
				.mockResolvedValue({
					data: encodeValidBlockHeader(highestCommonBlock).toString('base64'),
				} as never);

			when(channelMock.invokeFromNetwork)
				.calledWith('requestFromPeer', {
					procedure: 'getLastBlock',
					peerId,
				})
				.mockResolvedValue({
					data: encodeValidBlock(aBlock).toString('base64'),
				} as never);
			when(channelMock.invokeFromNetwork)
				.calledWith('requestFromPeer', {
					procedure: 'getBlocksFromId',
					peerId,
					data: {
						blockId: highestCommonBlock.id.toString('base64'),
					},
				})
				.mockResolvedValue({
					data: cloneDeep(requestedBlocks)
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
			.mockResolvedValueOnce(genesisBlock as never);

		// eslint-disable-next-line require-atomic-updates
		chainModule._lastBlock = requestedBlocks[requestedBlocks.length - 1];
	});

	afterEach(() => {
		chainModule.resetBlockHeaderCache();
	});

	describe('async run()', () => {
		const expectApplyPenaltyAndRestartIsCalled = (
			receivedBlock: Block,
			reason: string,
		) => {
			expect(loggerMock.info).toHaveBeenCalledWith(
				expect.objectContaining({
					peerId: expect.any(String),
					reason,
				}),
				'Applying penalty to peer and restarting synchronizer',
			);
			expect(channelMock.invoke).toHaveBeenCalledWith(
				'app:applyPenaltyOnPeer',
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

				expect(
					blockSynchronizationMechanism['_requestAndValidateLastBlock'],
				).toHaveBeenCalledWith(
					expect.stringMatching(
						new RegExp(
							peersList.expectedSelection.map(peer => peer.peerId).join('|'),
						),
					),
				);

				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).toHaveBeenCalledWith(
					expect.stringMatching(
						new RegExp(
							peersList.expectedSelection.map(peer => peer.peerId).join('|'),
						),
					),
				);
			});

			it('should throw an error if there are no compatible peers', async () => {
				// Arrange
				// If has one of these properties missing, it is considered an incompatible peer
				const requiredProps = ['blockVersion', 'maxHeightPrevoted', 'height'];

				for (const requiredProp of requiredProps) {
					when(channelMock.invoke)
						.calledWith('app:getConnectedPeers')
						.mockResolvedValueOnce(
							peersList.connectedPeers.map(peer => {
								const incompatiblePeer: any = cloneDeep(peer);
								delete incompatiblePeer[requiredProp];
								return incompatiblePeer;
							}) as never,
						);

					// Act && Assert
					await expect(
						blockSynchronizationMechanism.run(aBlock),
					).rejects.toThrow('Connected compatible peers list is empty');
					expect(
						blockSynchronizationMechanism['_requestAndValidateLastBlock'],
					).not.toHaveBeenCalled();
					expect(
						blockSynchronizationMechanism['_revertToLastCommonBlock'],
					).not.toHaveBeenCalled();
					expect(
						blockSynchronizationMechanism[
							'_requestAndApplyBlocksToCurrentChain'
						],
					).not.toHaveBeenCalled();
				}
			});

			it('should throw an error if the list of connected peers is empty', async () => {
				// Arrange
				when(channelMock.invoke)
					.calledWith('app:getConnectedPeers')
					.mockResolvedValueOnce([] as never);

				// Act && Assert
				await expect(blockSynchronizationMechanism.run(aBlock)).rejects.toThrow(
					'List of connected peers is empty',
				);
				expect(
					blockSynchronizationMechanism['_requestAndValidateLastBlock'],
				).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();
			});

			it('should throw an error if the peer tip does not have priority over current tip', async () => {
				when(channelMock.invoke)
					.calledWith('app:getConnectedPeers')
					.mockResolvedValueOnce([
						...peersList.expectedSelection.map(peer => ({
							...peer,
							height: 0,
							maxHeightPrevoted: 0,
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
						reason:
							'Peer tip does not have preference over current tip. Fork status: 6',
					},
					'Aborting synchronization mechanism',
				);
				expect(
					blockSynchronizationMechanism['_requestAndValidateLastBlock'],
				).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();
			});
		});

		describe('request and validate the last block of the peer', () => {
			it('should request and validate the last block of the peer and continue if block has priority (FORK_STATUS_DIFFERENT_CHAIN)', async () => {
				await blockSynchronizationMechanism.run(aBlock);

				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).toHaveBeenCalled();
			});

			it('should request and validate the last block of the peer and continue if block is equal to the last block of the current chain', async () => {
				await blockSynchronizationMechanism.run(
					requestedBlocks[requestedBlocks.length - 1],
				);

				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).toHaveBeenCalled();
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
						asset: { maxHeightPrevoted: 0 },
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
					when(channelMock.invokeFromNetwork)
						.calledWith('requestFromPeer', {
							procedure: 'getLastBlock',
							peerId,
						})
						.mockResolvedValue({
							data: encodeValidBlock(receivedBlock).toString('base64'),
						} as never);
					when(channelMock.invokeFromNetwork)
						.calledWith('requestFromPeer', {
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id.toString('base64'),
							},
						})
						.mockResolvedValue({
							data: cloneDeep(requestedBlocks)
								.reverse()
								.map(b => encodeValidBlock(b).toString('base64')),
						} as never);
				}

				try {
					await blockSynchronizationMechanism.run(receivedBlock);
				} catch (err) {
					// Expected error
				}

				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).not.toHaveBeenCalled();
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
					when(channelMock.invokeFromNetwork)
						.calledWith('requestFromPeer', {
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

				expect(
					blockSynchronizationMechanism['_revertToLastCommonBlock'],
				).not.toHaveBeenCalled();
				expect(
					blockSynchronizationMechanism['_requestAndApplyBlocksToCurrentChain'],
				).not.toHaveBeenCalled();

				expectApplyPenaltyAndRestartIsCalled(
					aBlock,
					'Peer did not provide its last block',
				);
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
						dposModule.delegatesPerRound,
						10,
						dposModule.rounds.calcRound(lastBlock.header.height),
					);

					const receivedBlock = createValidDefaultBlock({
						header: {
							height: lastBlock.header.height + 304,
							reward: chainModule.blockReward.calculateReward(
								lastBlock.header.height + 304,
							),
						},
					});

					for (const expectedPeer of peersList.expectedSelection) {
						const { peerId } = expectedPeer;
						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getHighestCommonBlock',
								peerId,
								data: {
									ids: blockIdsList.map(id => id.toString('base64')),
								},
							})
							.mockResolvedValue({ data: undefined } as never);

						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getLastBlock',
								peerId,
							})
							.mockResolvedValue({
								data: encodeValidBlock(receivedBlock).toString('base64'),
							} as never);
						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: cloneDeep(requestedBlocks)
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

					try {
						await blockSynchronizationMechanism.run(receivedBlock);
					} catch (err) {
						// Expected error
					}

					expect(channelMock.invokeFromNetwork).toHaveBeenCalledTimes(3);
					expect(channelMock.invoke).toHaveBeenCalledTimes(2);

					expect(
						blockSynchronizationMechanism[
							'_requestAndApplyBlocksToCurrentChain'
						],
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
						dposModule.delegatesPerRound,
						10,
						dposModule.rounds.calcRound(chainModule.lastBlock.header.height),
					);

					blockList = [genesisBlock];
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
						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getHighestCommonBlock',
								peerId,
								data: {
									ids: blockIdsList.map(id => id.toString('base64')),
								},
							})
							.mockResolvedValue({
								data: encodeValidBlockHeader(highestCommonBlock).toString(
									'base64',
								),
							} as never);

						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getLastBlock',
								peerId,
							})
							.mockResolvedValue({
								data: encodeValidBlock(aBlock).toString('base64'),
							} as never);
						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: requestedBlocks.map(b =>
									encodeValidBlock(b).toString('base64'),
								),
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
						blockSynchronizationMechanism[
							'_requestAndApplyBlocksToCurrentChain'
						],
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
						blockSynchronizationMechanism[
							'_requestAndApplyBlocksToCurrentChain'
						],
					).toHaveBeenCalled();

					expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(1);
					expect(processorModule.deleteLastBlock).toHaveBeenCalledWith({
						saveTempBlock: true,
					});
					expect(
						blockSynchronizationMechanism[
							'_requestAndApplyBlocksToCurrentChain'
						],
					).toHaveBeenCalledWith(
						aBlock,
						highestCommonBlock,
						expect.any(String),
					);
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
					when(channelMock.invokeFromNetwork)
						.calledWith('requestFromPeer', {
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id.toString('base64'),
							},
						})
						// getBlocksFromId returns in height desc order
						.mockResolvedValue({
							data: cloneDeep(requestedBlocks)
								.reverse()
								.map(b => encodeValidBlock(b).toString('base64')),
						} as never);
				}

				await blockSynchronizationMechanism.run(aBlock);

				expect(channelMock.invokeFromNetwork).toHaveBeenCalledWith(
					'requestFromPeer',
					{
						procedure: 'getBlocksFromId',
						peerId: expect.any(String),
						data: {
							blockId: highestCommonBlock.id.toString('base64'),
						},
					},
				);

				expect(loggerMock.debug).toHaveBeenCalledWith(
					expect.objectContaining({
						fromId: requestedBlocks[0].header.id,
						toId: aBlock.header.id,
					}),
					'Applying obtained blocks from peer',
				);

				const blocksToApply = cloneDeep(requestedBlocks);
				const blocksToNotApply = blocksToApply.splice(
					requestedBlocks.findIndex(block =>
						block.header.id.equals(aBlock.header.id),
					) + 1,
				);

				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksToApply.length,
				);
				for (const requestedBlock of blocksToApply) {
					expect(processorModule.processValidated).toHaveBeenCalledWith(
						requestedBlock,
					);
				}

				for (const requestedBlock of blocksToNotApply) {
					expect(processorModule.processValidated).not.toHaveBeenCalledWith(
						requestedBlock,
					);
				}
			});

			it('should give up after 10 times requesting blocks, ban the peer and restart the mechanism', async () => {
				for (const expectedPeer of peersList.expectedSelection) {
					const { peerId } = expectedPeer;
					when(channelMock.invokeFromNetwork)
						.calledWith('requestFromPeer', {
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

				expect(channelMock.invokeFromNetwork).toHaveBeenCalledWith(
					'requestFromPeer',
					{
						procedure: 'getBlocksFromId',
						peerId: expect.any(String),
						data: {
							blockId: highestCommonBlock.id.toString('base64'),
						},
					},
				);

				expect(channelMock.invokeFromNetwork).toHaveBeenCalledTimes(12);
				expect(channelMock.invoke).toHaveBeenCalledTimes(2);

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
							asset: { maxHeightPrevoted: 0 },
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
						...new Array(
							previousTip.header.height - highestCommonBlock.height - 1,
						)
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
						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id.toString('base64'),
								},
							})
							.mockResolvedValue({
								data: requestedBlocks.map(b =>
									encodeValidBlock(b).toString('base64'),
								),
							} as never);
					}

					chainModule.dataAccess.getTempBlocks
						.mockResolvedValueOnce([previousTip])
						.mockResolvedValueOnce(tempTableBlocks);

					when(processorModule.deleteLastBlock)
						.calledWith({
							saveTempBlock: false,
						})
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 9 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 8 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 7 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 6 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 5 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 4 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 3 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 2 } }) as never,
						)
						.mockResolvedValueOnce(
							createValidDefaultBlock({ header: { height: 1 } }) as never,
						);

					const processingError = new Error('Error processing blocks');
					processorModule.processValidated.mockRejectedValueOnce(
						processingError,
					);

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
							currentTip: chainModule.lastBlock.header.id,
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

					expect(loggerMock.debug).toHaveBeenCalledWith(
						'Restoring blocks from temporary table',
					);

					for (const tempTableBlock of tempTableBlocks) {
						expect(processorModule.processValidated).toHaveBeenCalledWith(
							tempTableBlock,
							{
								removeFromTempTable: true,
							},
						);
					}

					expect(loggerMock.debug).toHaveBeenCalledWith(
						'Cleaning blocks temp table',
					);

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

						when(channelMock.invokeFromNetwork)
							.calledWith('requestFromPeer', {
								procedure: 'getBlocksFromId',
								peerId,
								data: {
									blockId: highestCommonBlock.id,
								},
							})
							.mockResolvedValue({
								data: cloneDeep(requestedBlocks).reverse(),
							} as never);
					}

					chainModule.dataAccess.getTempBlocks.mockResolvedValue([previousTip]);

					const processingError = new Error('Error processing blocks');
					processorModule.processValidated.mockRejectedValueOnce(
						processingError,
					);

					chainModule._lastBlock = aBlock;

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
							currentTip: chainModule.lastBlock.header.id,
							previousTip: previousTip.header.id,
						},
						'Current tip of the chain has preference over previous tip',
					);

					expect(loggerMock.debug).toHaveBeenNthCalledWith(
						15,
						'Cleaning blocks temporary table',
					);

					expect(loggerMock.info).toHaveBeenCalledWith(
						'Restarting block synchronization',
					);

					expectRestartIsCalled(aBlock as any);
				});
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
