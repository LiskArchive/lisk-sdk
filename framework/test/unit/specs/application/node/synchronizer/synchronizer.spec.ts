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
import { Block, Chain } from '@liskhq/lisk-chain';
import { BFT } from '@liskhq/lisk-bft';
import { Rounds } from '@liskhq/lisk-dpos';
import { KVStore } from '@liskhq/lisk-db';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { BlockProcessorV2 } from '../../../../../../src/application/node/block_processor_v2';
import { Synchronizer } from '../../../../../../src/application/node/synchronizer/synchronizer';
import { Processor } from '../../../../../../src/application/node/processor';
import { constants } from '../../../../../utils';
import {
	createValidDefaultBlock,
	defaultNetworkIdentifier,
	genesisBlock as getGenesisBlock,
} from '../../../../../fixtures/blocks';
import * as synchronizerUtils from '../../../../../../src/application/node/synchronizer/utils';
import {
	defaultAccountAsset,
	accountAssetSchema,
} from '../../../../../../src/application/node/account';
import { registeredTransactions } from '../../../../../utils/registered_transactions';
import { genesis } from '../../../../../fixtures';

jest.mock('@liskhq/lisk-db');

const { InMemoryChannel: ChannelMock } = jest.genMockFromModule(
	'../../../../../../src/controller/channels/in_memory_channel',
);

