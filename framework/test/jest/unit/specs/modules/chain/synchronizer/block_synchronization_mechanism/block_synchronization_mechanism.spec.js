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
	BlockSynchronizationMechanism,
	Errors,
} = require('../../../../../../../../src/modules/chain/synchronizer');
const {
	computeBlockHeightsList,
} = require('../../../../../../../../src/modules/chain/synchronizer/utils');

const { Slots } = require('../../../../../../../../src/modules/chain/dpos');
const {
	Sequence,
} = require('../../../../../../../../src/modules/chain/utils/sequence');
const {
	Processor,
} = require('../../../../../../../../src/modules/chain/processor');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../../../src/modules/chain/interface_adapters');
const { constants } = require('../../../../../../utils');
const { newBlock } = require('../../../chain/blocks/utils');

const genesisBlockDevnet = require('../../../../../../../fixtures/config/devnet/genesis_block');
const peersList = require('./peers');

const PEER_STATE_CONNECTED = 2;

const ChannelMock = jest.genMockFromModule(
	'../../../../../../../../src/controller/channels/in_memory_channel',
);

describe('block_synchronization_mechanism', () => {
	let bftModule;
	let blockProcessorV2;
	let blocksModule;
	let processorModule;
	let blockSynchronizationMechanism;
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
			interfaceAdapters: {
				transactions: new TransactionInterfaceAdapter(),
			},
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

		blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			storage: storageMock,
			logger: loggerMock,
			channel: channelMock,
			slots,
			interfaceAdapters: {
				transactions: new TransactionInterfaceAdapter(),
			},
			blocks: blocksModule,
			bft: bftModule,
			processorModule,
			activeDelegates: constants.ACTIVE_DELEGATES,
		});
	});

	describe('async run()', () => {
		const aPeer = '127.0.0.1:5000';
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
			await blocksModule.init();
			await bftModule.init();
		});

		afterEach(() => {
			jest.clearAllMocks();
			// Independently of the correct execution of the mechanisms, `active` property should be always
			// set to false upon finishing the execution
			expect(blockSynchronizationMechanism.active).toBeFalsy();
		});

		describe('compute the best peer', () => {
			it('should compute the best peer out of a list of connected peers and return it', async () => {
				when(channelMock.invoke)
					.calledWith('network:getPeers', {
						state: PEER_STATE_CONNECTED,
					})
					.mockResolvedValueOnce(peersList.connectedPeers);
				jest.spyOn(
					blockSynchronizationMechanism,
					'_requestAndValidateLastBlock',
				);

				// Used in getHighestCommonBlock network action payload
				const blockHeightsList = computeBlockHeightsList(
					bftModule.finalizedHeight,
					constants.ACTIVE_DELEGATES,
					10,
					slots.calcRound(blocksModule.lastBlock.height),
				);

				const blockList = [genesisBlockDevnet];
				const blockIdsList = [blockList[0].id];

				const highestCommonBlock = genesisBlockDevnet;

				const requestedBlocks = [
					...new Array(10)
						.fill(0)
						.map((_, index) =>
							newBlock({ height: highestCommonBlock.height + 1 + index }),
						),
					aBlock,
				];

				for (const expectedPeer of peersList.expectedSelection) {
					const peerId = `${expectedPeer.ip}:${expectedPeer.wsPort}`;
					when(channelMock.invoke)
						.calledWith('network:requestFromPeer', {
							procedure: 'getHighestCommonBlock',
							peerId,
							data: {
								ids: blockIdsList,
							},
						})
						.mockResolvedValue({
							data: highestCommonBlock,
						});

					when(channelMock.invoke)
						.calledWith('network:requestFromPeer', {
							procedure: 'getLastBlock',
							peerId,
						})
						.mockResolvedValue({
							data: newBlock({
								height: expectedPeer.height,
								prevotedConfirmedUptoHeight:
									expectedPeer.prevotedConfirmedUptoHeight,
							}),
						});
					when(channelMock.invoke)
						.calledWith('network:requestFromPeer', {
							procedure: 'getBlocksFromId',
							peerId,
							data: {
								blockId: highestCommonBlock.id,
							},
						})
						.mockResolvedValue({ data: requestedBlocks });
				}

				when(storageMock.entities.Block.get)
					.calledWith(
						{
							height_in: blockHeightsList,
						},
						{
							sort: 'height:asc',
						},
					)
					.mockResolvedValueOnce(blockList);

				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: true,
					})
					.mockResolvedValueOnce(genesisBlockDevnet);

				await blockSynchronizationMechanism.run(aBlock);

				expect(loggerMock.trace).toHaveBeenCalledWith(
					{
						peers: peersList.map(peer => `${peer.ip}:${peer.wsPort}`),
					},
					'List of connected peers',
				);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Computing the best peer to synchronize from',
				);
				expect(loggerMock.debug).toHaveBeenCalledWith(
					'Successfully computed the best peer',
				);
				expect(
					blockSynchronizationMechanism._requestAndApplyBlocksWithinIDs.calls[0].every(
						peer => peersList.expectedSelection.includes(peer),
					),
				).toBeTruthy();
			});

			it('should throw an error if there are no compatible peers', () => {});

			it('should throw an error if the list of connected peers is empty', () => {});

			it('should throw an error if the peer tip does not have priority over current tip', () => {});
		});

		describe('request and validate the last block of the peer', () => {
			it('should request and validate the last block of the peer', () => {});

			it('should apply penalty and restart the mechanisms if the last block of the peer does not have preference over current tip', () => {});
		});

		describe('request and revert to last common block from peer', () => {
			describe('request the highest common block', () => {
				it('should give up requesting the last common block after 10 tries, and then ban the peer and restart the mechanism', () => {});

				it('should ban the peer and restart the mechanism if the common block height is smaller than the finalized height', () => {});
			});

			describe('revert chain to highest common block ', () => {
				it('should delete blocks after highest common block height and back them up to temp table', () => {});
			});

			it('should return the common block', () => {});
		});

		describe('request and apply blocks to current chain', () => {
			describe('when blocks are not fully applied', () => {
				it('should delete blocks after common block, restore blocks from temp table and clean it if the tip of the temp blocks chain has preference over current tip (FORK_STATUS_DIFFERENT_CHAIN)', () => {});

				it('should ban the peer and restart the mechanism if the tip of temp table has no preference the tip of current chain ', () => {});
			});
		});
	});
});
