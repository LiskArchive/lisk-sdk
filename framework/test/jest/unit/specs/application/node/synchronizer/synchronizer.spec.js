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
const { Rounds } = require('@liskhq/lisk-dpos');

const {
	BlockProcessorV2,
} = require('../../../../../../../src/application/node/block_processor_v2');
const {
	Synchronizer,
} = require('../../../../../../../src/application/node/synchronizer/synchronizer');
const {
	Sequence,
} = require('../../../../../../../src/application/node/utils/sequence');
const {
	Processor,
} = require('../../../../../../../src/application/node/processor');
const { constants } = require('../../../../../../utils');
const { newBlock } = require('./block');
const synchronizerUtils = require('../../../../../../../src/application/node/synchronizer/utils');
const {
	registeredTransactions,
} = require('../../../../../../utils/registered_transactions');

const genesisBlockDevnet = require('../../../../../../fixtures/config/devnet/genesis_block');

const ChannelMock = jest.genMockFromModule(
	'../../../../../../../src/controller/channels/in_memory_channel',
);

describe('Synchronizer', () => {
	let bftModule;
	let blockProcessorV2;
	let chainModule;
	let processorModule;
	let synchronizer;
	let syncMechanism1;
	let syncMechanism2;
	let rounds;

	let transactionPoolModuleStub;
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
					begin: jest.fn(),
				},
				Account: {
					get: jest.fn(),
				},
			},
		};
		transactionPoolModuleStub = {
			processUnconfirmedTransaction: jest.fn(),
		};
		channelMock = new ChannelMock();

		rounds = new Rounds({ blocksPerRound: constants.ACTIVE_DELEGATES });

		chainModule = new Chain({
			logger: loggerMock,
			storage: storageMock,
			sequence: new Sequence(),
			genesisBlock: genesisBlockDevnet,
			registeredTransactions,
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

		bftModule = new BFT({
			chain: chainModule,
			dpos: { rounds },
			slots: chainModule.slots,
			activeDelegates: constants.ACTIVE_DELEGATES,
			startingHeight: 1,
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
		processorModule.deleteLastBlock = jest.fn();
		processorModule.register(blockProcessorV2);

		syncMechanism1 = {
			run: jest.fn().mockResolvedValue({}),
			isValidFor: jest.fn().mockResolvedValue(false),
		};
		syncMechanism2 = {
			run: jest.fn().mockResolvedValue({}),
			isValidFor: jest.fn().mockResolvedValue(false),
		};

		syncParameters = {
			channel: channelMock,
			logger: loggerMock,
			processorModule,
			chainModule,
			storageModule: storageMock,
			transactionPoolModule: transactionPoolModuleStub,
			mechanisms: [syncMechanism1, syncMechanism2],
		};

		synchronizer = new Synchronizer(syncParameters);
	});

	describe('init()', () => {
		beforeEach(() => {
			// Arrange
			when(storageMock.entities.Block.begin)
				.calledWith('loader:checkMemTables')
				.mockResolvedValue({ genesisBlock: genesisBlockDevnet });
			when(storageMock.entities.Block.get)
				.calledWith({ height: 1 }, { extended: true })
				.mockResolvedValue([genesisBlockDevnet]);
			when(storageMock.entities.Account.get)
				.calledWith({ isDelegate: true }, { limit: null })
				.mockResolvedValue([{ publicKey: 'aPublicKey' }]);
			when(storageMock.entities.Block.get)
				.calledWith(
					{ height_gte: 1, height_lte: 2 },
					{ limit: null, sort: 'height:desc' },
				)
				.mockResolvedValue([]);
		});

		describe('given that the blocks temporary table is not empty', () => {
			beforeEach(() => {
				// Simulate blocks temporary table to be empty
				storageMock.entities.TempBlock.isEmpty.mockResolvedValue(false);
			});

			it('should restore blocks from blocks temporary table into blocks table if tip of temp table chain has preference over current tip (FORK_STATUS_DIFFERENT_CHAIN)', async () => {
				// Arrange
				const blocksTempTableEntries = new Array(10)
					.fill(0)
					.map((_, index) => ({
						height: index,
						id: `${index}`,
						fullBlock: newBlock({ height: index, id: index, version: 2 }),
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
					.calledWith(
						{ height_gte: 1, height_lte: 4 },
						{ limit: null, sort: 'height:desc' },
					)
					.mockResolvedValue([initialLastBlock]);
				when(storageMock.entities.Block.get)
					.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
					.mockResolvedValue([initialLastBlock]);
				when(processorModule.deleteLastBlock)
					.calledWith({
						saveTempBlock: false,
					})
					.mockResolvedValueOnce({ height: initialLastBlock.height - 1 })
					.mockResolvedValueOnce({ height: initialLastBlock.height - 2 });
				await chainModule.init();

				// Act
				await synchronizer.init();

				// Assert
				expect(loggerMock.info).toHaveBeenNthCalledWith(
					1,
					'Restoring blocks from temporary table',
				);
				expect(loggerMock.info).toHaveBeenNthCalledWith(
					2,
					'Chain successfully restored',
				);
				expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
				expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(2);
				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksTempTableEntries.length,
				);

				// Assert whether temp blocks are being restored to main table
				expect.assertions(blocksTempTableEntries.length + 5);
				for (let i = 0; i < blocksTempTableEntries.length; i += 1) {
					const tempBlock = blocksTempTableEntries[i].fullBlock;
					expect(processorModule.processValidated).toHaveBeenNthCalledWith(
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
							previousBlockId: initialLastBlock.id,
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
				await chainModule.init();

				// Act
				await synchronizer.init();

				// Assert
				expect(loggerMock.info).toHaveBeenNthCalledWith(
					1,
					'Restoring blocks from temporary table',
				);
				expect(loggerMock.info).toHaveBeenNthCalledWith(
					2,
					'Chain successfully restored',
				);
				expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksTempTableEntries.length,
				);

				// Assert whether temp blocks are being restored to main table
				expect.assertions(blocksTempTableEntries.length + 4);
				for (let i = 0; i < blocksTempTableEntries.length; i += 1) {
					const tempBlock = blocksTempTableEntries[i].fullBlock;
					expect(processorModule.processValidated).toHaveBeenNthCalledWith(
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
				await chainModule.init();

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
					fullBlock: newBlock({ height: index, id: index, version: 2 }),
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
			// tslint:disable-next-line:no-null-keyword
			when(storageMock.entities.Block.get)
				.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
				.mockResolvedValue([initialLastBlock]);

			const error = new Error('error while deleting last block');
			processorModule.processValidated.mockRejectedValue(error);

			await chainModule.init();

			// Act
			await synchronizer.init();

			// Assert
			expect(loggerMock.error).toHaveBeenCalledWith(
				{ err: error },
				'Failed to restore blocks from temp table upon startup',
			);
		});
	});

	describe('constructor', () => {
		it('should assign passed mechanisms', () => {
			const aSyncingMechanism = {
				run: jest.fn().mockResolvedValue({}),
				isValidFor: jest.fn().mockResolvedValue(false),
			};
			const anotherSyncingMechanism = {
				run: jest.fn().mockResolvedValue({}),
				isValidFor: jest.fn().mockResolvedValue(false),
			};

			const aSynchronizer = new Synchronizer({
				mechanisms: [aSyncingMechanism, anotherSyncingMechanism],
			});

			expect(aSynchronizer.mechanisms).toInclude(aSyncingMechanism);
			expect(aSynchronizer.mechanisms).toInclude(anotherSyncingMechanism);
		});

		it('should enforce mandatory interfaces for passed mechanisms (isValidFor)', () => {
			const aSyncingMechanism = {
				run: jest.fn().mockResolvedValue({}),
			};

			expect(
				() =>
					new Synchronizer({
						mechanisms: [aSyncingMechanism],
					}),
			).toThrow('Mechanism Object should implement "isValidFor" method');
		});

		it('should enforce mandatory interfaces for passed mechanisms (run)', () => {
			const aSyncingMechanism = {
				isValidFor: jest.fn().mockResolvedValue(false),
			};

			expect(
				() =>
					new Synchronizer({
						mechanisms: [aSyncingMechanism],
					}),
			).toThrow('Mechanism Object should implement "run" method');
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

	describe('async run()', () => {
		const aPeerId = '127.0.0.1:5000';
		let aReceivedBlock;

		beforeEach(async () => {
			aReceivedBlock = await processorModule.serialize(newBlock()); // newBlock() creates a block instance, and we want to simulate a block in JSON format that comes from the network
		});

		it('should reject with error if there is already an active mechanism', async () => {
			synchronizer.active = true;
			await expect(synchronizer.run(aReceivedBlock, aPeerId)).rejects.toThrow(
				'Synchronizer is already running',
			);
		});

		it('should reject with error if required properties are missing (block)', async () => {
			await expect(synchronizer.run()).rejects.toThrow(
				'A block must be provided to the Synchronizer in order to run',
			);
			expect(synchronizer.active).toBeFalsy();
		});

		it('should validate the block before sync', async () => {
			jest.spyOn(processorModule, 'validateDetached');

			await synchronizer.run(aReceivedBlock, aPeerId);

			expect(processorModule.validateDetached).toHaveBeenCalledWith(
				await processorModule.deserialize(aReceivedBlock),
			);
		});

		it('should reject with error if block validation failed', async () => {
			await expect(
				synchronizer.run(
					{
						...aReceivedBlock,
						blockSignature: '12312334534536645656',
					},
					aPeerId,
				),
			).rejects.toMatchObject([
				expect.objectContaining({
					message: 'should match format "signature"',
				}),
			]);

			expect(synchronizer.active).toBeFalsy();
		});

		it('should determine the sync mechanism for received block and run it', async () => {
			syncMechanism1.isValidFor.mockResolvedValue(true);
			syncMechanism2.isValidFor.mockResolvedValue(false);

			await synchronizer.run(aReceivedBlock, aPeerId);

			expect(syncMechanism1.isValidFor).toHaveBeenCalledTimes(1);
			expect(syncMechanism1.run).toHaveBeenCalledWith(
				await processorModule.deserialize(aReceivedBlock),
				aPeerId,
			);
			expect(syncMechanism2.run).not.toHaveBeenCalled();
			expect(loggerMock.info).toHaveBeenNthCalledWith(2, 'Triggering: Object');
			expect(loggerMock.info).toHaveBeenNthCalledWith(
				3,
				{
					lastBlockHeight: chainModule.lastBlock.height,
					lastBlockId: chainModule.lastBlock.id,
					mechanism: syncMechanism1.constructor.name,
				},
				'Synchronization finished',
			);
			expect(synchronizer.active).toBeFalsy();
		});

		it('should log message if unable to determine syncing mechanism', async () => {
			syncMechanism1.isValidFor.mockResolvedValue(false);
			syncMechanism2.isValidFor.mockResolvedValue(false);
			await synchronizer.run(aReceivedBlock, aPeerId);

			expect(loggerMock.info).toHaveBeenCalledTimes(2);
			expect(loggerMock.info).toHaveBeenNthCalledWith(
				2,
				{ blockId: aReceivedBlock.id },
				'Syncing mechanism could not be determined for the given block',
			);
			expect(synchronizer.active).toBeFalsy();
			expect(syncMechanism1.run).not.toHaveBeenCalled();
			expect(syncMechanism2.run).not.toHaveBeenCalled();
		});
	});

	describe('#_getUnconfirmedTransactionsFromNetwork', () => {
		let chainModuleStub;
		beforeEach(async () => {
			chainModuleStub = {
				recoverChain: jest.fn(),
				lastBlock: {
					id: 'blockID',
				},
				deserializeTransaction: jest.fn().mockImplementation(val => val),
				validateTransactions: jest.fn().mockResolvedValue({
					transactionsResponses: [
						{
							errors: [],
							status: 1,
						},
					],
				}),
			};

			syncParameters = {
				channel: channelMock,
				logger: loggerMock,
				processorModule,
				chainModule: chainModuleStub,
				storageModule: storageMock,
				transactionPoolModule: transactionPoolModuleStub,
				mechanisms: [syncMechanism1, syncMechanism2],
			};
			synchronizer = new Synchronizer(syncParameters);
		});

		describe('when peer returns valid transaction response', () => {
			const validtransactions = {
				transactions: [
					{
						type: 11,
						senderPublicKey:
							'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
						timestamp: 54316326,
						asset: {
							votes: [
								'+0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
								'+6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
								'-1387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
							],
						},
						signature:
							'b534786e208c570022ac7ebdb19915d8772998bab2fa7bdfb5fe219c2103a0517209301974c772596c46dd95b2d32b3b1f38172295801ff8c3968654a7bde406',
						id: '16951860278597630982',
					},
				],
			};

			beforeEach(async () => {
				channelMock.invokeFromNetwork.mockReturnValue({
					data: validtransactions,
				});
			});

			it('should not throw an error', async () => {
				let error;
				try {
					await synchronizer._getUnconfirmedTransactionsFromNetwork();
				} catch (err) {
					error = err;
				}
				expect(error).toBeUndefined();
			});

			it('should process the transaction with transactionPoolModule', async () => {
				await synchronizer._getUnconfirmedTransactionsFromNetwork();
				expect(
					transactionPoolModuleStub.processUnconfirmedTransaction,
				).toHaveBeenCalledTimes(1);
			});
		});

		describe('when peer returns invalid transaction response', () => {
			const invalidTransactions = { signatures: [] };
			beforeEach(async () => {
				channelMock.invokeFromNetwork.mockReturnValue({
					data: invalidTransactions,
				});
			});

			it('should throw an error', async () => {
				let error;
				try {
					await synchronizer._getUnconfirmedTransactionsFromNetwork();
				} catch (err) {
					error = err;
				}
				expect(error).toHaveLength(1);
				expect(error[0].message).toBe(
					"should have required property 'transactions'",
				);
			});
		});
	});
});