describe('Synchronizer', () => {
	const genesisBlock = getGenesisBlock();
	let bftModule;
	let blockProcessorV2;
	let chainModule: any;
	let processorModule: Processor;
	let synchronizer: Synchronizer;
	let syncMechanism1: any;
	let syncMechanism2: any;
	let rounds;

	let transactionPoolModuleStub: any;
	let channelMock: any;
	let dposModuleMock: any;
	let loggerMock: any;
	let syncParameters;
	let dataAccessMock;

	beforeEach(() => {
		jest.spyOn(synchronizerUtils, 'restoreBlocksUponStartup');
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};

		transactionPoolModuleStub = {
			add: jest.fn(),
		};
		channelMock = new ChannelMock();

		rounds = new Rounds({ blocksPerRound: constants.activeDelegates });

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
			getBlockHeadersWithHeights: jest.fn(),
			getBlockByID: jest.fn(),
			getLastBlock: jest.fn(),
			getBlockHeadersByHeightBetween: jest.fn(),
			addBlockHeader: jest.fn(),
			getLastBlockHeader: jest.fn(),
			clearTempBlocks: jest.fn(),
			isTempBlockEmpty: jest.fn(),
			getAccountsByPublicKey: jest.fn(),
			getBlockHeaderByHeight: jest.fn(),
			decode: chainModule.dataAccess.decode.bind(chainModule.dataAccess),
			encodeBlockHeader: chainModule.dataAccess.encodeBlockHeader.bind(
				chainModule.dataAccess,
			),
			decodeTransaction: chainModule.dataAccess.decodeTransaction.bind(
				chainModule.dataAccess,
			),
			getBlockHeaderAssetSchema: chainModule.dataAccess.getBlockHeaderAssetSchema.bind(
				chainModule.dataAccess,
			),
		};
		chainModule.dataAccess = dataAccessMock;

		bftModule = new BFT({
			chain: chainModule,
			dpos: { rounds } as any,
			activeDelegates: constants.activeDelegates,
			startingHeight: 1,
		});

		blockProcessorV2 = new BlockProcessorV2({
			networkIdentifier: '',
			forgerDB,
			chainModule,
			bftModule,
			dposModule: dposModuleMock,
			logger: loggerMock,
			constants,
		});

		processorModule = new Processor({
			channel: channelMock,
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
			transactionPoolModule: transactionPoolModuleStub,
			mechanisms: [syncMechanism1, syncMechanism2],
		};

		synchronizer = new Synchronizer(syncParameters);
	});

	describe('init()', () => {
		beforeEach(() => {
			// Arrange
			const lastBlock = createValidDefaultBlock({
				header: { height: genesisBlock.header.height + 1 },
			});
			when(chainModule.dataAccess.getBlockHeaderByHeight)
				.calledWith(1)
				.mockResolvedValue(genesisBlock.header as never);
			when(chainModule.dataAccess.getLastBlock)
				.calledWith()
				.mockResolvedValue(lastBlock as never);
			when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
				.calledWith(1, 2)
				.mockResolvedValue([lastBlock] as never);
			when(chainModule.dataAccess.getAccountsByPublicKey)
				.calledWith()
				.mockResolvedValue([{ publicKey: 'aPublicKey' }] as never);
		});

		describe('given that the blocks temporary table is not empty', () => {
			beforeEach(() => {
				// Simulate blocks temporary table to be empty
				chainModule.dataAccess.isTempBlockEmpty.mockResolvedValue(false);
			});

			it('should restore blocks from blocks temporary table into blocks table if tip of temp table chain has preference over current tip (FORK_STATUS_DIFFERENT_CHAIN)', async () => {
				// Arrange
				const blocksTempTableEntries = new Array(10)
					.fill(0)
					.map((_, index) => ({
						...createValidDefaultBlock({
							header: {
								height: index,
								version: 2,
							},
						}),
					}))
					.slice(genesisBlock.header.height + 2);
				const initialLastBlock = createValidDefaultBlock({
					header: {
						height: genesisBlock.header.height + 3,
						previousBlockID: genesisBlock.header.id,
						version: 1,
					},
				});

				// To load storage tip block into lastBlock in memory variable
				when(chainModule.dataAccess.getBlockHeadersByHeightBetween)
					.calledWith(1, 4)
					.mockResolvedValue([initialLastBlock] as never);

				when(chainModule.dataAccess.getTempBlocks)
					.calledWith()
					.mockResolvedValue(blocksTempTableEntries.reverse() as never);

				when(chainModule.dataAccess.getLastBlock)
					.calledWith()
					.mockResolvedValue(initialLastBlock as never);

				when(processorModule.deleteLastBlock as jest.Mock)
					.calledWith({
						saveTempBlock: false,
					})
					.mockResolvedValueOnce({
						header: { height: initialLastBlock.header.height - 1 },
					})
					.mockResolvedValueOnce({
						header: { height: initialLastBlock.header.height - 2 },
					});

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
				expect(processorModule.deleteLastBlock).toHaveBeenCalledTimes(2);
				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksTempTableEntries.length,
				);

				// Assert whether temp blocks are being restored to main table
				expect.assertions(blocksTempTableEntries.length + 4);
				for (let i = 0; i < blocksTempTableEntries.length; i += 1) {
					const tempBlock = blocksTempTableEntries[i];
					expect(processorModule.processValidated).toHaveBeenNthCalledWith(
						i + 1,
						tempBlock,
						{
							removeFromTempTable: true,
						},
					);
				}
			});

			it('should restore blocks from blocks temporary table into blocks table if tip of temp table chain has preference over current tip (FORK_STATUS_VALID_BLOCK)', async () => {
				// Arrange
				const initialLastBlock = createValidDefaultBlock({
					header: {
						height: genesisBlock.header.height + 1,
						previousBlockID: genesisBlock.header.id,
						version: 1,
					},
				});
				const blocksTempTableEntries = [
					{
						header: {
							height: genesisBlock.header.height + 2,
							version: 2,
							previousBlockID: initialLastBlock.header.id,
						},
					},
				];
				chainModule.dataAccess.getTempBlocks.mockResolvedValue(
					blocksTempTableEntries,
				);
				// To load storage tip block into lastBlock in memory variable
				when(chainModule.dataAccess.getLastBlock)
					.calledWith()
					.mockResolvedValue(initialLastBlock as never);

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

				expect(processorModule.processValidated).toHaveBeenCalledTimes(
					blocksTempTableEntries.length,
				);

				// Assert whether temp blocks are being restored to main table
				expect.assertions(blocksTempTableEntries.length + 3);
				for (let i = 0; i < blocksTempTableEntries.length; i += 1) {
					const tempBlock = blocksTempTableEntries[i];
					expect(processorModule.processValidated).toHaveBeenNthCalledWith(
						i + 1,
						tempBlock,
						{
							removeFromTempTable: true,
						},
					);
				}
			});

			it('should clear the blocks temp table if the tip of the temp table doesnt have priority over current tip (Any other Fork Choice code', async () => {
				// Arrange
				const initialLastBlock = createValidDefaultBlock({
					header: {
						height: genesisBlock.header.height + 1,
						previousBlockID: genesisBlock.header.id,
						version: 2,
					},
				});
				const blocksTempTableEntries = [initialLastBlock];
				chainModule.dataAccess.getTempBlocks.mockResolvedValue(
					blocksTempTableEntries,
				);
				// To load storage tip block into lastBlock in memory variable
				when(chainModule.dataAccess.getLastBlock)
					.calledWith()
					.mockResolvedValue(initialLastBlock as never);

				await chainModule.init();

				// Act
				await synchronizer.init();

				// Assert
				expect(processorModule.processValidated).not.toHaveBeenCalled();
				expect(processorModule.deleteLastBlock).not.toHaveBeenCalled();
			});
		});

		it('should not do anything if blocks temporary table is empty', async () => {
			// Arrange
			chainModule.dataAccess.isTempBlockEmpty.mockResolvedValue(true);

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
					...createValidDefaultBlock({
						header: {
							height: index,
							version: 2,
						},
					}),
				}))
				.slice(genesisBlock.header.height + 2);
			const initialLastBlock = createValidDefaultBlock({
				header: {
					height: genesisBlock.header.height + 1,
					previousBlockID: genesisBlock.header.id,
					version: 1,
				},
			});
			chainModule.dataAccess.getTempBlocks.mockResolvedValue(
				blocksTempTableEntries.reverse(),
			);
			// To load storage tip block into lastBlock in memory variable
			when(chainModule.dataAccess.getLastBlock)
				.calledWith()
				.mockResolvedValue(initialLastBlock as never);

			const error = new Error('error while deleting last block');
			(processorModule.processValidated as jest.Mock).mockRejectedValue(error);

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
				channel: channelMock,
				logger: loggerMock,
				processorModule,
				chainModule,
				transactionPoolModule: transactionPoolModuleStub,
				mechanisms: [aSyncingMechanism, anotherSyncingMechanism] as any,
			});

			expect(aSynchronizer['mechanisms']).toInclude(aSyncingMechanism as any);
			expect(aSynchronizer['mechanisms']).toInclude(
				anotherSyncingMechanism as any,
			);
		});

		it('should enforce mandatory interfaces for passed mechanisms (isValidFor)', () => {
			const aSyncingMechanism = {
				run: jest.fn().mockResolvedValue({}),
			};

			expect(
				() =>
					new Synchronizer({
						channel: channelMock,
						logger: loggerMock,
						processorModule,
						chainModule,
						transactionPoolModule: transactionPoolModuleStub,
						mechanisms: [aSyncingMechanism] as any,
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
						channel: channelMock,
						logger: loggerMock,
						processorModule,
						chainModule,
						transactionPoolModule: transactionPoolModuleStub,
						mechanisms: [aSyncingMechanism] as any,
					}),
			).toThrow('Mechanism Object should implement "run" method');
		});
	});

	describe('get isActive()', () => {
		it('should return false if the synchronizer is not running', () => {
			synchronizer.active = false;
			expect(synchronizer.isActive).toBeFalsy();
		});

		it('should return true if the synchronizer is running', () => {
			synchronizer.active = true;
			expect(synchronizer.isActive).toBeTruthy();
		});
	});

	describe('async run()', () => {
		const aPeerId = '127.0.0.1:5000';
		let aReceivedBlock: Block;

		beforeEach(() => {
			aReceivedBlock = createValidDefaultBlock(); // newBlock() creates a block instance, and we want to simulate a block in JSON format that comes from the network
		});

		it('should reject with error if there is already an active mechanism', async () => {
			synchronizer.active = true;
			await expect(synchronizer.run(aReceivedBlock, aPeerId)).rejects.toThrow(
				'Synchronizer is already running',
			);
		});

		it('should reject with error if required properties are missing (block)', async () => {
			await expect((synchronizer as any).run()).rejects.toThrow(
				'A block must be provided to the Synchronizer in order to run',
			);
			expect(synchronizer.active).toBeFalsy();
		});

		it('should validate the block before sync', async () => {
			jest.spyOn(processorModule, 'validate');

			await synchronizer.run(aReceivedBlock, aPeerId);

			expect(processorModule.validate).toHaveBeenCalledWith(aReceivedBlock);
		});

		it('should reject with error if block validation failed', async () => {
			await expect(
				synchronizer.run(
					{
						...aReceivedBlock,
						header: {
							...aReceivedBlock.header,
							signature: Buffer.from(
								'84d95f9a9c02b1b216bc89610961ca886a454c252e0782f8c4c437f5dff7f720fd63461774fbec4622c85c1c15c3f1d55baf7a4ad41e4e0e50589c5c1e4c7301',
								'hex',
							),
						},
					},
					aPeerId,
				),
			).rejects.toThrow('Invalid block signature');

			expect(synchronizer.active).toBeFalsy();
		});

		it('should determine the sync mechanism for received block and run it', async () => {
			syncMechanism1.isValidFor.mockResolvedValue(true);
			syncMechanism2.isValidFor.mockResolvedValue(false);

			await synchronizer.run(aReceivedBlock, aPeerId);

			expect(syncMechanism1.isValidFor).toHaveBeenCalledTimes(1);
			expect(syncMechanism1.run).toHaveBeenCalledWith(aReceivedBlock, aPeerId);
			expect(syncMechanism2.run).not.toHaveBeenCalled();
			expect(loggerMock.info).toHaveBeenNthCalledWith(2, 'Triggering: Object');
			expect(loggerMock.info).toHaveBeenNthCalledWith(
				3,
				{
					lastBlockHeight: chainModule.lastBlock.header.height,
					lastBlockId: chainModule.lastBlock.header.id,
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
				{ blockId: aReceivedBlock.header.id },
				'Syncing mechanism could not be determined for the given block',
			);
			expect(synchronizer.active).toBeFalsy();
			expect(syncMechanism1.run).not.toHaveBeenCalled();
			expect(syncMechanism2.run).not.toHaveBeenCalled();
		});
	});

	describe('#_getUnconfirmedTransactionsFromNetwork', () => {
		beforeEach(() => {
			syncParameters = {
				channel: channelMock,
				logger: loggerMock,
				processorModule,
				chainModule,
				transactionPoolModule: transactionPoolModuleStub,
				mechanisms: [syncMechanism1, syncMechanism2],
			};
			synchronizer = new Synchronizer(syncParameters);
		});

		describe('when peer returns valid transaction response', () => {
			const transaction = new TransferTransaction({
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: getAddressAndPublicKeyFromPassphrase(
					genesis.passphrase,
				).publicKey,
				asset: {
					amount: BigInt('100'),
					recipientAddress: Buffer.from(
						'b63f83a1ecf93d7cc0d811e89462c4e1d66d1e56',
						'hex',
					),
					data: '',
				},
			});
			transaction.sign(defaultNetworkIdentifier, genesis.passphrase);
			const validtransactions = {
				transactions: [transaction.getBytes().toString('base64')],
			};

			beforeEach(() => {
				channelMock.invokeFromNetwork.mockReturnValue({
					data: validtransactions,
				});
				transactionPoolModuleStub.add.mockReturnValue({
					status: 1,
					errors: [],
				});
			});

			it('should not throw an error', async () => {
				let error;
				try {
					await synchronizer['_getUnconfirmedTransactionsFromNetwork']();
				} catch (err) {
					error = err;
				}
				expect(error).toBeUndefined();
			});

			it('should process the transaction with transactionPoolModule', async () => {
				await synchronizer['_getUnconfirmedTransactionsFromNetwork']();
				expect(transactionPoolModuleStub.add).toHaveBeenCalledTimes(1);
			});
		});

		describe('when peer returns invalid transaction response', () => {
			const invalidTransactions = { signatures: [] };
			beforeEach(() => {
				channelMock.invokeFromNetwork.mockReturnValue({
					data: invalidTransactions,
				});
			});

			it('should throw an error', async () => {
				let error;
				try {
					await synchronizer['_getUnconfirmedTransactionsFromNetwork']();
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
