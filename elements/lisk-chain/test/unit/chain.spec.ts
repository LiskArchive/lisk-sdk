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
import { KVStore, NotFoundError, formatInt } from '@liskhq/lisk-db';
import { Chain } from '../../src/chain';
import { StateStore } from '../../src/state_store';
import {
	createValidDefaultBlock,
	genesisBlock as getGenesisBlock,
	defaultNetworkIdentifier,
	defaultBlockHeaderAssetSchema,
	encodedDefaultBlock,
	encodeDefaultBlockHeader,
} from '../utils/block';
import { registeredTransactions } from '../utils/registered_transactions';
import { Block } from '../../src/types';
import {
	defaultAccountAssetSchema,
	createFakeDefaultAccount,
} from '../utils/account';
import { getTransferTransaction } from '../utils/transaction';

jest.mock('events');
jest.mock('@liskhq/lisk-db');

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
	let genesisBlock: Block;
	let chainInstance: Chain;
	let db: any;

	beforeEach(() => {
		genesisBlock = getGenesisBlock();
		// Arrange
		db = new KVStore('temp');
		(db.createReadStream as jest.Mock).mockReturnValue(Readable.from([]));

		chainInstance = new Chain({
			db,
			genesisBlock,
			networkIdentifier: defaultNetworkIdentifier,
			registeredTransactions,
			accountAsset: {
				schema: defaultAccountAssetSchema,
				default: createFakeDefaultAccount().asset,
			},
			registeredBlocks: {
				0: defaultBlockHeaderAssetSchema,
				2: defaultBlockHeaderAssetSchema,
			},
			...constants,
		});
		(chainInstance as any)._lastBlock = genesisBlock;
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

	describe('init', () => {
		beforeEach(() => {
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([{ value: genesisBlock.header.id }]),
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
					header: {
						...genesisBlock.header,
						signature: genesisBlock.header.signature.slice(1),
						id: genesisBlock.header.id.slice(1),
					},
				};
				when(db.get)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(mutatedGenesisBlock.header.id as never)
					.calledWith(
						`blocks:id:${mutatedGenesisBlock.header.id.toString('binary')}`,
					)
					.mockResolvedValue(
						encodeDefaultBlockHeader(mutatedGenesisBlock.header) as never,
					);

				// Act & Assert
				await expect(chainInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block transactionRoot is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					header: {
						...genesisBlock.header,
						transactionRoot: genesisBlock.header.transactionRoot.slice(10),
					},
				};
				when(db.get)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(mutatedGenesisBlock.header.id as never)
					.calledWith(
						`blocks:id:${mutatedGenesisBlock.header.id.toString('binary')}`,
					)
					.mockResolvedValue(
						encodeDefaultBlockHeader(mutatedGenesisBlock.header) as never,
					);
				// Act & Assert
				await expect(chainInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block signature is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					header: {
						...genesisBlock.header,
						signature: genesisBlock.header.signature.slice(61),
					},
				};
				when(db.get)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(mutatedGenesisBlock.header.id as never)
					.calledWith(
						`blocks:id:${mutatedGenesisBlock.header.id.toString('binary')}`,
					)
					.mockResolvedValue(
						encodeDefaultBlockHeader(mutatedGenesisBlock.header) as never,
					);
				// Act & Assert
				await expect(chainInstance.init()).rejects.toEqual(error);
			});

			it('should not throw when genesis block matches', async () => {
				when(db.get)
					.mockRejectedValue(new NotFoundError('Data not found') as never)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(genesisBlock.header.id as never)
					.calledWith(`blocks:id:${genesisBlock.header.id.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultBlockHeader(genesisBlock.header) as never,
					);
				// Act & Assert
				await expect(chainInstance.init()).resolves.toBeUndefined();
			});
		});

		describe('loadLastBlock', () => {
			let lastBlock: Block;
			beforeEach(() => {
				// Arrange
				lastBlock = createValidDefaultBlock({ header: { height: 103 } });
				(db.createReadStream as jest.Mock).mockReturnValue(
					Readable.from([{ value: lastBlock.header.id }]),
				);
				when(db.get)
					.mockRejectedValue(new NotFoundError('Data not found') as never)
					.calledWith(`blocks:height:${formatInt(1)}`)
					.mockResolvedValue(genesisBlock.header.id as never)
					.calledWith(`blocks:id:${genesisBlock.header.id.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultBlockHeader(genesisBlock.header) as never,
					)
					.calledWith(`blocks:id:${lastBlock.header.id.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultBlockHeader(lastBlock.header) as never,
					);
				jest
					.spyOn(chainInstance.dataAccess, 'getBlockHeadersByHeightBetween')
					.mockResolvedValue([]);
			});
			it('should throw an error when Block.get throws error', async () => {
				// Act & Assert
				(db.createReadStream as jest.Mock).mockReturnValue(
					Readable.from([{ value: Buffer.from('randomID') }]),
				);
				await expect(chainInstance.init()).rejects.toThrow(
					'Failed to load last block',
				);
			});

			it('should return the the stored last block', async () => {
				// Act
				await chainInstance.init();

				// Assert
				expect(chainInstance.lastBlock.header.id).toEqual(lastBlock.header.id);
				expect(
					chainInstance.dataAccess.getBlockHeadersByHeightBetween,
				).toHaveBeenCalledWith(1, 103);
			});
		});
	});

	describe('newStateStore', () => {
		beforeEach(() => {
			// eslint-disable-next-line dot-notation
			chainInstance['_lastBlock'] = createValidDefaultBlock({
				header: { height: 532 },
			});
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockHeadersByHeightBetween')
				.mockResolvedValue([
					createValidDefaultBlock().header,
					genesisBlock.header,
				] as never);
		});

		it('should populate the chain state with genesis block', async () => {
			chainInstance['_lastBlock'] = createValidDefaultBlock({
				header: { height: 1 },
			});
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
				chainInstance.lastBlock.header.height - 309,
				chainInstance.lastBlock.header.height,
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
				chainInstance.lastBlock.header.height - 310,
				chainInstance.lastBlock.header.height - 1,
			);
		});
	});

	describe('save', () => {
		let stateStoreStub: StateStore;
		let batchMock: any;
		let savingBlock: Block;

		const fakeAccounts = [
			createFakeDefaultAccount(),
			createFakeDefaultAccount(),
		];

		beforeEach(() => {
			savingBlock = createValidDefaultBlock({ header: { height: 300 } });
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
				`tempBlocks:height:${formatInt(savingBlock.header.height)}`,
			);
			expect(stateStoreStub.finalize).toHaveBeenCalledTimes(1);
		});

		it('should save block', async () => {
			await chainInstance.save(savingBlock, stateStoreStub);
			expect(batchMock.put).toHaveBeenCalledWith(
				`blocks:id:${savingBlock.header.id.toString('binary')}`,
				expect.anything(),
			);
			expect(batchMock.put).toHaveBeenCalledWith(
				`blocks:height:${formatInt(savingBlock.header.height)}`,
				expect.anything(),
			);
			expect(stateStoreStub.finalize).toHaveBeenCalledTimes(1);
		});

		it('should emit block and accounts', async () => {
			// Arrange
			jest.spyOn((chainInstance as any).events, 'emit');
			const block = createValidDefaultBlock();

			// Act
			await chainInstance.save(block, stateStoreStub);

			// Assert
			expect((chainInstance as any).events.emit).toHaveBeenCalledWith(
				'EVENT_NEW_BLOCK',
				{
					accounts: fakeAccounts,
					block,
				},
			);
		});
	});

	describe('remove', () => {
		const fakeAccounts = [
			createFakeDefaultAccount(),
			createFakeDefaultAccount(),
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
				chainInstance.remove(genesisBlock, stateStoreStub),
			).rejects.toThrow('Cannot delete genesis block');
		});

		it('should throw an error when previous block does not exist in the database', async () => {
			// Arrange
			(db.get as jest.Mock).mockRejectedValue(
				new NotFoundError('Data not found') as never,
			);
			const block = createValidDefaultBlock();
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
			const block = createValidDefaultBlock();
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
			const block = createValidDefaultBlock();
			// Act
			await chainInstance.remove(block, stateStoreStub);
			// Assert
			expect(batchMock.put).not.toHaveBeenCalledWith(
				`tempBlocks:height:${formatInt(block.header.height)}`,
				block,
			);
		});

		it('should create entry in temp block with full block when saveTempBlock is true', async () => {
			// Arrange
			jest
				.spyOn(chainInstance.dataAccess, 'getBlockByID')
				.mockResolvedValue(genesisBlock as never);
			const tx = getTransferTransaction();
			const block = createValidDefaultBlock({ payload: [tx] });
			// Act
			await chainInstance.remove(block, stateStoreStub, {
				saveTempBlock: true,
			});
			// Assert
			expect(batchMock.put).toHaveBeenCalledWith(
				`tempBlocks:height:${formatInt(block.header.height)}`,
				encodedDefaultBlock(block),
			);
		});

		it('should emit block and accounts', async () => {
			// Arrange
			jest.spyOn((chainInstance as any).events, 'emit');
			const block = createValidDefaultBlock();

			// Act
			await chainInstance.save(block, stateStoreStub);

			// Assert
			expect((chainInstance as any).events.emit).toHaveBeenCalledWith(
				'EVENT_NEW_BLOCK',
				{
					accounts: fakeAccounts,
					block,
				},
			);
		});
	});

	describe('exists()', () => {
		it('should return true if the block does not exist', async () => {
			// Arrange
			const block = createValidDefaultBlock();
			when(db.exists)
				.calledWith(`blocks:id:${block.header.id.toString('binary')}`)
				.mockResolvedValue(true as never);
			// Act & Assert
			expect(await chainInstance.exists(block)).toEqual(true);
			expect(db.exists).toHaveBeenCalledWith(
				`blocks:id:${block.header.id.toString('binary')}`,
			);
		});

		it('should return false if the block does exist', async () => {
			// Arrange
			const block = createValidDefaultBlock();
			when(db.exists)
				.calledWith(`blocks:id:${block.header.id.toString('binary')}`)
				.mockResolvedValue(false as never);
			// Act & Assert
			expect(await chainInstance.exists(block)).toEqual(false);
			expect(db.exists).toHaveBeenCalledWith(
				`blocks:id:${block.header.id.toString('binary')}`,
			);
		});
	});
});
