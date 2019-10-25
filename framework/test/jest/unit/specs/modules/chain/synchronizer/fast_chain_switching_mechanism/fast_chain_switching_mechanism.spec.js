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
	Synchronizer,
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
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../../../src/modules/chain/interface_adapters');
const { constants } = require('../../../../../../utils');
const { newBlock } = require('../../../chain/blocks/utils');
const synchronizerUtils = require('../../../../../../../../src/modules/chain/synchronizer/utils');

const genesisBlockDevnet = require('../../../../../../../fixtures/config/devnet/genesis_block');

const ChannelMock = jest.genMockFromModule(
	'../../../../../../../../src/controller/channels/in_memory_channel',
);

// describe.skip('fast_chain_switching_mechanism', () => {
// 	afterEach(async () => {
// 		jest.clearAllMocks();
// 	});
//
// 	describe('FastChainSwitchingMechanism', () => {
// 		const activeDelegates = 101;
// 		const channelMock = { invoke: jest.fn() };
//
// 		const lastBlockGetterMock = jest.fn();
// 		const blocksMock = {};
// 		Object.defineProperty(blocksMock, 'lastBlock', {
// 			get: lastBlockGetterMock,
// 		});
//
// 		const storageMock = {
// 			entities: {
// 				Block: {
// 					getLastBlock: jest.fn(),
// 				},
// 			},
// 		};
// 		const dposMock = {
// 			getForgerPublicKeysForRound: jest.fn().mockReturnValue([]),
// 		};
// 		const slotsMock = {
// 			getSlotNumber: jest.fn(),
// 			calcRound: jest.fn(),
// 		};
// 		const syncParams = {
// 			channel: channelMock,
// 			blocks: blocksMock,
// 			storage: storageMock,
// 			slots: slotsMock,
// 			dpos: dposMock,
// 			activeDelegates,
// 		};
//
// 		let syncMechanism;
//
// 		beforeEach(() => {
// 			syncMechanism = new FastChainSwitchingMechanism(syncParams);
// 		});
//
// 		describe('#constructor', () => {
// 			it('should create instance of FastChainSwitchingMechanism', async () => {
// 				expect(syncMechanism).toBeInstanceOf(FastChainSwitchingMechanism);
// 			});
//
// 			it('should assign dependencies', async () => {
// 				expect(syncMechanism.storage).toBe(syncParams.storage);
// 				expect(syncMechanism.logger).toBe(syncParams.logger);
// 				expect(syncMechanism.slots).toBe(syncParams.slots);
// 				expect(syncMechanism.blocks).toBe(syncParams.blocks);
// 				expect(syncMechanism.dpos).toBe(syncParams.dpos);
// 				expect(syncMechanism.constants).toEqual({
// 					activeDelegates,
// 				});
// 				expect(syncMechanism.active).toBeFalsy();
// 			});
// 		});
//
// 		describe('async isValidFor()', () => {
// 			const lastBlockHeight = 200;
// 			const finalizedBlockHeight = 100;
// 			const lastBlock = blockFixture({ height: lastBlockHeight });
// 			const finalizedBlock = blockFixture({ height: finalizedBlockHeight });
//
// 			beforeEach(async () => {
// 				lastBlockGetterMock.mockReturnValue(lastBlock);
// 			});
//
// 			it('should get the last block from blocks module', async () => {
// 				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
// 				await syncMechanism.isValidFor(receivedBlock);
//
// 				expect(lastBlockGetterMock).toHaveBeenCalledTimes(1);
// 			});
//
// 			it('should return false if gap between received block and last block is more than two rounds', async () => {
// 				const currentSlot = 500;
// 				const finalizedBlockSlot = 200; // Within three rounds
// 				const receivedBlockHeight = lastBlockHeight + 203; // Ahead more than 2 rounds
// 				const receivedBlock = blockFixture({ height: receivedBlockHeight });
// 				slotsMock.getSlotNumber.mockImplementation(timestamp => {
// 					if (timestamp === finalizedBlock.timestamp) {
// 						return finalizedBlockSlot;
// 					}
//
// 					return currentSlot;
// 				});
//
// 				const result = await syncMechanism.isValidFor(receivedBlock);
//
// 				expect(result).toBeFalsy();
// 				expect(slotsMock.calcRound).not.toHaveBeenCalled();
// 			});
//
// 			it('should return true if received block delegate is part of that round delegate list', async () => {
// 				const currentSlot = 500;
// 				const finalizedBlockSlot = 200; // Within three rounds
// 				const receivedBlockHeight = lastBlockHeight + 180; // Within two rounds
// 				const receivedBlock = blockFixture({ height: receivedBlockHeight });
// 				slotsMock.getSlotNumber.mockImplementation(timestamp => {
// 					if (timestamp === finalizedBlock.timestamp) {
// 						return finalizedBlockSlot;
// 					}
//
// 					return currentSlot;
// 				});
// 				dposMock.getForgerPublicKeysForRound.mockReturnValue([
// 					receivedBlock.generatorPublicKey,
// 				]);
//
// 				const result = await syncMechanism.isValidFor(receivedBlock);
//
// 				expect(result).toBeTruthy();
// 			});
//
// 			it('should return false if received block delegate is not part of that round delegate list', async () => {
// 				const currentSlot = 500;
// 				const finalizedBlockSlot = 200; // Within three rounds
// 				const receivedBlockHeight = lastBlockHeight + 180; // Within two rounds
// 				const receivedBlock = blockFixture({ height: receivedBlockHeight });
// 				slotsMock.getSlotNumber.mockImplementation(timestamp => {
// 					if (timestamp === finalizedBlock.timestamp) {
// 						return finalizedBlockSlot;
// 					}
//
// 					return currentSlot;
// 				});
// 				dposMock.getForgerPublicKeysForRound.mockReturnValue([]);
//
// 				const result = await syncMechanism.isValidFor(receivedBlock);
//
// 				expect(result).toBeFalsy();
// 			});
// 		});
// 	});
// });

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
		const aPeer = '127.0.0.1:5000';
		let aBlock;

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
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		function checkApplyPenaltyAndRestartIsCalled(
			receivedBlock,
			peerId,
			reason,
		) {
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
		}

		function checkIfAbortIsCalled(error) {
			expect(loggerMock.info).toHaveBeenCalledWith(
				{
					err: error,
					reason: error.reason,
				},
				`Aborting synchronization mechanism with reason: ${error.reason}`,
			);
		}

		describe('when requesting the highest common block', () => {
			beforeEach(async () => {
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

			it('should try to perform the request up to 10 times before giving up. If given up, it should apply a penalty to the peer and restart the mechanism', async () => {
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
				when(channelMock.invoke)
					.calledWith('network:requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId: aPeer,
						data: {
							ids: storageReturnValue.map(blocks => blocks.id),
						},
					})
					.mockResolvedValue({ data: undefined });

				await fastChainSwitchingMechanism.run(aBlock, aPeer);

				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(12); // 10 + 2 from beforeEach hooks
				expect(channelMock.invoke).toHaveBeenCalledTimes(10);
				checkApplyPenaltyAndRestartIsCalled(
					aBlock,
					aPeer,
					"Peer didn't return a common block or its height is lower than the finalized height of the chain",
				);
				expect(fastChainSwitchingMechanism.active).toBeFalsy();
			});

			describe('given that the highest common block is found', () => {
				it('should abort the syncing mechanism if the difference in height between the common block and the received block is > ACTIVE_DELEGATES*2 ', async () => {
					const storageReturnValue = [
						{
							id: genesisBlockDevnet.id,
						},
						{
							id: blocksModule.lastBlock.id,
						},
					];
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
							peerId: aPeer,
							data: {
								ids: storageReturnValue.map(blocks => blocks.id),
							},
						})
						.mockResolvedValue({ data: highestCommonBlock });

					await fastChainSwitchingMechanism.run(
						newBlock({ height: highestCommonBlock.height + 203 }),
						aPeer,
					);

					checkIfAbortIsCalled(
						new Errors.AbortError(
							`Height difference between both chains is higher than ${constants.ACTIVE_DELEGATES *
								2}`,
						),
					);
				});

				it.only('should abort the syncing mechanism if the difference in height between the common block and the last block is > ACTIVE_DELEGATES*2 ', async () => {
					// blocksModule.init will load the last block from storage and store it in ._lastBlock variable. The following mock
					// simulates the last block in storage. So the storage has 2 blocks, the genesis block + a new one.
					const highestCommonBlock = newBlock({
						height: 2,
					});
					const lastBlock = newBlock({
						height: highestCommonBlock.height + 203,
					});
					when(storageMock.entities.Block.get)
						.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
						.mockResolvedValue([lastBlock]);

					await blocksModule.init(); // Loads last block
					await bftModule.init();

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
							peerId: aPeer,
							data: {
								ids: storageReturnValue.map(blocks => blocks.id),
							},
						})
						.mockResolvedValue({ data: highestCommonBlock });

					await fastChainSwitchingMechanism.run(
						newBlock({ height: highestCommonBlock.height + 203 }),
						aPeer,
					);

					checkIfAbortIsCalled(
						new Errors.AbortError(
							`Height difference between both chains is higher than ${constants.ACTIVE_DELEGATES *
								2}`,
						),
					);
				});
			});
		});
	});
});
