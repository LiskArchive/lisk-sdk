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

const { when } = require('jest-when');
const {
	Synchronizer,
} = require('../../../../../../../src/modules/chain/synchronizer/synchronizer');
const {
	Processor,
} = require('../../../../../../../src/modules/chain/processor');
const {
	BlockProcessorV2,
} = require('../../../../../../../src/modules/chain/block_processor_v2');
const { Blocks } = require('../../../../../../../src/modules/chain/blocks');
const { BFT } = require('../../../../../../../src/modules/chain/bft');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const { constants } = require('../../../../../utils');
const { newBlock } = require('../../chain/blocks/utils');
const {
	Sequence,
} = require('../../../../../../../src/modules/chain/utils/sequence');
const genesisBlockDevnet = require('../../../../../../fixtures/config/devnet/genesis_block');
const synchronizerUtils = require('../../../../../../../src/modules/chain/synchronizer/utils');

const ChannelMock = jest.genMockFromModule(
	'../../../../../../../src/controller/channels/in_memory_channel',
);

describe('Synchronizer', () => {
	let bftModule;
	let blockProcessorV2;
	let blocksModule;
	let processorModule;
	let synchronizer;
	let syncMechanism1;
	let syncMechanism2;
	let slots;

	let channelMock;
	let dposModuleMock;
	let exceptions;
	let loggerMock;
	let storageMock;
	let syncParameters;

	beforeEach(async () => {
		jest.spyOn(synchronizerUtils, 'restoreBlocksUponStartup');
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

		syncParameters = {
			logger: loggerMock,
			processorModule,
			blocksModule,
			storageModule: storageMock,
		};
		syncMechanism1 = {
			isActive: false,
			run: jest.fn().mockResolvedValue({}),
			isValidFor: jest.fn().mockResolvedValue(false),
		};
		syncMechanism2 = {
			isActive: false,
			run: jest.fn().mockResolvedValue({}),
			isValidFor: jest.fn().mockResolvedValue(false),
		};

		synchronizer = new Synchronizer(syncParameters);
		synchronizer.register(syncMechanism1);
		synchronizer.register(syncMechanism2);
	});

	describe('init()', () => {
		beforeEach(() => {
			when(storageMock.entities.Block.begin)
				.calledWith('loader:checkMemTables')
				.mockResolvedValue({ genesisBlock: genesisBlockDevnet });
			when(storageMock.entities.Account.get)
				.calledWith({ isDelegate: true }, { limit: null })
				.mockResolvedValue([{ publicKey: 'aPublicKey' }]);
		});

		describe('given that the blocks temporary table is not empty', () => {
			beforeEach(() => {
				storageMock.entities.TempBlock.isEmpty.mockResolvedValue(false);
				// To make storage genesisBlock and config genesisBlock match
			});

			it('should restore blocks from blocks temporary table into blocks table if tip of temp table chain has preference over current tip (FORK_STATUS_DIFFERENT_CHAIN)', async () => {
				// Arrange
				const blocksTempTableEntries = new Array(10)
					.fill(0)
					.map((_, index) => ({
						height: index,
						id: `${index}`,
						fullBlock: { height: index, id: index, version: 2 },
					}))
					.slice(genesisBlockDevnet.height + 2);
				const initialLastBlock = {
					height: genesisBlockDevnet.height + 3,
					id: 'anId',
					previousBlockId: genesisBlockDevnet.id,
					version: 1,
				};

				storageMock.entities.TempBlock.get.mockResolvedValue(
					blocksTempTableEntries,
				);
				// To load storage tip block into lastBlock in memory variable
				when(storageMock.entities.Block.get)
					.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
					.mockResolvedValue([initialLastBlock]);
				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: false,
					})
					.mockResolvedValueOnce({ height: initialLastBlock.height - 1 })
					.mockResolvedValueOnce({ height: initialLastBlock.height - 2 });
				await blocksModule.init();

				// Act
				await synchronizer.init();

				// Assert
				expect(loggerMock.info).nthCalledWith(
					1,
					'Restoring blocks from temporary table',
				);
				expect(loggerMock.info).nthCalledWith(2, 'Chain successfully restored');
				expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
				expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(2);
				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksTempTableEntries.length,
				);

				// Assert whether temp blocks are being restored to main table
				for (let i = 0; i < blocksTempTableEntries.length; i += 1) {
					const tempBlock = blocksTempTableEntries[i].fullBlock;
					expect(processorModule.processValidated).nthCalledWith(
						i + 1,
						await processorModule.deserialize(tempBlock),
						{
							removeFromTempTable: true,
						},
					);
				}
			});

			it('should restore blocks from blocks temporary table into blocks table if tip of temp table chain has preference over current tip (FORK_STATUS_VALID_BLOCK)', async () => {
				// Arrange
				const initialLastBlock = {
					height: genesisBlockDevnet.height + 1,
					id: 'anId',
					previousBlockId: genesisBlockDevnet.id,
					version: 1,
				};
				const blocksTempTableEntries = [
					{
						height: genesisBlockDevnet.height + 2,
						id: '3',
						fullBlock: {
							height: genesisBlockDevnet.height + 2,
							id: '3',
							version: 2,
							previousBlock: initialLastBlock.id,
						},
					},
				];
				storageMock.entities.TempBlock.get.mockResolvedValue(
					blocksTempTableEntries,
				);

				// To load storage tip block into lastBlock in memory variable
				when(storageMock.entities.Block.get)
					.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
					.mockResolvedValue([initialLastBlock]);
				await blocksModule.init();

				// Act
				await synchronizer.init();

				// Assert
				expect(loggerMock.info).nthCalledWith(
					1,
					'Restoring blocks from temporary table',
				);
				expect(loggerMock.info).nthCalledWith(2, 'Chain successfully restored');
				expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksTempTableEntries.length,
				);

				// Assert whether temp blocks are being restored to main table
				for (let i = 0; i < blocksTempTableEntries.length; i += 1) {
					const tempBlock = blocksTempTableEntries[i].fullBlock;
					expect(processorModule.processValidated).nthCalledWith(
						i + 1,
						await processorModule.deserialize(tempBlock),
						{
							removeFromTempTable: true,
						},
					);
				}
			});

			it('should clear the blocks temp table if the tip of the temp table doesnt have priority over current tip (Any other Fork Choice code', async () => {
				// Arrange
				const initialLastBlock = {
					height: genesisBlockDevnet.height + 1,
					id: 'anId',
					previousBlockId: genesisBlockDevnet.id,
					version: 2,
				};
				const blocksTempTableEntries = [
					{
						...initialLastBlock,
						fullBlock: initialLastBlock,
					},
				];
				storageMock.entities.TempBlock.get.mockResolvedValue(
					blocksTempTableEntries,
				);

				// To load storage tip block into lastBlock in memory variable
				when(storageMock.entities.Block.get)
					.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
					.mockResolvedValue([initialLastBlock]);
				await blocksModule.init();

				// Act
				await synchronizer.init();

				// Assert
				expect(processorModule.processValidated).not.toHaveBeenCalled();
				expect(processorModule.deleteLastBlock).not.toHaveBeenCalled();
				expect(storageMock.entities.TempBlock.truncate).toHaveBeenCalled();
			});
		});

		it('should not do anything if blocks temporary table is empty', async () => {
			// Arrange
			storageMock.entities.TempBlock.isEmpty.mockResolvedValue(true);

			// Act
			await synchronizer.init();

			// Assert
			expect(synchronizerUtils.restoreBlocksUponStartup).not.toHaveBeenCalled();
		});

		it('should catch any errors and error log it', async () => {
			// Arrange
			const blocksTempTableEntries = new Array(10)
				.fill(0)
				.map((_, index) => ({
					height: index,
					id: `${index}`,
					fullBlock: { height: index, id: index, version: 2 },
				}))
				.slice(genesisBlockDevnet.height + 2);
			const initialLastBlock = {
				height: genesisBlockDevnet.height + 1,
				id: 'anId',
				previousBlockId: genesisBlockDevnet.id,
				version: 1,
			};
			storageMock.entities.TempBlock.get.mockResolvedValue(
				blocksTempTableEntries,
			);
			// To load storage tip block into lastBlock in memory variable
			when(storageMock.entities.Block.get)
				.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
				.mockResolvedValue([initialLastBlock]);

			const error = new Error('error while deleting last block');
			processorModule.processValidated.mockRejectedValue(error);

			await blocksModule.init();

			// Act
			await synchronizer.init();

			expect(loggerMock.error).toHaveBeenCalledWith(
				{ err: error },
				'Failed to restore blocks from temp table upon startup',
			);
		});
	});

	describe('register()', () => {
		it('should register sync mechanisms', async () => {
			const syncMechanism = {
				isValidFor: async () => {},
				run: async () => {},
				isActive: false,
			};
			synchronizer.register(syncMechanism);

			expect(synchronizer.mechanisms).toEqual([
				syncMechanism1,
				syncMechanism2,
				syncMechanism,
			]);
		});
	});

	describe('get isActive()', () => {
		it('should return false if the synchronizer is not running', async () => {
			synchronizer.active = false;
			expect(synchronizer.isActive).toBeFalsy();
		});

		it('should return true if the synchronizer is running', async () => {
			synchronizer.active = true;
			expect(synchronizer.isActive).toBeTruthy();
		});
	});

	describe('async _determineSyncMechanism()', () => {
		it('should return syncMechanism1 if syncMechanism1.isValidFor return true', async () => {
			jest.spyOn(syncMechanism1, 'isValidFor').mockReturnValue(true);
			jest.spyOn(syncMechanism2, 'isValidFor').mockReturnValue(false);

			expect(await synchronizer._determineSyncMechanism()).toBe(syncMechanism1);
		});

		it('should return syncMechanism2 if syncMechanism2.isValidFor return true', async () => {
			jest.spyOn(syncMechanism1, 'isValidFor').mockReturnValue(false);
			jest.spyOn(syncMechanism2, 'isValidFor').mockReturnValue(true);

			expect(await synchronizer._determineSyncMechanism()).toBe(syncMechanism2);
		});
	});

	describe.only('async run()', () => {
		let receivedBlock;

		beforeEach(async () => {
			receivedBlock = {
				id: 'anId',
				height: 3,
				version: 2,
			};

			jest
				.spyOn(synchronizer, '_determineSyncMechanism')
				.mockReturnValue(undefined);
		});

		it('should reject with error if there is already an active mechanism', async () => {
			synchronizer.active = true;
			await expect(
				synchronizer.run({ id: 'a blockId' }, '127.0.0.1:4000'),
			).rejects.toThrow('Synchronizer is already running');
		});

		it('should reject with error if required properties are missing (block)', async () => {
			synchronizer.active = true;
			await expect(synchronizer.run()).rejects.toThrow(
				'A block must be provided to the Synchronizer in order to run',
			);
		});

		it('should reject with error if required properties are missing (peerId)', async () => {
			synchronizer.active = true;
			await expect(synchronizer.run({ height: 1 })).rejects.toThrow(
				'A peer ID from the peer sending the block must be provided to the Synchronizer in order to run',
			);
		});

		it('should validate the block before sync', async () => {
			jest.spyOn(processorModule, 'validateDetached');
			const aBlock = newBlock();

			await synchronizer.run(aBlock, '127.0.0.1:4000');

			expect(processorModule.validateDetached).toHaveBeenCalledWith(
				await processorModule.deserialize(aBlock),
			);
		});

		it('should reject with error if block validation failed', async () => {
			try {
				await synchronizer.run(
					{
						...newBlock(),
						blockSignature: '12312334534536645656',
					},
					'127.0.0.1:4000',
				);
			} catch (error) {
				expect(error[0].message).toEqual('should match format "signature"');
			}
		});

		it('should determine the sync mechanism for received block', async () => {
			syncMechanism1.isValidFor.mockResolvedValue(true);
			syncMechanism2.isValidFor.mockResolvedValue(false);

			await synchronizer.run(newBlock(), '127.0.0.1:4000');

			expect(syncMechanism1.isValidFor).toHaveBeenCalledTimes(1);
			expect(syncMechanism2.isValidFor).toHaveBeenCalledTimes(1);
			expect(syncMechanism1.run).toHaveBeenCalled();
			expect(syncMechanism2.run).not.toHaveBeenCalled();
		});

		it('should throw an error if two mechanisms are conflicting (both are valid)', async () => {
			syncMechanism1.isValidFor.mockResolvedValue(true);
			syncMechanism2.isValidFor.mockResolvedValue(true);

			try {
				await synchronizer.run(newBlock(), '127.0.0.1:4000');
			} catch (error) {
				expect(error.message).toEqual('Mechanisms are conflicting');
			}
		});

		it('should log message if unable to determine sync mechanism', async () => {
			await synchronizer.run(newBlock(), '127.0.0.1:4000');

			expect(loggerMock.info).toHaveBeenCalledTimes(2);
			expect(loggerMock.info).toHaveBeenNthCalledWith(
				2,
				{ blockId: receivedBlock.id },
				'Syncing mechanism could not be determined for the given block',
			);
		});

		it('should run the determined mechanism', async () => {
			const syncMechanism = { run: jest.fn() };
			synchronizer._determineSyncMechanism.mockReturnValue(syncMechanism);

			await synchronizer.run(receivedBlock, 'aPeerId');

			expect(syncMechanism.run).toHaveBeenCalledTimes(1);
			expect(syncMechanism.run).toHaveBeenCalledWith(receivedBlock, 'aPeerId');
		});
	});
});
