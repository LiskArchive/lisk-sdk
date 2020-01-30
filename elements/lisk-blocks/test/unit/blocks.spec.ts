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
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { Blocks } from '../../src';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { newBlock } from '../utils/block';
import { registeredTransactions } from '../utils/registered_transactions';
import * as randomUtils from '../utils/random';
import { Slots } from '../../src/slots';
import { BlockJSON } from '../../src/types';

jest.mock('events');

const networkIdentifier = getNetworkIdentifier(
	genesisBlock.payloadHash,
	'Lisk',
);

describe('blocks', () => {
	const stubs = {} as any;
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
	let blocksInstance: Blocks;
	let slots: Slots;

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
				expect((blocksInstance as any)[stubName]).toEqual(stubValue);
			});
			// Assert constants
			Object.entries(
				(blocksInstance as any).constants,
			).forEach(([constantName, constantValue]) =>
				expect((constants as any)[constantName]).toEqual(constantValue),
			);
			// Assert miscellaneous
			expect(slots).toEqual((blocksInstance as any).slots);
			expect(blocksInstance.blockReward).toBeDefined();
			expect((blocksInstance as any).blocksVerify).toBeDefined();
		});
	});

	describe('lastBlock', () => {
		beforeEach(() => {
			(blocksInstance as any)._lastBlock = {
				...genesisBlock,
				receivedAt: new Date(),
			};
		});
		it('return the _lastBlock without the receivedAt property', async () => {
			// Arrange
			const { receivedAt, ...block } = genesisBlock as any;
			// Assert
			expect(blocksInstance.lastBlock).toEqual(block);
		});
	});

	describe('init', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.begin.mockImplementation(
				(_: any, callback: any) => callback.call(blocksInstance, stubs.tx),
			);
			stubs.dependencies.storage.entities.Block.count.mockResolvedValue(5);
			stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
				genesisBlock,
			);
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.tx.batch.mockImplementation((promises: any) =>
				Promise.all(promises),
			);
			const random101DelegateAccounts = new Array(101)
				.fill('')
				.map(() => randomUtils.account());
			stubs.dependencies.storage.entities.Account.get.mockResolvedValue(
				random101DelegateAccounts,
			);
		});

		describe('matchGenesisBlock', () => {
			it('should throw an error when failed to load genesis block', async () => {
				// Arrange
				const error = new Error('Failed to load genesis block');
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([]);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block id is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					id: genesisBlock.id.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
					mutatedGenesisBlock,
				]);

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
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
					mutatedGenesisBlock,
				]);
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
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
					mutatedGenesisBlock,
				]);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should not throw when genesis block matches', async () => {
				// Act & Assert
				await expect(blocksInstance.init()).resolves.toEqual(undefined);
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
				stubs.dependencies.storage.entities.Block.get
					.mockReturnValueOnce([genesisBlock])
					.mockReturnValueOnce([]);

				// Act && Assert
				await expect(blocksInstance.init()).rejects.toThrow(errorMessage);
			});
			// TODO: The tests are minimal due to the changes we expect as part of https://github.com/LiskHQ/lisk-sdk/issues/4131
			describe('when Block.get returns rows', () => {
				it('should return the first record from storage entity', async () => {
					// Arrange
					stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
						genesisBlock,
						newBlock(),
					]);
					// Act
					await blocksInstance.init();

					// Assert
					expect(blocksInstance.lastBlock.id).toEqual(genesisBlock.id);
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
		} as BlockJSON;

		it('should convert big number field to be instance', () => {
			const blockInstance = blocksInstance.deserialize(blockJSON);
			expect(typeof blockInstance.totalAmount).toBe('bigint');
			expect(typeof blockInstance.totalFee).toBe('bigint');
			expect(typeof blockInstance.reward).toBe('bigint');
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
			stubs.tx.batch.mockImplementation((promises: any) =>
				Promise.all(promises),
			);
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
				reward: '0',
				totalAmount: '0',
				totalFee: '0',
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
			(transaction as any).blockId = block.id;
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
			).resolves.toEqual(undefined);
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
					blocksInstance.remove(block, blocksInstance.serialize(block), {
						saveTempBlock: true,
					}),
				).rejects.toEqual(tempBlockCreateError);
			});

			it('should create entry in temp block with correct id, height and block property and tx', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());
				const block = newBlock({ transactions: [transaction] });
				(transaction as any).blockId = block.id;
				const blockJSON = blocksInstance.serialize(block);
				// Act
				await blocksInstance.remove(block, blockJSON, {
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
		it('should retrieve all blocks from temp_blocks table', async () => {
			// Act
			await blocksInstance.getTempBlocks();

			// Assert
			expect(
				stubs.dependencies.storage.entities.TempBlock.get,
			).toHaveBeenCalled();
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

	describe('getBlocksWithLimitAndOffset', () => {
		describe('when called without offset', () => {
			const validBlocks = [
				{
					height: 100,
					id: 'block-id',
				},
			];

			beforeEach(async () => {
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue(
					validBlocks,
				);
			});

			it('should use limit 1 as default', async () => {
				await blocksInstance.dataAccess.getBlocksWithLimitAndOffset(1);

				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{ height_gte: 0, height_lte: 0 },
					{ extended: true, limit: null, sort: 'height:desc' },
				);
			});
		});

		describe('when blocks received in desending order', () => {
			const validBlocks = [
				{
					height: 101,
					id: 'block-id1',
				},
				{
					height: 100,
					id: 'block-id2',
				},
			];

			beforeEach(async () => {
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue(
					validBlocks,
				);
			});

			it('should be sorted ascending by height', async () => {
				const blocks = await blocksInstance.dataAccess.getBlocksWithLimitAndOffset(
					2,
					100,
				);

				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{ height_gte: 100, height_lte: 101 },
					{ extended: true, limit: null, sort: 'height:desc' },
				);
				expect(blocks.map(b => b.height)).toEqual(
					validBlocks.map(b => b.height).sort((a, b) => a - b),
				);
			});
		});
	});

	describe('loadBlocksFromLastBlockId', () => {
		describe('when called without lastBlockId', () => {
			it('should reject with error', async () => {
				await expect(
					blocksInstance.loadBlocksFromLastBlockId(undefined as any),
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
				).toHaveBeenCalledWith({ id_in: ['block-id'] }, {});
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{ height_gte: 101, height_lte: 101 },
					{ extended: true, limit: null, sort: 'height:desc' },
				);
			});
		});

		describe('when called with invalid lastBlockId', () => {
			beforeEach(async () => {
				when<any, any>(stubs.dependencies.storage.entities.Block.get)
					.calledWith({ id_in: ['block-id'] })
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

			beforeEach(async () => {
				when<any, any>(stubs.dependencies.storage.entities.Block.get)
					.calledWith({ id_in: ['block-id'] })
					.mockResolvedValue([validLastBlock]);
				when<any, any>(stubs.dependencies.storage.entities.Block.get)
					.calledWith(
						{ height_gte: 101, height_lte: 134 },
						{ extended: true, limit: null, sort: 'height:desc' },
					)
					.mockResolvedValue(validBlocksFromStorage);
			});

			it('should call storage for the lastBlockId', async () => {
				await blocksInstance.loadBlocksFromLastBlockId('block-id', 34);

				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith({ id_in: ['block-id'] }, {});
			});

			it('should use the storage with correct filter', async () => {
				const blocks = await blocksInstance.loadBlocksFromLastBlockId(
					'block-id',
					34,
				);
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith({ id_in: ['block-id'] }, {});
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{ height_gte: 101, height_lte: 134 },
					{ extended: true, limit: null, sort: 'height:desc' },
				);
				expect(blocks[0].height).toEqual(validBlocksFromStorage[0].height);
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
