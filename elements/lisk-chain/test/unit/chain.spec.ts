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

import { NotFoundError, formatInt, BatchChain, KVStore, InMemoryKVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { Chain } from '../../src/chain';
import { StateStore } from '../../src/state_store';
import { createValidDefaultBlock, defaultNetworkIdentifier } from '../utils/block';
import { getTransaction } from '../utils/transaction';
import { stateDiffSchema } from '../../src/schema';
import { concatDBKeys } from '../../src/utils';
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
		maxPayloadLength: 15 * 1024,
	};
	const emptyEncodedDiff = codec.encode(stateDiffSchema, {
		created: [],
		updated: [],
		deleted: [],
	});
	let chainInstance: Chain;
	let genesisBlock: Block;
	let db: KVStore;

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
		db = new InMemoryKVStore() as never;

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
			expect(chainInstance.constants.maxPayloadLength).toEqual(constants.maxPayloadLength);
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

			await db.put(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(0)), genesisBlock.header.id);
			await db.put(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(1)), lastBlock.header.id);
			await db.put(
				concatDBKeys(DB_KEY_BLOCKS_ID, genesisBlock.header.id),
				genesisBlock.header.getBytes(),
			);
			await db.put(
				concatDBKeys(DB_KEY_BLOCKS_ID, lastBlock.header.id),
				lastBlock.header.getBytes(),
			);
			const finalizedHeight = Buffer.alloc(4);
			finalizedHeight.writeUInt32BE(genesisBlock.header.height, 0)
			await db.put(DB_KEY_FINALIZED_HEIGHT, finalizedHeight);
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
		let batch: BatchChain;
		let savingBlock: Block;

		beforeEach(async () => {
			savingBlock = await createValidDefaultBlock({
				header: { height: 1, previousBlockID: genesisBlock.header.id },
			});
			stateStore = new StateStore(db);
			jest.spyOn(stateStore, 'finalize');
			batch = db.batch();
			jest.spyOn(db, 'clear');
			jest.spyOn(db, 'batch').mockReturnValue(batch);
			jest.spyOn(batch, 'del');
			jest.spyOn(batch, 'put');
		});

		it('should remove diff until finalized height', async () => {
			await chainInstance.saveBlock(savingBlock, stateStore, 1, {
				removeFromTempTable: true,
			});
			expect(db.clear).toHaveBeenCalledWith({
				gte: concatDBKeys(DB_KEY_DIFF_STATE, formatInt(0)),
				lt: concatDBKeys(DB_KEY_DIFF_STATE, formatInt(1)),
			});
		});

		it('should remove tempBlock by height when removeFromTempTable is true', async () => {
			await chainInstance.saveBlock(savingBlock, stateStore, 0, {
				removeFromTempTable: true,
			});
			expect(batch.del).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(savingBlock.header.height)),
			);
			expect(stateStore.finalize).toHaveBeenCalledTimes(1);
		});

		it('should save block', async () => {
			await chainInstance.saveBlock(savingBlock, stateStore, 0);
			expect(batch.put).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_BLOCKS_ID, savingBlock.header.id),
				expect.anything(),
			);
			expect(batch.put).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(savingBlock.header.height)),
				expect.anything(),
			);
			expect(stateStore.finalize).toHaveBeenCalledTimes(1);
		});
	});

	describe('removeBlock', () => {
		let stateStore: StateStore;
		let batch: any;

		beforeEach(async () => {
			stateStore = new StateStore(db);
			jest.spyOn(stateStore, 'finalize');
			const subStore = stateStore.getStore(2, 0);
			await subStore.set(getRandomBytes(20), getRandomBytes(100));
			batch = db.batch();
			jest.spyOn(batch, 'put');
			jest.spyOn(batch, 'del');
			jest.spyOn(batch, 'write');
			jest.spyOn(db, 'batch').mockReturnValue(batch);
		});

		it('should throw an error when removing genesis block', async () => {
			// Act & Assert
			await expect(chainInstance.removeBlock(genesisBlock as any, stateStore)).rejects.toThrow(
				'Cannot delete genesis block',
			);
		});

		it('should throw an error when previous block does not exist in the database', async () => {
			// Arrange
			jest.spyOn(db, 'get').mockRejectedValue(new NotFoundError('Data not found') as never);
			const block = await createValidDefaultBlock();
			// Act & Assert
			await expect(chainInstance.removeBlock(block, stateStore)).rejects.toThrow(
				'PreviousBlock is null',
			);
		});

		it('should throw an error when deleting block fails', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockByID').mockResolvedValue(genesisBlock as never);

			const block = await createValidDefaultBlock();
			await db.put(
				concatDBKeys(DB_KEY_DIFF_STATE, formatInt(block.header.height)),
				emptyEncodedDiff,
			);

			const deleteBlockError = new Error('Delete block failed');
			batch.write.mockRejectedValue(deleteBlockError);

			// Act & Assert
			await expect(chainInstance.removeBlock(block, stateStore)).rejects.toEqual(deleteBlockError);
		});

		it('should not create entry in temp block table when saveToTemp flag is false', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockByID').mockResolvedValue(genesisBlock as never);
			const block = await createValidDefaultBlock();
			await db.put(
				concatDBKeys(DB_KEY_DIFF_STATE, formatInt(block.header.height)),
				emptyEncodedDiff,
			);
			// Act
			await chainInstance.removeBlock(block, stateStore);
			// Assert
			expect(batch.put).not.toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(block.header.height)),
				block,
			);
		});

		it('should create entry in temp block with full block when saveTempBlock is true', async () => {
			// Arrange
			jest.spyOn(chainInstance.dataAccess, 'getBlockByID').mockResolvedValue(genesisBlock as never);
			const tx = getTransaction();
			const block = await createValidDefaultBlock({ payload: [tx] });
			await db.put(
				concatDBKeys(DB_KEY_DIFF_STATE, formatInt(block.header.height)),
				emptyEncodedDiff,
			);
			// Act
			await chainInstance.removeBlock(block, stateStore, {
				saveTempBlock: true,
			});
			// Assert
			expect(batch.put).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(block.header.height)),
				block.getBytes(),
			);
		});
	});

	describe('verifyBlock', () => {
		let block: Block;

		it('should throw error if transaction root does not match', async () => {
			const txs = new Array(20).fill(0).map(() => getTransaction());
			block = await createValidDefaultBlock({
				payload: txs,
				header: { transactionRoot: Buffer.from('1234567890') },
			});
			// Act & assert
			await expect(chainInstance.verifyBlock(block)).rejects.toThrow('Invalid transaction root');
		});

		it('should throw error if payload exceeds max payload length', async () => {
			// Arrange
			(chainInstance as any).constants.maxPayloadLength = 100;
			const txs = new Array(200).fill(0).map(() => getTransaction());
			block = await createValidDefaultBlock({ payload: txs });
			// Act & assert
			await expect(chainInstance.verifyBlock(block)).rejects.toThrow('Payload length is longer than configured length: 100.');
		});
	});

	describe('validateGenesisBlockHeader', () => {
		it('should fail if "version" is not zero', () => {
			// Arrange
			(genesisBlock.header as any).version = 1;

			// Act & Assert
			expect.assertions(3);
			try {
				chainInstance.validateGenesisBlock(genesisBlock);
			} catch (error) {
				expect(error).toBeInstanceOf(LiskValidationError);
				expect((error as LiskValidationError).errors).toHaveLength(1);
				expect((error as LiskValidationError).errors[0]).toEqual(
					expect.objectContaining({
						message: 'must be equal to constant',
						params: { allowedValue: 0 },
					}),
				);
			}
		});

		it('should fail if "transactionRoot" is not empty hash', () => {
			// Arrange
			(genesisBlock.header as any)._transactionRoot = getRandomBytes(20);

			// Act & Assert
			expect.assertions(3);
			try {
				chainInstance.validateGenesisBlock(genesisBlock);
			} catch (error) {
				expect(error).toBeInstanceOf(LiskValidationError);
				expect((error as LiskValidationError).errors).toHaveLength(1);
				expect((error as LiskValidationError).errors[0]).toEqual(
					expect.objectContaining({
						message: 'should be equal to constant',
						params: { allowedValue: hash(Buffer.alloc(0)) },
					}),
				);
			}
		});

		it('should fail if "generatorAddress" is not empty buffer', () => {
			// Arrange
			(genesisBlock.header as any).generatorAddress = getRandomBytes(20);

			// Act & Assert
			expect.assertions(3);
			try {
				chainInstance.validateGenesisBlock(genesisBlock);
			} catch (error) {
				expect(error).toBeInstanceOf(LiskValidationError);
				expect((error as LiskValidationError).errors).toHaveLength(1);
				expect((error as LiskValidationError).errors[0]).toEqual(
					expect.objectContaining({
						message: 'should be equal to constant',
						params: { allowedValue: Buffer.alloc(0) },
					}),
				);
			}
		});

		it('should fail if "signature" is not empty buffer', () => {
			// Arrange
			(genesisBlock.header as any)._signature = getRandomBytes(20);

			// Act & Assert
			expect.assertions(3);
			try {
				chainInstance.validateGenesisBlock(genesisBlock);
			} catch (error) {
				expect(error).toBeInstanceOf(LiskValidationError);
				expect((error as LiskValidationError).errors).toHaveLength(1);
				expect((error as LiskValidationError).errors[0]).toEqual(
					expect.objectContaining({
						message: 'should be equal to constant',
						params: { allowedValue: Buffer.alloc(0) },
					}),
				);
			}
		});

		it('should fail if "payload" is less not empty array', () => {
			// Arrange
			(genesisBlock.payload as any) = [Buffer.from(getRandomBytes(10))];

			// Act & Assert
			expect.assertions(3);
			try {
				chainInstance.validateGenesisBlock(genesisBlock);
			} catch (error) {
				expect(error).toBeInstanceOf(LiskValidationError);
				expect((error as LiskValidationError).errors).toHaveLength(1);
				expect((error as LiskValidationError).errors[0]).toEqual(
					expect.objectContaining({
						message: 'Payload length must be zero',
						params: { allowedValue: [] },
					}),
				);
			}
		});
	});
});
