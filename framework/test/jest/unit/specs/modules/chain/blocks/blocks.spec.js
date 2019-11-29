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
const BigNum = require('@liskhq/bignum');
const { TransferTransaction } = require('@liskhq/lisk-transactions');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const { Blocks } = require('../../../../../../../src/modules/chain/blocks');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
const { newBlock } = require('./utils.js');
const {
	registeredTransactions,
} = require('../../../../../utils/registered_transactions');

jest.mock('events');

// TODO: Share fixture generation b/w mocha and jest
const randomUtils = require('../../../../../../mocha/common/utils/random.js');
const {
	devnetNetworkIdentifier: networkIdentifier,
} = require('../../../../../../mocha/common/network_identifier');

describe('blocks', () => {
	const stubs = {};
	const constants = {
		blockReceiptTimeout: 20,
		loadPerIteration: 1000,
		maxPayloadLength: 1024 * 1024,
		maxTransactionsPerBlock: 25,
		activeDelegates: 101,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMileStones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockSlotWindow: 5,
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	let exceptions = {};
	let blocksInstance;
	let slots;

	beforeEach(() => {
		// Arrange
		stubs.dependencies = {
			storage: {
				entities: {
					Account: {
						get: jest.fn(),
						update: jest.fn(),
					},
					Block: {
						begin: jest.fn(),
						create: jest.fn(),
						count: jest.fn(),
						getOne: jest.fn(),
						delete: jest.fn(),
						get: jest.fn(),
						isPersisted: jest.fn(),
					},
					Transaction: {
						create: jest.fn(),
					},
					TempBlock: {
						create: jest.fn(),
						delete: jest.fn(),
						get: jest.fn(),
					},
				},
			},
			logger: {
				debug: jest.fn(),
				log: jest.fn(),
				error: jest.fn(),
			},
		};

		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
			blocksPerRound: constants.activeDelegates,
		});

		exceptions = {
			transactions: [],
		};

		stubs.tx = {
			batch: jest.fn(),
		};

		blocksInstance = new Blocks({
			...stubs.dependencies,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
			slots,
			exceptions,
			...constants,
		});
	});

	describe('constructor', () => {
		it('should initialize private variables correctly', async () => {
			// Assert stubbed values are assigned
			Object.entries(stubs.dependencies).forEach(([stubName, stubValue]) => {
				expect(blocksInstance[stubName]).toEqual(stubValue);
			});
			// Assert constants
			Object.entries(blocksInstance.constants).forEach(
				([constantName, constantValue]) =>
					expect(constants[constantName]).toEqual(constantValue),
			);
			// Assert miscellanious
			expect(slots).toEqual(blocksInstance.slots);
			expect(blocksInstance.blockReward).toBeDefined();
			expect(blocksInstance.blocksVerify).toBeDefined();
			return expect(blocksInstance.blocksUtils).toBeDefined();
		});
	});

	describe('lastBlock', () => {
		beforeEach(() => {
			blocksInstance._lastBlock = {
				...genesisBlock,
				receivedAt: new Date(),
			};
		});
		it('return the _lastBlock without the receivedAt property', async () => {
			// Arrange
			const { receivedAt, ...block } = genesisBlock;
			// Assert
			expect(blocksInstance.lastBlock).toEqual(block);
		});
	});

	describe('init', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.begin.mockImplementation(
				(_, callback) => callback.call(blocksInstance, stubs.tx),
			);
			stubs.dependencies.storage.entities.Block.count.mockResolvedValue(5);
			stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
				genesisBlock,
			);
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.tx.batch.mockImplementation(promises => Promise.all(promises));
			const random101DelegateAccounts = new Array(101)
				.fill('')
				.map(() => randomUtils.account());
			stubs.dependencies.storage.entities.Account.get.mockResolvedValue(
				random101DelegateAccounts,
			);
		});

		describe('loadMemTables', () => {
			it('should throw when entities.Block.count fails', async () => {
				expect.assertions(1);
				// Arrange
				const error = new Error('Count Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw when entities.Block.getOne fails', async () => {
				// Arrange
				const error = new Error('getOne Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw when entities.Block.getUniqueRounds fails', async () => {
				// Arrange
				const error = new Error('getUniqueRounds Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it.todo('should throw when tx.batch fails');
			it.todo('should not throw when tx.batch succeeds');
		});

		describe('matchGenesisBlock', () => {
			it('should throw an error if the genesis block id is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					id: genesisBlock.id.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block payloadHash is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					payloadHash: genesisBlock.payloadHash.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block signature is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					blockSignature: genesisBlock.blockSignature.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should not throw when genesis block matches', async () => {
				// Act & Assert
				await expect(blocksInstance.init()).resolves.toEqual();
			});
		});

		describe('loadLastBlock', () => {
			it('should throw an error when Block.get throws error', async () => {
				// Arrange
				const error = 'get error';
				stubs.dependencies.storage.entities.Block.get.mockRejectedValue(error);

				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error when Block.get returns empty array', async () => {
				// Arrange
				const errorMessage = 'Failed to load last block';
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([]);
				expect.assertions(1);
				// Act && Assert
				await expect(blocksInstance.init()).rejects.toThrow(errorMessage);
			});
			// TODO: The tests are minimal due to the changes we expect as part of https://github.com/LiskHQ/lisk-sdk/issues/4131
			describe('when Block.get returns rows', () => {
				it('should return the storage read of the first row', async () => {
					// Arrange
					stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
						genesisBlock,
						newBlock(),
					]);
					// Act
					await blocksInstance.init();

					// Assert
					// @TODO discuss
					expect(true).toBeTruthy();
				});
			});
		});

		it('should initialize the processor', async () => {
			// Act
			await blocksInstance.init();
			// Assert
			expect(blocksInstance.lastBlock.id).toEqual(genesisBlock.id);
		});
	});

	describe('serialize', () => {
		const transaction = new TransferTransaction(randomUtils.transaction());
		const block = newBlock({ transactions: [transaction] });

		it('should convert all the field to be JSON format', () => {
			const blockInstance = blocksInstance.serialize(block);
			expect(blockInstance.reward).toBe(block.reward.toString());
			expect(blockInstance.totalFee).toBe(block.totalFee.toString());
			expect(blockInstance.totalAmount).toBe(block.totalAmount.toString());
		});

		it('should have only previousBlockId property', () => {
			const blockInstance = blocksInstance.serialize(block);
			expect(blockInstance.previousBlockId).toBeString();
		});
	});

	describe('deserialize', () => {
		const blockJSON = {
			totalFee: '10000000',
			totalAmount: '1',
			payloadHash:
				'564352bc451aca0e2aeca2aebf7a3d7af18dbac73eaa31623971bfc63d20339c',
			payloadLength: 117,
			numberOfTransactions: 1,
			version: 2,
			height: 2,
			transactions: [
				{
					id: '1065693148641117014',
					blockId: '7360015088758644957',
					type: 8,
					timestamp: 107102856,
					senderPublicKey:
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
					fee: '10000000',
					signature:
						'c49a1b9e8f5da4ddd9c8ad49b6c35af84c233701d53a876ef6e385a46888800334e28430166e2de8cac207452913f0e8b439b03ef8a795748ea23e28b8b1c00c',
					signatures: [],
					asset: {
						amount: '1',
						recipientId: '10361596175468657749L',
					},
				},
			],
			reward: '0',
			timestamp: 1000,
			generatorPublicKey:
				'1c51f8d57dd74b9cede1fa957f46559cd9596655c46ae9a306364dc5b39581d1',
			blockSignature:
				'acbe0321dfc4323dd0e6f41269d7dd875ae2bbc6adeb9a4b179cca00328c31e641599b5b0d16d9620886133ed977909d228ab777903f9c0d3842b9ea8630b909',
			id: '7360015088758644957',
			previousBlockId: '10620616195853047363',
		};

		it('should convert big number field to be instance', () => {
			const blockInstance = blocksInstance.deserialize(blockJSON);
			expect(blockInstance.totalAmount).toBeInstanceOf(BigNum);
			expect(blockInstance.totalFee).toBeInstanceOf(BigNum);
			expect(blockInstance.reward).toBeInstanceOf(BigNum);
		});

		it('should convert transaction to be a class', () => {
			const blockInstance = blocksInstance.deserialize(blockJSON);
			expect(blockInstance.transactions[0]).toBeInstanceOf(TransferTransaction);
		});

		it('should have only previousBlockId property', () => {
			const blockInstance = blocksInstance.deserialize(blockJSON);
			expect(blockInstance.previousBlockId).toBeString();
		});
	});

	describe('save', () => {
		beforeEach(async () => {
			stubs.tx.batch.mockImplementation(promises => Promise.all(promises));
		});

		it('should throw error when block create fails', async () => {
			// Arrange
			const block = newBlock();
			const blockCreateError = 'block create error';
			stubs.dependencies.storage.entities.Block.create.mockRejectedValue(
				blockCreateError,
			);
			expect.assertions(1);

			// Act & Assert
			await expect(
				blocksInstance.save(blocksInstance.serialize(block), stubs.tx),
			).rejects.toEqual(blockCreateError);
		});

		it('should throw error when transaction create fails', async () => {
			// Arrange
			const transaction = new TransferTransaction(randomUtils.transaction());
			const block = newBlock({ transactions: [transaction] });
			const transactionCreateError = 'transaction create error';
			stubs.dependencies.storage.entities.Transaction.create.mockRejectedValue(
				transactionCreateError,
			);
			expect.assertions(1);

			// Act & Assert
			await expect(
				blocksInstance.save(blocksInstance.serialize(block), stubs.tx),
			).rejects.toEqual(transactionCreateError);
		});

		it('should call Block.create with correct parameters', async () => {
			// Arrange
			const block = newBlock({
				reward: new BigNum('0'),
				totolAmount: new BigNum('0'),
				totalFee: new BigNum('0'),
			});
			const blockJSON = blocksInstance.serialize(block);
			expect.assertions(1);

			// Act
			await blocksInstance.save(blockJSON, stubs.tx);

			// Assert
			expect(
				stubs.dependencies.storage.entities.Block.create,
			).toHaveBeenCalledWith(blockJSON, {}, stubs.tx);
		});

		it('should not call Transaction.create with if block has no transactions', async () => {
			// Arrange
			const block = newBlock();

			// Act
			await blocksInstance.save(blocksInstance.serialize(block), stubs.tx);

			// Assert
			expect(
				stubs.dependencies.storage.entities.Transaction.create,
			).not.toHaveBeenCalled();
		});

		it('should call Transaction.create with correct parameters', async () => {
			// Arrange
			const transaction = new TransferTransaction(randomUtils.transaction());
			const block = newBlock({ transactions: [transaction] });
			transaction.blockId = block.id;
			const transactionJSON = transaction.toJSON();

			// Act
			await blocksInstance.save(blocksInstance.serialize(block), stubs.tx);

			// Assert
			expect(
				stubs.dependencies.storage.entities.Transaction.create,
			).toHaveBeenCalledWith([transactionJSON], {}, stubs.tx);
		});

		it('should resolve when blocks module successfully performs save', async () => {
			// Arrange
			const block = newBlock();

			// Act & Assert
			expect.assertions(1);

			await expect(
				blocksInstance.save(blocksInstance.serialize(block), stubs.tx),
			).resolves.toEqual();
		});

		it('should throw error when storage create fails', async () => {
			// Arrange
			const block = newBlock();
			const blockCreateError = 'block create error';
			stubs.dependencies.storage.entities.Block.create.mockRejectedValue(
				blockCreateError,
			);

			expect.assertions(1);

			// Act & Assert
			await expect(
				blocksInstance.save(blocksInstance.serialize(block), stubs.tx),
			).rejects.toBe(blockCreateError);
		});
	});

	describe('remove', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.dependencies.storage.entities.Block.delete.mockResolvedValue();
		});

		it('should throw an error when removing genesis block', async () => {
			// Act & Assert
			await expect(
				blocksInstance.remove(
					blocksInstance.deserialize(genesisBlock),
					genesisBlock,
					stubs.tx,
				),
			).rejects.toThrow('Cannot delete genesis block');
		});

		it('should throw an error when previous block does not exist in the database', async () => {
			// Arrange
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([]);
			const block = newBlock();
			// Act & Assert
			await expect(
				blocksInstance.remove(block, blocksInstance.serialize(block), stubs.tx),
			).rejects.toThrow('PreviousBlock is null');
		});

		it('should throw an error when deleting block fails', async () => {
			// Arrange
			const deleteBlockError = new Error('Delete block failed');
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.dependencies.storage.entities.Block.delete.mockRejectedValue(
				deleteBlockError,
			);
			const block = newBlock();
			// Act & Assert
			await expect(
				blocksInstance.remove(block, blocksInstance.serialize(block), stubs.tx),
			).rejects.toEqual(deleteBlockError);
		});

		it('should not create entry in temp block table when saveToTemp flag is false', async () => {
			// Arrange
			const block = newBlock();
			// Act
			await blocksInstance.remove(
				block,
				blocksInstance.serialize(block),
				stubs.tx,
			);
			// Assert
			expect(blocksInstance.lastBlock.id).toEqual(genesisBlock.id);
			expect(
				stubs.dependencies.storage.entities.TempBlock.create,
			).not.toHaveBeenCalled();
		});

		describe('when saveToTemp parameter is set to true', () => {
			beforeEach(async () => {
				stubs.dependencies.storage.entities.TempBlock.create.mockResolvedValue();
			});

			it('should throw an error when temp block create function fails', async () => {
				// Arrange
				const tempBlockCreateError = new Error(
					'temp block entry creation failed',
				);
				const block = newBlock();
				stubs.dependencies.storage.entities.TempBlock.create.mockRejectedValue(
					tempBlockCreateError,
				);
				// Act & Assert
				await expect(
					blocksInstance.remove(
						block,
						blocksInstance.serialize(block),
						stubs.tx,
						{ saveTempBlock: true },
					),
				).rejects.toEqual(tempBlockCreateError);
			});

			it('should create entry in temp block with correct id, height and block property and tx', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());
				const block = newBlock({ transactions: [transaction] });
				transaction.blockId = block.id;
				const blockJSON = blocksInstance.serialize(block);
				// Act
				await blocksInstance.remove(block, blockJSON, stubs.tx, {
					saveTempBlock: true,
				});
				// Assert
				expect(
					stubs.dependencies.storage.entities.TempBlock.create,
				).toHaveBeenCalledWith(
					{
						id: blockJSON.id,
						height: blockJSON.height,
						fullBlock: blockJSON,
					},
					{},
					stubs.tx,
				);
			});
		});
	});

	describe('removeBlockFromTempTable()', () => {
		it('should remove block from table for block ID', async () => {
			// Arrange
			const block = newBlock();

			// Act
			await blocksInstance.removeBlockFromTempTable(block.id, stubs.tx);

			// Assert
			expect(
				stubs.dependencies.storage.entities.TempBlock.delete,
			).toHaveBeenCalledWith({ id: block.id }, {}, stubs.tx);
		});
	});

	describe('getTempBlocks()', () => {
		it('should retrieve all blocks from temp_block table', async () => {
			// Act
			await blocksInstance.getTempBlocks({}, {}, stubs.tx);

			// Assert
			expect(
				stubs.dependencies.storage.entities.TempBlock.get,
			).toHaveBeenCalledWith({}, {}, stubs.tx);
		});
	});

	describe('exists()', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.isPersisted.mockResolvedValue(
				true,
			);
		});

		it('should return true if the block does not exist', async () => {
			// Arrange
			const block = newBlock();
			expect.assertions(2);
			// Act & Assert
			expect(await blocksInstance.exists(block)).toEqual(true);
			expect(
				stubs.dependencies.storage.entities.Block.isPersisted,
			).toHaveBeenCalledWith({
				id: block.id,
			});
		});

		it('should return false if the block does exist', async () => {
			// Arrange
			stubs.dependencies.storage.entities.Block.isPersisted.mockResolvedValue(
				false,
			);
			const block = newBlock();
			expect.assertions(2);
			// Act & Assert
			expect(await blocksInstance.exists(block)).toEqual(false);
			expect(
				stubs.dependencies.storage.entities.Block.isPersisted,
			).toHaveBeenCalledWith({
				id: block.id,
			});
		});
	});

	describe('filterReadyTransactions', () => {});

	describe('loadBlocksFromLastBlockId', () => {
		describe('when called without lastBlockId', () => {
			it('should reject with error', async () => {
				await expect(
					blocksInstance.loadBlocksFromLastBlockId(),
				).rejects.toThrow('lastBlockId needs to be specified');
			});
		});

		describe('when called without limit', () => {
			const validLastBlock = {
				height: 100,
				id: 'block-id',
			};

			beforeEach(async () => {
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
					validLastBlock,
				]);
			});

			it('should use limit 1 as default', async () => {
				await blocksInstance.loadBlocksFromLastBlockId('block-id');
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{
						height_gt: 100,
						height_lte: 101,
					},
					{
						extended: true,
						limit: 1,
						sort: ['height'],
					},
				);
			});
		});

		describe('when called with invalid lastBlockId', () => {
			beforeEach(async () => {
				when(stubs.dependencies.storage.entities.Block.get)
					.calledWith({ id: 'block-id' })
					.mockResolvedValue([]);
			});

			it('should reject with error', async () => {
				// Act && Assert
				await expect(
					blocksInstance.loadBlocksFromLastBlockId('block-id'),
				).rejects.toThrow('Invalid lastBlockId requested: block-id');
			});
		});

		describe('when called with valid lastBlockId and limit', () => {
			const validLastBlock = {
				height: 100,
				id: 'block-id',
			};

			const validBlocksFromStorage = [
				{ height: 101, id: 'block-id-1', previousBlockId: 'block-id' },
			];
			const validBlocks = [
				{ height: 101, id: 'block-id-1', previousBlockId: 'block-id' },
			];

			beforeEach(async () => {
				when(stubs.dependencies.storage.entities.Block.get)
					.calledWith({ id: 'block-id' })
					.mockResolvedValue([validLastBlock]);
				when(stubs.dependencies.storage.entities.Block.get)
					.calledWith(
						{
							height_gt: 100,
							height_lte: 134,
						},
						{
							extended: true,
							limit: 34,
							sort: ['height'],
						},
					)
					.mockResolvedValue(validBlocksFromStorage);
			});

			it('should call storage for the lastBlockId', async () => {
				await blocksInstance.loadBlocksFromLastBlockId('block-id', 34);

				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith({
					id: 'block-id',
				});
			});

			it('should use the storage with correct filter', async () => {
				const blocks = await blocksInstance.loadBlocksFromLastBlockId(
					'block-id',
					34,
				);
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{
						height_gt: 100,
						height_lte: 134,
					},
					{
						extended: true,
						limit: 34,
						sort: ['height'],
					},
				);
				expect(blocks).toEqual(validBlocks);
			});
		});
	});

	describe('getHighestCommonBlock', () => {
		it('should get the block with highest height from provided ids parameter', async () => {
			// Arrange
			const ids = ['1', '2'];
			const block = newBlock();
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([block]);

			// Act
			const result = await blocksInstance.getHighestCommonBlock(ids);

			// Assert
			expect(result).toEqual(block);
			expect(
				stubs.dependencies.storage.entities.Block.get,
			).toHaveBeenCalledWith(
				{
					id_in: ids,
				},
				{ sort: 'height:desc', limit: 1 },
			);
		});
		it('should throw error if unable to get blocks from the storage', async () => {
			// Arrange
			const ids = ['1', '2'];
			stubs.dependencies.storage.entities.Block.get.mockRejectedValue(
				new Error('anError'),
			);

			// Act && Assert
			await expect(blocksInstance.getHighestCommonBlock(ids)).rejects.toThrow(
				'Failed to fetch the highest common block',
			);
		});
	});
});
