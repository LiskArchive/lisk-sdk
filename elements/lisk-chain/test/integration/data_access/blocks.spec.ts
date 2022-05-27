/*
 * Copyright © 2020 Lisk Foundation
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
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as path from 'path';
import * as fs from 'fs-extra';
import { KVStore, formatInt, NotFoundError, InMemoryKVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes, hash, intToBuffer } from '@liskhq/lisk-cryptography';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import { encodeByteArray, Storage } from '../../../src/data_access/storage';
import { createValidDefaultBlock } from '../../utils/block';
import { getTransaction } from '../../utils/transaction';
import { Block, BlockAssets, CurrentState, SMTStore, StateStore, Transaction } from '../../../src';
import { DataAccess } from '../../../src/data_access';
import { Event } from '../../../src/event';
import { stateDiffSchema } from '../../../src/schema';
import {
	DB_KEY_BLOCKS_ID,
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_TRANSACTIONS_ID,
	DB_KEY_TEMPBLOCKS_HEIGHT,
	DB_KEY_DIFF_STATE,
	DB_KEY_TRANSACTIONS_BLOCK_ID,
	DB_KEY_STATE_STORE,
	DB_KEY_BLOCK_EVENTS,
} from '../../../src/db_keys';
import { concatDBKeys } from '../../../src/utils';
import { toSMTKey } from '../../../src/state_store/utils';

describe('dataAccess.blocks', () => {
	const emptyEncodedDiff = codec.encode(stateDiffSchema, {
		created: [],
		updated: [],
		deleted: [],
	});
	let db: KVStore;
	let storage: Storage;
	let dataAccess: DataAccess;
	let blocks: Block[];

	beforeAll(() => {
		const parentPath = path.join(__dirname, '../../tmp/blocks');
		fs.ensureDirSync(parentPath);
		db = new KVStore(path.join(parentPath, '/test-blocks.db'));
		storage = new Storage(db);
	});

	beforeEach(async () => {
		dataAccess = new DataAccess({
			db,
			minBlockHeaderCache: 3,
			maxBlockHeaderCache: 5,
			keepEventsForHeights: -1,
		});
		// Prepare sample data
		const block300 = await createValidDefaultBlock({
			header: { height: 300 },
			transactions: [getTransaction()],
		});

		const block301 = await createValidDefaultBlock({ header: { height: 301 } });

		const block302 = await createValidDefaultBlock({
			header: { height: 302 },
			transactions: [getTransaction({ nonce: BigInt(1) }), getTransaction({ nonce: BigInt(2) })],
			assets: new BlockAssets([{ moduleID: 3, data: getRandomBytes(64) }]),
		});

		const block303 = await createValidDefaultBlock({
			header: { height: 303 },
			assets: new BlockAssets([{ moduleID: 3, data: getRandomBytes(64) }]),
		});

		const events = [
			new Event({
				data: getRandomBytes(20),
				index: 0,
				moduleID: Buffer.from([0, 0, 0, 2]),
				topics: [getRandomBytes(32)],
				typeID: Buffer.from([0, 0, 0, 0]),
			}),
			new Event({
				data: getRandomBytes(20),
				index: 1,
				moduleID: Buffer.from([0, 0, 0, 3]),
				topics: [getRandomBytes(32)],
				typeID: Buffer.from([0, 0, 0, 0]),
			}),
		];

		blocks = [block300, block301, block302, block303];
		const batch = db.batch();
		for (const block of blocks) {
			const { transactions, header } = block;
			batch.put(concatDBKeys(DB_KEY_BLOCKS_ID, header.id), header.getBytes());
			batch.put(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(header.height)), header.id);
			if (transactions.length) {
				batch.put(
					concatDBKeys(DB_KEY_TRANSACTIONS_BLOCK_ID, header.id),
					Buffer.concat(transactions.map(tx => tx.id)),
				);

				for (const tx of transactions) {
					batch.put(concatDBKeys(DB_KEY_TRANSACTIONS_ID, tx.id), tx.getBytes());
				}
			}
			batch.put(
				concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(block.header.height)),
				encodeByteArray(events.map(e => e.getBytes())),
			);
			batch.put(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(blocks[2].header.height)),
				blocks[2].getBytes(),
			);
			batch.put(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(blocks[3].header.height)),
				blocks[3].getBytes(),
			);
			batch.put(
				concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(blocks[3].header.height + 1)),
				blocks[3].getBytes(),
			);
			batch.put(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(block.header.height)), emptyEncodedDiff);
		}
		await batch.write();
		dataAccess.resetBlockHeaderCache();
	});

	afterEach(async () => {
		await db.clear();
		dataAccess.resetBlockHeaderCache();
	});

	describe('getBlockHeaderByID', () => {
		it('should throw not found error if non existent ID is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getBlockHeaderByID(Buffer.from('randomId'));
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return block header by ID', async () => {
			const header = await dataAccess.getBlockHeaderByID(blocks[0].header.id);
			expect(header.toObject()).toStrictEqual(blocks[0].header.toObject());
		});
	});

	describe('getBlockHeadersByIDs', () => {
		it('should not throw "not found" error if non existent ID is specified', async () => {
			const res = await dataAccess.getBlockHeadersByIDs([
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);

			expect(res.map(h => h.toObject())).toEqual([blocks[1].header.toObject()]);
		});

		it('should return existent blocks headers if non existent ID is specified', async () => {
			const res = await dataAccess.getBlockHeadersByIDs([
				blocks[0].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);

			expect(res.map(b => b.toObject())).toEqual([
				blocks[0].header.toObject(),
				blocks[1].header.toObject(),
			]);
		});

		it('should return block headers by ID', async () => {
			const headers = await dataAccess.getBlockHeadersByIDs([
				blocks[1].header.id,
				blocks[0].header.id,
			]);
			const { header } = blocks[1];

			expect(headers[0].toObject()).toEqual(header.toObject());
			expect(headers).toHaveLength(2);
		});
	});

	describe('getBlocksByIDs', () => {
		it('should not throw "not found" error if non existent ID is specified', async () => {
			const res = await dataAccess.getBlocksByIDs([Buffer.from('random-id'), blocks[1].header.id]);
			expect(res).toHaveLength(1);
			expect(res[0].header.toObject()).toEqual(blocks[1].header.toObject());
		});

		it('should return existent blocks if non existent ID is specified', async () => {
			const blocksFound = await dataAccess.getBlocksByIDs([
				blocks[0].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);

			expect(blocksFound[0].header.toObject()).toEqual(blocks[0].header.toObject());
			expect(blocksFound[0].transactions[0]).toBeInstanceOf(Transaction);
			expect(blocksFound[0].transactions[0].id).toEqual(blocks[0].transactions[0].id);
			expect(blocksFound[1].header.toObject()).toEqual(blocks[1].header.toObject());
			expect(blocksFound).toHaveLength(2);
		});

		it('should return blocks by ID', async () => {
			const blocksFound = await dataAccess.getBlocksByIDs([
				blocks[1].header.id,
				blocks[0].header.id,
			]);

			expect(blocksFound).toHaveLength(2);
			expect(blocksFound[0].header.toObject()).toEqual(blocks[1].header.toObject());
			expect(blocksFound[1].header.toObject()).toEqual(blocks[0].header.toObject());
			expect(blocksFound[1].transactions[0]).toBeInstanceOf(Transaction);
			expect(blocksFound[1].transactions[0].id).toEqual(blocks[0].transactions[0].id);
		});
	});

	describe('getBlockHeadersByHeightBetween', () => {
		it('should return block headers with in the height order by height', async () => {
			const headers = await dataAccess.getBlockHeadersByHeightBetween(
				blocks[0].header.height,
				blocks[2].header.height,
			);
			const { header } = blocks[2];

			expect(headers).toHaveLength(3);
			expect(headers[0].toObject()).toEqual(header.toObject());
		});
	});

	describe('getBlockHeadersWithHeights', () => {
		it('should not throw "not found" error if one of heights does not exist', async () => {
			const res = await dataAccess.getBlockHeadersWithHeights([blocks[1].header.height, 500]);
			expect(res.map(h => h.toObject())).toEqual([blocks[1].header.toObject()]);
		});

		it('should return existent blocks if non existent height is specified', async () => {
			const headers = await dataAccess.getBlockHeadersWithHeights([
				blocks[1].header.height,
				blocks[3].header.height,
				500,
			]);

			expect(headers.map(h => h.toObject())).toEqual([
				blocks[1].header.toObject(),
				blocks[3].header.toObject(),
			]);
			expect(headers).toHaveLength(2);
		});

		it('should return block headers by height', async () => {
			const headers = await dataAccess.getBlockHeadersWithHeights([
				blocks[1].header.height,
				blocks[3].header.height,
			]);

			expect(headers[0].toObject()).toEqual(blocks[1].header.toObject());
			expect(headers[1].toObject()).toEqual(blocks[3].header.toObject());
			expect(headers).toHaveLength(2);
		});
	});

	describe('getLastBlockHeader', () => {
		it('should return block header with highest height', async () => {
			const lastBlockHeader = await dataAccess.getLastBlockHeader();
			expect(lastBlockHeader.toObject()).toEqual(blocks[3].header.toObject());
		});
	});

	describe('getLastCommonBlockHeader', () => {
		it('should return highest block header id which exist in the list and non-existent should not throw', async () => {
			const commonBlockID = await dataAccess.getHighestCommonBlockID([
				blocks[3].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);
			expect(commonBlockID).toEqual(blocks[3].header.id);
		});
	});

	describe('getBlockByID', () => {
		it('should throw not found error if non existent ID is specified', async () => {
			expect.assertions(1);
			try {
				await dataAccess.getBlockByID(Buffer.from('randomId'));
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return full block by ID', async () => {
			const block = await dataAccess.getBlockByID(blocks[0].header.id);
			expect(block.header.toObject()).toStrictEqual(blocks[0].header.toObject());
			expect(block.transactions[0]).toBeInstanceOf(Transaction);
			expect(block.transactions[0].id).toStrictEqual(blocks[0].transactions[0].id);
			expect(block.assets.getAsset(3)).toEqual(blocks[0].assets.getAsset(3));
		});
	});

	describe('getBlockByHeight', () => {
		it('should throw not found error if non existent height is specified', async () => {
			expect.assertions(1);
			try {
				await dataAccess.getBlockByHeight(500);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return full block by height', async () => {
			const block = await dataAccess.getBlockByHeight(blocks[2].header.height);
			expect(block.header.toObject()).toStrictEqual(blocks[2].header.toObject());
			expect(block.transactions[0]).toBeInstanceOf(Transaction);
			expect(block.transactions[0].id).toStrictEqual(blocks[2].transactions[0].id);
		});
	});

	describe('getLastBlock', () => {
		it('should return highest height full block', async () => {
			const block = await dataAccess.getLastBlock();
			expect(block.header.toObject()).toStrictEqual(blocks[3].header.toObject());
			expect(block.transactions).toStrictEqual(blocks[3].transactions);
		});
	});

	describe('isTempBlockEmpty', () => {
		it('should return false if tempBlock exists', async () => {
			const empty = await dataAccess.isTempBlockEmpty();
			expect(empty).toBeFalse();
		});

		it('should return true if tempBlock is empty', async () => {
			await db.clear();

			const empty = await dataAccess.isTempBlockEmpty();
			expect(empty).toBeTrue();
		});
	});

	describe('clearTempBlocks', () => {
		it('should clean up all temp blocks, but not other data', async () => {
			await storage.clearTempBlocks();

			expect(await dataAccess.isTempBlockEmpty()).toBeTrue();
			const lastBlock = await dataAccess.getLastBlock();
			expect(lastBlock.header.height).toEqual(blocks[3].header.height);
		});
	});

	describe('saveBlock', () => {
		let block: Block;
		let currentState: CurrentState;

		const events = [
			new Event({
				data: getRandomBytes(20),
				index: 0,
				moduleID: Buffer.from([0, 0, 0, 2]),
				topics: [getRandomBytes(32)],
				typeID: Buffer.from([0, 0, 0, 0]),
			}),
			new Event({
				data: getRandomBytes(20),
				index: 1,
				moduleID: Buffer.from([0, 0, 0, 3]),
				topics: [getRandomBytes(32)],
				typeID: Buffer.from([0, 0, 0, 0]),
			}),
		];

		beforeEach(async () => {
			const stateStore = new StateStore(db);
			block = await createValidDefaultBlock({
				header: { height: 304 },
				transactions: [
					getTransaction({ nonce: BigInt(10) }),
					getTransaction({ nonce: BigInt(20) }),
				],
			});
			const smtStore = new SMTStore(db);
			const batchLocal = db.batch();
			const smt = new SparseMerkleTree({ db: smtStore, rootHash: block.header.stateRoot });
			const diff = await stateStore.finalize(batchLocal, smt);
			smtStore.finalize(batchLocal);

			currentState = {
				smt,
				smtStore,
				batch: batchLocal,
				diff,
				stateStore,
			};
		});

		it('should create block with all index required', async () => {
			await dataAccess.saveBlock(block, events, currentState, 0);

			await expect(db.exists(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id))).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(block.header.height))),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_BLOCK_ID, block.header.id)),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, block.transactions[0].id)),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, block.transactions[1].id)),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(block.header.height))),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(block.header.height))),
			).resolves.toBeTrue();
			const createdBlock = await dataAccess.getBlockByID(block.header.id);
			expect(createdBlock.header.toObject()).toStrictEqual(block.header.toObject());
			expect(createdBlock.transactions[0]).toBeInstanceOf(Transaction);
			expect(createdBlock.transactions[0].id).toStrictEqual(block.transactions[0].id);
			expect(createdBlock.transactions[1]).toBeInstanceOf(Transaction);
			expect(createdBlock.transactions[1].id).toStrictEqual(block.transactions[1].id);
		});

		it('should create block with all index required and remove the same height block from temp', async () => {
			await dataAccess.saveBlock(block, events, currentState, 0, true);

			await expect(db.exists(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id))).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(block.header.height))),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_BLOCK_ID, block.header.id)),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, block.transactions[0].id)),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, block.transactions[1].id)),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(block.header.height))),
			).resolves.toBeFalse();
			const createdBlock = await dataAccess.getBlockByID(block.header.id);
			expect(createdBlock.header.toObject()).toStrictEqual(block.header.toObject());
			expect(createdBlock.transactions[0]).toBeInstanceOf(Transaction);
			expect(createdBlock.transactions[0].id).toStrictEqual(block.transactions[0].id);
			expect(createdBlock.transactions[1]).toBeInstanceOf(Transaction);
			expect(createdBlock.transactions[1].id).toStrictEqual(block.transactions[1].id);
		});

		it('should delete diff before the finalized height', async () => {
			await db.put(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(99)), Buffer.from('random diff'));
			await db.put(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(100)), Buffer.from('random diff 2'));
			await dataAccess.saveBlock(block, events, currentState, 100, true);

			await expect(db.exists(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(100)))).resolves.toBeTrue();
			await expect(db.exists(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(99)))).resolves.toBeFalse();
		});

		it('should not delete events before finalized height when keepEventsForHeights == -1', async () => {
			await db.put(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(99)), Buffer.from('random diff'));
			await db.put(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(100)), Buffer.from('random diff 2'));
			await dataAccess.saveBlock(block, events, currentState, 100, true);

			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(100))),
			).resolves.toBeTrue();
			await expect(db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(99)))).resolves.toBeTrue();
		});

		it('should delete events before finalized height when keepEventsForHeights == 1', async () => {
			(dataAccess['_storage']['_keepEventsForHeights'] as any) = 1;
			await db.put(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(99)), Buffer.from('random diff'));
			await db.put(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(100)), Buffer.from('random diff 2'));
			await dataAccess.saveBlock(block, events, currentState, 100, true);

			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(100))),
			).resolves.toBeTrue();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(99))),
			).resolves.toBeFalse();
		});

		it('should maintain events for not finalized blocks', async () => {
			(dataAccess['_storage']['_keepEventsForHeights'] as any) = 0;
			await db.put(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(99)), Buffer.from('random diff'));
			await db.put(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(100)), Buffer.from('random diff 2'));
			await dataAccess.saveBlock(block, events, currentState, 50, true);

			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(100))),
			).resolves.toBeTrue();
			await expect(db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(99)))).resolves.toBeTrue();
		});
	});

	describe('deleteBlock', () => {
		let currentState: CurrentState;

		beforeEach(async () => {
			const stateStore = new StateStore(db);
			const smtStore = new SMTStore(db);
			const batch = db.batch();
			const smt = new SparseMerkleTree({ db: smtStore });
			const diff = await stateStore.finalize(batch, smt);
			smtStore.finalize(batch);

			currentState = {
				smt,
				smtStore,
				batch,
				diff,
				stateStore,
			};
		});

		it('should delete block and all related indexes', async () => {
			// Deleting temp blocks to test the saving
			await dataAccess.clearTempBlocks();
			await dataAccess.deleteBlock(blocks[2], currentState);

			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCKS_ID, blocks[2].header.id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(blocks[2].header.height))),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, blocks[2].header.id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, blocks[2].transactions[0].id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, blocks[2].transactions[1].id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(blocks[2].header.height))),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(blocks[2].header.height))),
			).resolves.toBeFalse();
		});

		it('should throw an error when there is no diff', async () => {
			// Deleting temp blocks to test the saving
			const key = concatDBKeys(DB_KEY_DIFF_STATE, formatInt(blocks[2].header.height));
			await db.del(key);
			await dataAccess.clearTempBlocks();

			await expect(dataAccess.deleteBlock(blocks[2], currentState)).rejects.toThrow(
				`Specified key ${key.toString('hex')} does not exist`,
			);
		});

		it('should delete block and all related indexes and save to temp', async () => {
			// Deleting temp blocks to test the saving
			await dataAccess.clearTempBlocks();
			await dataAccess.deleteBlock(blocks[2], currentState, true);

			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCKS_ID, blocks[2].header.id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(blocks[2].header.height))),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, blocks[2].header.id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, blocks[2].transactions[0].id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TRANSACTIONS_ID, blocks[2].transactions[1].id)),
			).resolves.toBeFalse();
			await expect(
				db.exists(concatDBKeys(DB_KEY_TEMPBLOCKS_HEIGHT, formatInt(blocks[2].header.height))),
			).resolves.toBeTrue();

			const tempBlocks = await dataAccess.getTempBlocks();
			expect(tempBlocks).toHaveLength(1);
			expect(tempBlocks[0].header.toObject()).toStrictEqual(blocks[2].header.toObject());
			expect(tempBlocks[0].transactions[0]).toBeInstanceOf(Transaction);
			expect(tempBlocks[0].transactions[0].id).toStrictEqual(blocks[2].transactions[0].id);
		});
	});

	describe('State root calculation after save/delete block', () => {
		const sequenceSchema = {
			$id: 'modules/seq/',
			type: 'object',
			properties: {
				nonce: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
			},
			required: ['nonce'],
		};

		const MODULE_ID = 14;
		const STORE_PREFIX = 1;
		let currentState: CurrentState;
		let stateStore: StateStore;
		let tempDB: InMemoryKVStore;

		const prefixedKey = (
			key: Buffer,
			moduleID: number = MODULE_ID,
			storePrefix: number = STORE_PREFIX,
		) => {
			const moduleIDBuffer = intToBuffer(moduleID, 4);
			const storePrefixBuffer = intToBuffer(storePrefix, 2);

			return Buffer.concat([DB_KEY_STATE_STORE, moduleIDBuffer, storePrefixBuffer, key]);
		};

		beforeEach(() => {
			stateStore = new StateStore(db);
			tempDB = new InMemoryKVStore();
		});

		afterAll(async () => {
			await tempDB.clear();
		});

		it('should return current stateRoot calculated after saveBlock', async () => {
			const subStore = stateStore.getStore(MODULE_ID, STORE_PREFIX);

			// 3 accounts being set with data
			const address1 = getRandomBytes(20);
			const address2 = getRandomBytes(20);
			const address3 = getRandomBytes(20);

			const data1 = codec.encode(sequenceSchema, { nonce: 10 });
			const data2 = codec.encode(sequenceSchema, { nonce: 17 });
			const data3 = codec.encode(sequenceSchema, { nonce: 29 });

			// Set 3 accounts in stateStore
			await subStore.set(address1, data1);
			await subStore.set(address2, data2);
			await subStore.set(address3, data3);

			// To calculate SMT root hash from updating each address above manually
			const smtStoreTemp = new SMTStore(tempDB);
			const smtTemp = new SparseMerkleTree({ db: smtStoreTemp });

			await smtTemp.update(toSMTKey(prefixedKey(address1)), hash(data1));
			await smtTemp.update(toSMTKey(prefixedKey(address2)), hash(data2));
			await smtTemp.update(toSMTKey(prefixedKey(address3)), hash(data3));
			const { rootHash: expectedStateRoot } = smtTemp;

			// Add the expected state root calculated to a block to be saved
			const firstBlock = await createValidDefaultBlock({
				header: { height: 304, stateRoot: expectedStateRoot },
				transactions: [
					getTransaction({ nonce: BigInt(10) }),
					getTransaction({ nonce: BigInt(20) }),
				],
			});

			// Run all the finalizeStore steps: create SMT store, batch, smt and pass it to saveBlock()
			const smtStore = new SMTStore(db);
			const batchLocal = db.batch();
			const smt = new SparseMerkleTree({ db: smtStore });
			const diff1 = await stateStore.finalize(batchLocal, smt);
			smtStore.finalize(batchLocal);

			currentState = {
				smt,
				smtStore,
				batch: batchLocal,
				diff: diff1,
				stateStore,
			};
			await dataAccess.saveBlock(firstBlock, [], currentState, 100);

			expect(smt.rootHash).toEqual(firstBlock.header.stateRoot);

			// Test another with deleting one of the keys
			await smtTemp.remove(toSMTKey(prefixedKey(address3)));
			// Add the expected state root calculated to a block to be saved
			const secondBlock = await createValidDefaultBlock({
				header: { height: 304, stateRoot: smtTemp.rootHash },
				transactions: [getTransaction({ nonce: BigInt(10) })],
			});

			const secondSubStore = stateStore.getStore(14, 1);
			await secondSubStore.del(address3);
			const secondSMTStore = new SMTStore(db);
			const secondBatch = db.batch();
			const secondSMT = new SparseMerkleTree({ db: secondSMTStore });
			const diff2 = await stateStore.finalize(secondBatch, secondSMT);
			secondSMTStore.finalize(secondBatch);

			const newCurrentState = {
				smt: secondSMT,
				smtStore: secondSMTStore,
				batch: secondBatch,
				diff: diff2,
				stateStore,
			};
			await dataAccess.saveBlock(secondBlock, [], newCurrentState, 100);
			expect(secondSMT.rootHash).toEqual(secondBlock.header.stateRoot);
		});

		it('should return previous stateRoot calculated after delete', async () => {
			const subStore = stateStore.getStore(14, 1);

			// 3 accounts being set with data
			const address1 = getRandomBytes(20);
			const address2 = getRandomBytes(20);
			const address3 = getRandomBytes(20);

			const data1 = codec.encode(sequenceSchema, { nonce: 10 });
			const data2 = codec.encode(sequenceSchema, { nonce: 17 });
			const data3 = codec.encode(sequenceSchema, { nonce: 29 });

			// Set 3 accounts in stateStore
			await subStore.set(address1, data1);
			await subStore.set(address2, data2);
			await subStore.set(address3, data3);

			// To calculate SMT root hash from updating each address above manually
			const smtStoreTemp = new SMTStore(tempDB);
			const smtTemp = new SparseMerkleTree({ db: smtStoreTemp });

			await smtTemp.update(toSMTKey(prefixedKey(address1)), hash(data1));
			await smtTemp.update(toSMTKey(prefixedKey(address2)), hash(data2));
			await smtTemp.update(toSMTKey(prefixedKey(address3)), hash(data3));
			const { rootHash: expectedStateRoot } = smtTemp;

			// Add the expected state root calculated to a block to be saved
			const firstBlock = await createValidDefaultBlock({
				header: { height: 304, stateRoot: expectedStateRoot },
				transactions: [
					getTransaction({ nonce: BigInt(10) }),
					getTransaction({ nonce: BigInt(20) }),
				],
			});

			// Run all the finalizeStore steps: create SMT store, batch, smt and pass it to saveBlock()
			const smtStore = new SMTStore(db);
			const batchLocal = db.batch();
			const smt = new SparseMerkleTree({ db: smtStore });
			const diff1 = await stateStore.finalize(batchLocal, smt);
			smtStore.finalize(batchLocal);

			currentState = {
				smt,
				smtStore,
				batch: batchLocal,
				diff: diff1,
				stateStore,
			};
			await dataAccess.saveBlock(firstBlock, [], currentState, 100);

			expect(smt.rootHash).toEqual(firstBlock.header.stateRoot);

			// Delete all the keys that were added in the last block
			await smtTemp.remove(toSMTKey(prefixedKey(address1)));
			await smtTemp.remove(toSMTKey(prefixedKey(address2)));
			await smtTemp.remove(toSMTKey(prefixedKey(address3)));

			const secondSMTStore = new SMTStore(db);
			const secondBatch = db.batch();
			const secondSMT = new SparseMerkleTree({
				db: secondSMTStore,
				rootHash: firstBlock.header.stateRoot,
			});

			const newCurrentState = {
				smt: secondSMT,
				smtStore: secondSMTStore,
				batch: secondBatch,
				diff: { updated: [], created: [], deleted: [] },
				stateStore,
			};

			await dataAccess.deleteBlock(firstBlock, newCurrentState);
			expect(secondSMT.rootHash).toEqual(smtTemp.rootHash);
		});
	});
});
