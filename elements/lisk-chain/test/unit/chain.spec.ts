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

import { Readable } from 'stream';
import { when } from 'jest-when';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { KVStore, NotFoundError, formatInt } from '@liskhq/lisk-db';
import { Chain } from '../../src/chain';
import { StateStore } from '../../src/state_store';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { newBlock } from '../utils/block';
import { registeredTransactions } from '../utils/registered_transactions';
import * as randomUtils from '../utils/random';
import { BlockInstance, BlockJSON } from '../../src/types';
import { Account } from '../../src/account';

jest.mock('events');
jest.mock('@liskhq/lisk-db');

const networkIdentifier = getNetworkIdentifier(
	genesisBlock.payloadHash,
	'Lisk',
);

describe('chain', () => {
	const constants = {
		stateBlockSize: 309,
		maxPayloadLength: 15 * 1024,
		activeDelegates: 101,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMilestones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	let chainInstance: Chain;
	let db: any;

	beforeEach(() => {
		// Arrange
		db = new KVStore('temp');
		(db.createReadStream as jest.Mock).mockReturnValue(Readable.from([]));

		chainInstance = new Chain({
			db,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
			...constants,
		});
	});

	describe('constructor', () => {
		it('should initialize private variables correctly', () => {
			// Assert stubbed values are assigned

			// Assert constants
			Object.entries(
				(chainInstance as any).constants,
			).forEach(([constantName, constantValue]) =>
				expect((constants as any)[constantName]).toEqual(constantValue),
			);
			// Assert miscellaneous
			expect(chainInstance.blockReward).toBeDefined();
			expect((chainInstance as any).blocksVerify).toBeDefined();
		});
	});

	describe('lastBlock', () => {
		beforeEach(() => {
			(chainInstance as any)._lastBlock = {
				...genesisBlock,
				receivedAt: new Date(),
			};
		});
		it('return the _lastBlock without the receivedAt property', () => {
			// Arrange
			const { receivedAt, ...block } = genesisBlock as any;
			// Assert
			expect(chainInstance.lastBlock).toEqual(block);
		});
	});

	describe('init', () => {
		beforeEach(() => {
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([{ value: genesisBlock.id }]),
			);
		});

		describe('matchGenesisBlock', () => {
			it('should throw an error when failed to load genesis block', async () => {
				// Arrange
				(db.get as jest.Mock).mockRejectedValue(
					new NotFoundError('Data not found') as never,
				);
				// Act & Assert
				await expect(chainInstance.init()).rejects.toThrow(
					'Failed to load genesis block',
				);
			});

			it('should throw an error if the genesis block id is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					id: genesisBlock.id.replace('0', '1'),
				};
				when(db.get)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(mutatedGenesisBlock.id as never)
					.calledWith(`blocks:id:${mutatedGenesisBlock.id}`)
					.mockResolvedValue(mutatedGenesisBlock as never);

				// Act & Assert
				await expect(chainInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block payloadHash is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					payloadHash: genesisBlock.payloadHash.replace('0', '1'),
				};
				when(db.get)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(mutatedGenesisBlock.id as never)
					.calledWith(`blocks:id:${mutatedGenesisBlock.id}`)
					.mockResolvedValue(mutatedGenesisBlock as never);
				// Act & Assert
				await expect(chainInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block signature is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					blockSignature: genesisBlock.blockSignature.replace('0', '1'),
				};
				when(db.get)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(mutatedGenesisBlock.id as never)
					.calledWith(`blocks:id:${mutatedGenesisBlock.id}`)
					.mockResolvedValue(mutatedGenesisBlock as never);
				// Act & Assert
				await expect(chainInstance.init()).rejects.toEqual(error);
			});

			it('should not throw when genesis block matches', async () => {
				when(db.get)
					.mockRejectedValue(new NotFoundError('Data not found') as never)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(genesisBlock.id as never)
					.calledWith(`blocks:id:${genesisBlock.id}`)
					.mockResolvedValue(genesisBlock as never);
				// Act & Assert
				await expect(chainInstance.init()).resolves.toBeUndefined();
			});
		});

		describe('loadLastBlock', () => {
			let lastBlock: BlockInstance;
			beforeEach(() => {
				// Arrange
				lastBlock = newBlock({ height: 103 });
				(db.createReadStream as jest.Mock).mockReturnValue(
					Readable.from([{ value: lastBlock.id }]),
				);
				when(db.get)
					.mockRejectedValue(new NotFoundError('Data not found') as never)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(genesisBlock.id as never)
					.calledWith(`blocks:id:${genesisBlock.id}`)
					.mockResolvedValue(genesisBlock as never)
					.calledWith(`blocks:id:${lastBlock.id}`)
					.mockResolvedValue(lastBlock as never);
				jest
					.spyOn(chainInstance.dataAccess, 'getBlockHeadersByHeightBetween')
					.mockResolvedValue([]);
			});
			it('should throw an error when Block.get throws error', async () => {
				// Act & Assert
				(db.createReadStream as jest.Mock).mockReturnValue(
					Readable.from([{ value: 'randomID' }]),
				);
				await expect(chainInstance.init()).rejects.toThrow(
					'Failed to load last block',
				);
			});

			it('should return the the stored last block', async () => {
				// Act
				await chainInstance.init();

				// Assert
				expect(chainInstance.lastBlock.id).toEqual(lastBlock.id);
				expect(
					chainInstance.dataAccess.getBlockHeadersByHeightBetween,
				).toHaveBeenCalledWith(1, 103);
			});
		});
	});

	describe('newStateStore', () => {
		beforeEach(() => {
			// eslint-disable-next-line dot-notation
			chainInstance['_lastBlock'] = newBlock({ height: 532 });
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockHeadersByHeightBetween')
				.mockResolvedValue([newBlock(), genesisBlock] as never);
		});

		it('should populate the chain state with genesis block', async () => {
			chainInstance['_lastBlock'] = newBlock({ height: 1 });
			await chainInstance.newStateStore();
			expect(
				chainInstance.dataAccess.getBlockHeadersByHeightBetween,
			).toHaveBeenCalledWith(1, 1);
		});

		it('should return with the chain state with lastBlock.height to lastBlock.height - 309', async () => {
			await chainInstance.newStateStore();
			expect(
				chainInstance.dataAccess.getBlockHeadersByHeightBetween,
			).toHaveBeenCalledWith(
				chainInstance.lastBlock.height - 309,
				chainInstance.lastBlock.height,
			);
		});

		it('should get the rewards of the last block', async () => {
			const stateStore = await chainInstance.newStateStore();

			expect(stateStore.chain.lastBlockReward.toString()).toEqual(
				stateStore.chain.lastBlockHeader.reward.toString(),
			);
		});

		it('should return with the chain state with lastBlock.height to lastBlock.height - 310', async () => {
			await chainInstance.newStateStore(1);
			expect(
				chainInstance.dataAccess.getBlockHeadersByHeightBetween,
			).toHaveBeenCalledWith(
				chainInstance.lastBlock.height - 310,
				chainInstance.lastBlock.height - 1,
			);
		});
	});

	describe('serialize', () => {
		const transaction = new TransferTransaction(randomUtils.transaction());
		const block = newBlock({ transactions: [transaction] });

		it('should convert all the field to be JSON format', () => {
			const blockInstance = chainInstance.serialize(block);
			expect(blockInstance.reward).toBe(block.reward.toString());
			expect(blockInstance.totalFee).toBe(block.totalFee.toString());
			expect(blockInstance.totalAmount).toBe(block.totalAmount.toString());
		});

		it('should have only previousBlockId property', () => {
			const blockInstance = chainInstance.serialize(block);
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
					fee: '10000000',
					nonce: '1',
					senderPublicKey:
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
					signatures: [
						'c49a1b9e8f5da4ddd9c8ad49b6c35af84c233701d53a876ef6e385a46888800334e28430166e2de8cac207452913f0e8b439b03ef8a795748ea23e28b8b1c00c',
					],
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
			seedReveal: '00000000000000000000000000000000',
			previousBlockId: '1349213844499460766',
			maxHeightPreviouslyForged: 1,
			maxHeightPrevoted: 0,
		} as BlockJSON;

		it('should convert big number field to be instance', () => {
			const blockInstance = chainInstance.deserialize(blockJSON);
			expect(typeof blockInstance.totalAmount).toBe('bigint');
			expect(typeof blockInstance.totalFee).toBe('bigint');
			expect(typeof blockInstance.reward).toBe('bigint');
		});

		it('should convert transaction to be a class', () => {
			const blockInstance = chainInstance.deserialize(blockJSON);
			expect(blockInstance.transactions[0]).toBeInstanceOf(TransferTransaction);
		});

		it('should have only previousBlockId property', () => {
			const blockInstance = chainInstance.deserialize(blockJSON);
			expect(blockInstance.previousBlockId).toBeString();
		});
	});

	describe('save', () => {
		let stateStoreStub: StateStore;
		let batchMock: any;
		let savingBlock: BlockInstance;

		const fakeAccounts = [
			Account.getDefaultAccount('1234L'),
			Account.getDefaultAccount('5678L'),
		];

		beforeEach(() => {
			savingBlock = newBlock({ height: 300 });
			batchMock = {
				put: jest.fn(),
				del: jest.fn(),
				write: jest.fn(),
			};
			(db.batch as jest.Mock).mockReturnValue(batchMock);
			stateStoreStub = {
				finalize: jest.fn(),
				account: {
					getUpdated: jest.fn().mockReturnValue(fakeAccounts),
				},
			} as any;
		});

		it('should remove tempBlock by height when removeFromTempTable is true', async () => {
			await chainInstance.save(savingBlock, stateStoreStub, {
				removeFromTempTable: true,
			});
			expect(batchMock.del).toHaveBeenCalledWith(
				`tempBlocks:height:${formatInt(savingBlock.height)}`,
			);
			expect(stateStoreStub.finalize).toHaveBeenCalledTimes(1);
		});

		it('should save block', async () => {
			await chainInstance.save(savingBlock, stateStoreStub);
			expect(batchMock.put).toHaveBeenCalledWith(
				`blocks:id:${savingBlock.id}`,
				expect.anything(),
			);
			expect(batchMock.put).toHaveBeenCalledWith(
				`blocks:height:${formatInt(savingBlock.height)}`,
				expect.anything(),
			);
			expect(stateStoreStub.finalize).toHaveBeenCalledTimes(1);
		});

		it('should emit block and accounts', async () => {
			// Arrange
			jest.spyOn((chainInstance as any).events, 'emit');
			const block = newBlock();

			// Act
			await chainInstance.save(block, stateStoreStub);

			// Assert
			expect((chainInstance as any).events.emit).toHaveBeenCalledWith(
				'NEW_BLOCK',
				{
					accounts: fakeAccounts.map(anAccount => anAccount.toJSON()),
					block: chainInstance.serialize(block),
				},
			);
		});
	});

	describe('remove', () => {
		const fakeAccounts = [
			Account.getDefaultAccount('1234L'),
			Account.getDefaultAccount('5678L'),
		];

		let stateStoreStub: StateStore;
		let batchMock: any;

		beforeEach(() => {
			batchMock = {
				put: jest.fn(),
				del: jest.fn(),
				write: jest.fn(),
			};
			(db.batch as jest.Mock).mockReturnValue(batchMock);
			stateStoreStub = {
				finalize: jest.fn(),
				account: {
					getUpdated: jest.fn().mockReturnValue(fakeAccounts),
				},
			} as any;
		});

		it('should throw an error when removing genesis block', async () => {
			// Act & Assert
			await expect(
				chainInstance.remove(
					chainInstance.deserialize(genesisBlock as any),
					stateStoreStub,
				),
			).rejects.toThrow('Cannot delete genesis block');
		});

		it('should throw an error when previous block does not exist in the database', async () => {
			// Arrange
			(db.get as jest.Mock).mockRejectedValue(
				new NotFoundError('Data not found') as never,
			);
			const block = newBlock();
			// Act & Assert
			await expect(chainInstance.remove(block, stateStoreStub)).rejects.toThrow(
				'PreviousBlock is null',
			);
		});

		it('should throw an error when deleting block fails', async () => {
			// Arrange
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockByID')
				.mockResolvedValue(genesisBlock as never);
			const deleteBlockError = new Error('Delete block failed');
			batchMock.write.mockRejectedValue(deleteBlockError);
			const block = newBlock();
			// Act & Assert
			await expect(chainInstance.remove(block, stateStoreStub)).rejects.toEqual(
				deleteBlockError,
			);
		});

		it('should not create entry in temp block table when saveToTemp flag is false', async () => {
			// Arrange
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockByID')
				.mockResolvedValue(genesisBlock as never);
			const block = newBlock();
			// Act
			await chainInstance.remove(block, stateStoreStub);
			// Assert
			expect(batchMock.put).not.toHaveBeenCalledWith(
				`tempBlocks:height:${block.height}`,
				block,
			);
		});

		it('should create entry in temp block with full block when saveTempBlock is true', async () => {
			// Arrange
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockByID')
				.mockResolvedValue(genesisBlock as never);
			const transaction = new TransferTransaction(randomUtils.transaction());
			const block = newBlock({ transactions: [transaction] });
			(transaction as any).blockId = block.id;
			const blockJSON = chainInstance.serialize(block);
			// Act
			await chainInstance.remove(block, stateStoreStub, {
				saveTempBlock: true,
			});
			// Assert
			expect(batchMock.put).not.toHaveBeenCalledWith(
				`tempBlocks:height:${block.height}`,
				blockJSON,
			);
		});

		it('should emit block and accounts', async () => {
			// Arrange
			jest.spyOn((chainInstance as any).events, 'emit');
			const block = newBlock();

			// Act
			await chainInstance.save(block, stateStoreStub);

			// Assert
			expect((chainInstance as any).events.emit).toHaveBeenCalledWith(
				'NEW_BLOCK',
				{
					accounts: fakeAccounts.map(anAccount => anAccount.toJSON()),
					block: chainInstance.serialize(block),
				},
			);
		});
	});

	describe('exists()', () => {
		it('should return true if the block does not exist', async () => {
			// Arrange
			const block = newBlock();
			when(db.exists)
				.calledWith(`blocks:id:${block.id}`)
				.mockResolvedValue(true as never);
			// Act & Assert
			expect(await chainInstance.exists(block)).toEqual(true);
			expect(db.exists).toHaveBeenCalledWith(`blocks:id:${block.id}`);
		});

		it('should return false if the block does exist', async () => {
			// Arrange
			const block = newBlock();
			when(db.exists)
				.calledWith(`blocks:id:${block.id}`)
				.mockResolvedValue(false as never);
			// Act & Assert
			expect(await chainInstance.exists(block)).toEqual(false);
			expect(db.exists).toHaveBeenCalledWith(`blocks:id:${block.id}`);
		});
	});

	describe('getHighestCommonBlock', () => {
		it('should get the block with highest height from provided ids parameter', async () => {
			// Arrange
			const ids = ['1', '2'];
			const block = newBlock();
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockHeadersByIDs')
				.mockResolvedValue([block] as never);

			// Act
			const result = await chainInstance.getHighestCommonBlock(ids);

			// Assert
			expect(
				chainInstance.dataAccess.getBlockHeadersByIDs,
			).toHaveBeenCalledWith(ids);
			expect(result).toEqual(block);
		});
		it('should throw error if unable to get blocks from the storage', async () => {
			// Arrange
			const ids = ['1', '2'];
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockHeadersByIDs')
				.mockRejectedValue(new NotFoundError('data not found') as never);
			// Act && Assert
			expect.assertions(2);
			try {
				await chainInstance.getHighestCommonBlock(ids);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
			expect(
				chainInstance.dataAccess.getBlockHeadersByIDs,
			).toHaveBeenCalledWith(ids);
		});
	});
});
