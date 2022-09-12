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
/* eslint-disable jest/no-try-expect */

import { NotFoundError, Batch, Database, InMemoryDatabase } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { Chain } from '../../src/chain';
import { CurrentState, StateStore } from '../../src/state_store';
import { createValidDefaultBlock, defaultNetworkIdentifier } from '../utils/block';
import { getTransaction } from '../utils/transaction';
import { stateDiffSchema } from '../../src/schema';
import { concatDBKeys, uint32BE } from '../../src/utils';
import {
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_BLOCKS_ID,
	DB_KEY_DIFF_STATE,
	DB_KEY_FINALIZED_HEIGHT,
	DB_KEY_TEMPBLOCKS_HEIGHT,
} from '../../src/db_keys';
import { Block } from '../../src/block';
import {
	DEFAULT_MAX_BLOCK_HEADER_CACHE,
	DEFAULT_MIN_BLOCK_HEADER_CACHE,
} from '../../src/constants';

describe('chain', () => {
	const constants = {
		maxTransactionsSize: 15 * 1024,
		keepEventsForHeights: 300,
	};
	const emptyEncodedDiff = codec.encode(stateDiffSchema, {
		created: [],
		updated: [],
		deleted: [],
	});
	let chainInstance: Chain;
	let genesisBlock: Block;
	let db: Database;

	beforeEach(async () => {
		genesisBlock = await createValidDefaultBlock({
			header: {
				version: 0,
				height: 0,
				transactionRoot: Buffer.from(
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					'hex',
				),
				timestamp: 1610643809,
				stateRoot: Buffer.from(
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					'hex',
				),
				generatorAddress: Buffer.alloc(0),
				previousBlockID: Buffer.alloc(0),
			},
		});
		genesisBlock.header['_signature'] = Buffer.alloc(0);
		// Arrange
		db = new InMemoryDatabase() as never;

		chainInstance = new Chain({
			...constants,
		});
		chainInstance.init({
			db,
			genesisBlock,
			networkIdentifier: defaultNetworkIdentifier,
		});
		chainInstance['_lastBlock'] = genesisBlock;
	});

	describe('constructor', () => {
		it('should initialize private variables correctly', () => {
			expect(chainInstance.constants.maxTransactionsSize).toEqual(constants.maxTransactionsSize);
			expect(chainInstance.constants.minBlockHeaderCache).toEqual(DEFAULT_MIN_BLOCK_HEADER_CACHE);
			expect(chainInstance.constants.maxBlockHeaderCache).toEqual(DEFAULT_MAX_BLOCK_HEADER_CACHE);
		});
	});

	describe('genesisBlockExists', () => {
		it.todo('should throw an error when genesis block does not exist and last block does exist');
		it.todo('should return false when genesis block does not exist and last block does not exist');
		it.todo('should return true when genesis block exists');
	});

	describe('loadLastBlocks', () => {
		let lastBlock: Block;

		beforeEach(async () => {
			lastBlock = await createValidDefaultBlock({ header: { height: 1 } });

			await db.set(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, uint32BE(0)), genesisBlock.header.id);
			await db.set(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, uint32BE(1)), lastBlock.header.id);
			await db.set(
				concatDBKeys(DB_KEY_BLOCKS_ID, genesisBlock.header.id),
				genesisBlock.header.getBytes(),
			);
			await db.set(
				concatDBKeys(DB_KEY_BLOCKS_ID, lastBlock.header.id),
				lastBlock.header.getBytes(),
			);
			const finalizedHeight = Buffer.alloc(4);
			finalizedHeight.writeUInt32BE(genesisBlock.header.height, 0);
			await db.set(DB_KEY_FINALIZED_HEIGHT, finalizedHeight);
		});

		it('should throw an error when Block.get throws error', async () => {
			await db.clear();
			// Act & Assert
			await expect(chainInstance.loadLastBlocks(genesisBlock)).rejects.toThrow(
				'Failed to load last block',
			);
		});

		it('should return the the stored last block', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockHeadersByHeightBetween');
			// Act
			await chainInstance.loadLastBlocks(genesisBlock);

			// Assert
			expect(chainInstance.lastBlock.header.id).toEqual(lastBlock.header.id);
			expect(chainInstance.dataAccess.getBlockHeadersByHeightBetween).toHaveBeenCalledWith(0, 1);
		});
	});

	describe('saveBlock', () => {
		let stateStore: StateStore;
		let batch: Batch;
		let savingBlock: Block;
		let currentState: CurrentState;

		beforeEach(async () => {
			savingBlock = await createValidDefaultBlock({
				header: { height: 1, previousBlockID: genesisBlock.header.id },
			});
			stateStore = new StateStore(db);
			jest.spyOn(stateStore, 'finalize');
			batch = new Batch();
			jest.spyOn(db, 'write');
			jest.spyOn(batch, 'del');
			jest.spyOn(batch, 'set');
			currentState = {
				stateStore,
				batch,
				diff: {
					updated: [],
					created: [],
					deleted: [],
				},
			};
		});

		it('should remove diff until finalized height', async () => {
			await chainInstance.saveBlock(savingBlock, [], currentState, 1, {
				removeFromTempTable: true,
			});
			expect(db.write).toHaveBeenCalledTimes(2);
		});

		it('should remove tempBlock by height when removeFromTempTable is true', async () => {
			await chainInstance.saveBlock(savingBlock, [], currentState, 0, {
				removeFromTempTable: true,
			});
			expect(batch.del).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, uint32BE(savingBlock.header.height)),
			);
		});

		it('should save block', async () => {
			await chainInstance.saveBlock(savingBlock, [], currentState, 0);
			expect(batch.set).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_BLOCKS_ID, savingBlock.header.id),
				expect.anything(),
			);
			expect(batch.set).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_BLOCKS_HEIGHT, uint32BE(savingBlock.header.height)),
				expect.anything(),
			);
		});
	});

	describe('removeBlock', () => {
		let stateStore: StateStore;
		let batch: any;
		let currentState: CurrentState;

		beforeEach(async () => {
			stateStore = new StateStore(db);
			jest.spyOn(stateStore, 'finalize');
			const subStore = stateStore.getStore(utils.intToBuffer(2, 4), 0);
			await subStore.set(utils.getRandomBytes(20), utils.getRandomBytes(100));
			batch = new Batch();
			jest.spyOn(batch, 'set');
			jest.spyOn(batch, 'del');
			jest.spyOn(db, 'write');
			currentState = {
				stateStore,
				batch,
				diff: {
					updated: [],
					created: [],
					deleted: [],
				},
			};
		});

		it('should throw an error when removing genesis block', async () => {
			// Act & Assert
			await expect(chainInstance.removeBlock(genesisBlock as any, currentState)).rejects.toThrow(
				'Cannot delete genesis block',
			);
		});

		it('should throw an error when previous block does not exist in the database', async () => {
			// Arrange
			jest.spyOn(db, 'get').mockRejectedValue(new NotFoundError('Data not found') as never);
			const block = await createValidDefaultBlock();
			// Act & Assert
			await expect(chainInstance.removeBlock(block, currentState)).rejects.toThrow(
				'PreviousBlock is null',
			);
		});

		it('should throw an error when deleting block fails', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockByID').mockResolvedValue(genesisBlock as never);

			const block = await createValidDefaultBlock();
			await db.set(
				concatDBKeys(DB_KEY_DIFF_STATE, uint32BE(block.header.height)),
				emptyEncodedDiff,
			);

			const deleteBlockError = new Error('Delete block failed');
			(db.write as jest.Mock).mockRejectedValue(deleteBlockError);

			// Act & Assert
			await expect(chainInstance.removeBlock(block, currentState)).rejects.toEqual(
				deleteBlockError,
			);
		});

		it('should not create entry in temp block table when saveToTemp flag is false', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockByID').mockResolvedValue(genesisBlock as never);
			const block = await createValidDefaultBlock();
			await db.set(
				concatDBKeys(DB_KEY_DIFF_STATE, uint32BE(block.header.height)),
				emptyEncodedDiff,
			);
			// Act
			await chainInstance.removeBlock(block, currentState);
			// Assert
			expect(batch.set).not.toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, uint32BE(block.header.height)),
				block,
			);
		});

		it('should create entry in temp block with full block when saveTempBlock is true', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockByID').mockResolvedValue(genesisBlock as never);
			const tx = getTransaction();
			const block = await createValidDefaultBlock({ transactions: [tx] });
			await db.set(
				concatDBKeys(DB_KEY_DIFF_STATE, uint32BE(block.header.height)),
				emptyEncodedDiff,
			);
			// Act
			await chainInstance.removeBlock(block, currentState, {
				saveTempBlock: true,
			});
			// Assert
			expect(batch.set).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, uint32BE(block.header.height)),
				block.getBytes(),
			);
		});
	});

	describe('validateBlock', () => {
		let block: Block;

		it('should not throw error with a valid block', async () => {
			const txs = new Array(20).fill(0).map(() => getTransaction());
			block = await createValidDefaultBlock({
				transactions: txs,
			});
			// Act & assert
			expect(() => chainInstance.validateBlock(block, { version: 2 })).not.toThrow();
		});

		it('should throw error if transaction root does not match', async () => {
			const txs = new Array(20).fill(0).map(() => getTransaction());
			block = await createValidDefaultBlock({
				transactions: txs,
				header: { transactionRoot: Buffer.from('1234567890') },
			});
			// Act & assert
			expect(() => chainInstance.validateBlock(block, { version: 2 })).toThrow(
				'Invalid transaction root',
			);
		});

		it('should throw error if transactions exceeds max transactions length', async () => {
			// Arrange
			(chainInstance as any).constants.maxTransactionsSize = 100;
			const txs = new Array(200).fill(0).map(() => getTransaction());
			block = await createValidDefaultBlock({ transactions: txs });
			// Act & assert
			expect(() => chainInstance.validateBlock(block, { version: 2 })).toThrow(
				'Transactions length is longer than configured length: 100.',
			);
		});

		it('should throw error if block version is not as expected', async () => {
			// Arrange
			(chainInstance as any).constants.maxTransactionsSize = 100;
			const txs = new Array(200).fill(0).map(() => getTransaction());
			block = await createValidDefaultBlock({ transactions: txs });
			(block.header as any).version = 3;
			// Act & assert
			expect(() => chainInstance.validateBlock(block, { version: 2 })).toThrow(
				'Block version must be 2.',
			);
		});
	});
});
