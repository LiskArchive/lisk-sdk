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
import { Batch, Database, NotFoundError } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { Storage, formatInt } from '../../../src/data_access/storage';
import {
	createValidDefaultBlock,
	encodeDefaultBlockHeader,
	encodedDefaultBlock,
	registeredBlockHeaders,
} from '../../utils/block';
import { getTransaction } from '../../utils/transaction';
import { Block, Transaction } from '../../../src';
import { DataAccess } from '../../../src/data_access';
import { stateDiffSchema } from '../../../src/schema';
import { defaultAccountSchema, createFakeDefaultAccount } from '../../utils/account';
import { DB_KEY_ACCOUNTS_ADDRESS } from '../../../src/data_access/constants';

describe('dataAccess.blocks', () => {
	const emptyEncodedDiff = codec.encode(stateDiffSchema, {
		created: [],
		updated: [],
		deleted: [],
	});
	let db: Database;
	let storage: Storage;
	let dataAccess: DataAccess;
	let blocks: Block[];

	beforeAll(() => {
		const parentPath = path.join(__dirname, '../../tmp/blocks');
		fs.ensureDirSync(parentPath);
		db = new Database(path.join(parentPath, '/test-blocks.db'));
		storage = new Storage(db);
	});

	beforeEach(async () => {
		dataAccess = new DataAccess({
			db,
			accountSchema: defaultAccountSchema,
			registeredBlockHeaders,
			minBlockHeaderCache: 3,
			maxBlockHeaderCache: 5,
		});
		// Prepare sample data
		const block300 = createValidDefaultBlock({
			header: { height: 300 },
			payload: [getTransaction()],
		});

		const block301 = createValidDefaultBlock({ header: { height: 301 } });

		const block302 = createValidDefaultBlock({
			header: { height: 302 },
			payload: [getTransaction({ nonce: BigInt(1) }), getTransaction({ nonce: BigInt(2) })],
		});

		const block303 = createValidDefaultBlock({ header: { height: 303 } });

		blocks = [block300, block301, block302, block303];
		const batch = new Batch();
		for (const block of blocks) {
			const { payload, header } = block;
			batch.set(Buffer.from(`blocks:id:${header.id.toString('binary')}`), encodeDefaultBlockHeader(header));
			batch.set(Buffer.from(`blocks:height:${formatInt(header.height)}`), header.id);
			if (payload.length) {
				batch.set(
					Buffer.from(`transactions:blockID:${header.id.toString('binary')}`),
					Buffer.concat(payload.map(tx => tx.id)),
				);
				for (const tx of payload) {
					batch.set(Buffer.from(`transactions:id:${tx.id.toString('binary')}`), tx.getBytes());
				}
			}
			batch.set(
				Buffer.from(`tempBlocks:height:${formatInt(blocks[2].header.height)}`),
				encodedDefaultBlock(blocks[2]),
			);
			batch.set(
				Buffer.from(`tempBlocks:height:${formatInt(blocks[3].header.height)}`),
				encodedDefaultBlock(blocks[3]),
			);
			batch.set(
				// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
				Buffer.from(`tempBlocks:height:${formatInt(blocks[3].header.height + 1)}`),
				encodedDefaultBlock(blocks[3]),
			);
			batch.set(Buffer.from(`diff:${formatInt(block.header.height)}`), emptyEncodedDiff);
		}
		await db.write(batch);
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
			expect(header).toStrictEqual(blocks[0].header);
		});
	});

	describe('getBlockHeadersByIDs', () => {
		it('should not throw "not found" error if non existent ID is specified', async () => {
			await expect(
				dataAccess.getBlockHeadersByIDs([Buffer.from('random-id'), blocks[1].header.id]),
			).resolves.toEqual([blocks[1].header]);
		});

		it('should return existent blocks headers if non existent ID is specified', async () => {
			const res = await dataAccess.getBlockHeadersByIDs([
				blocks[0].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);

			expect(res).toEqual([blocks[0].header, blocks[1].header]);
		});

		it('should return block headers by ID', async () => {
			const headers = await dataAccess.getBlockHeadersByIDs([
				blocks[1].header.id,
				blocks[0].header.id,
			]);
			const { header } = blocks[1];

			expect(headers[0]).toEqual(header);
			expect(headers).toHaveLength(2);
		});
	});

	describe('getBlocksByIDs', () => {
		it('should not throw "not found" error if non existent ID is specified', async () => {
			await expect(
				dataAccess.getBlocksByIDs([Buffer.from('random-id'), blocks[1].header.id]),
			).resolves.toEqual([blocks[1]]);
		});

		it('should return existent blocks if non existent ID is specified', async () => {
			const blocksFound = await dataAccess.getBlocksByIDs([
				blocks[0].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);

			expect(blocksFound[0].header).toEqual(blocks[0].header);
			expect(blocksFound[0].payload[0]).toBeInstanceOf(Transaction);
			expect(blocksFound[0].payload[0].id).toEqual(blocks[0].payload[0].id);
			expect(blocksFound[1].header).toEqual(blocks[1].header);
			expect(blocksFound).toHaveLength(2);
		});

		it('should return blocks by ID', async () => {
			const blocksFound = await dataAccess.getBlocksByIDs([
				blocks[1].header.id,
				blocks[0].header.id,
			]);

			expect(blocksFound).toHaveLength(2);
			expect(blocksFound[0].header).toEqual(blocks[1].header);
			expect(blocksFound[1].header).toEqual(blocks[0].header);
			expect(blocksFound[1].payload[0]).toBeInstanceOf(Transaction);
			expect(blocksFound[1].payload[0].id).toEqual(blocks[0].payload[0].id);
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
			expect(headers[0]).toEqual(header);
		});
	});

	describe('getBlockHeadersWithHeights', () => {
		it('should not throw "not found" error if one of heights does not exist', async () => {
			await expect(
				dataAccess.getBlockHeadersWithHeights([blocks[1].header.height, 500]),
			).resolves.toEqual([blocks[1].header]);
		});

		it('should return existent blocks if non existent height is specified', async () => {
			const headers = await dataAccess.getBlockHeadersWithHeights([
				blocks[1].header.height,
				blocks[3].header.height,
				500,
			]);

			expect(headers).toEqual([blocks[1].header, blocks[3].header]);
			expect(headers).toHaveLength(2);
		});

		it('should return block headers by height', async () => {
			const headers = await dataAccess.getBlockHeadersWithHeights([
				blocks[1].header.height,
				blocks[3].header.height,
			]);

			expect(headers[0]).toEqual(blocks[1].header);
			expect(headers[1]).toEqual(blocks[3].header);
			expect(headers).toHaveLength(2);
		});
	});

	describe('getLastBlockHeader', () => {
		it('should return block header with highest height', async () => {
			const lastBlockHeader = await dataAccess.getLastBlockHeader();
			expect(lastBlockHeader).toEqual(blocks[3].header);
		});
	});

	describe('getLastCommonBlockHeader', () => {
		it('should return highest block header which exist in the list and non-existent should not throw', async () => {
			const header = await dataAccess.getHighestCommonBlockID([
				blocks[3].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);
			expect(header).toEqual(blocks[3].header.id);
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
			expect(block.header).toStrictEqual(blocks[0].header);
			expect(block.payload[0]).toBeInstanceOf(Transaction);
			expect(block.payload[0].id).toStrictEqual(blocks[0].payload[0].id);
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
			expect(block.header).toStrictEqual(blocks[2].header);
			expect(block.payload[0]).toBeInstanceOf(Transaction);
			expect(block.payload[0].id).toStrictEqual(blocks[2].payload[0].id);
		});
	});

	describe('getLastBlock', () => {
		it('should return highest height full block', async () => {
			const block = await dataAccess.getLastBlock();
			expect(block).toStrictEqual(blocks[3]);
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
		const block = createValidDefaultBlock({
			header: { height: 304 },
			payload: [getTransaction({ nonce: BigInt(10) }), getTransaction({ nonce: BigInt(20) })],
		});
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const stateStore = { finalize: () => {} };

		it('should create block with all index required', async () => {
			await dataAccess.saveBlock(block, stateStore as any, 0);

			await expect(
				db.has(Buffer.from(`blocks:id:${block.header.id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`blocks:height:${formatInt(block.header.height)}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`transactions:blockID:${block.header.id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`transactions:id:${block.payload[0].id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`transactions:id:${block.payload[1].id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`tempBlocks:height:${formatInt(block.header.height)}`)),
			).resolves.toBeTrue();
			const createdBlock = await dataAccess.getBlockByID(block.header.id);
			expect(createdBlock.header).toStrictEqual(block.header);
			expect(createdBlock.payload[0]).toBeInstanceOf(Transaction);
			expect(createdBlock.payload[0].id).toStrictEqual(block.payload[0].id);
			expect(createdBlock.payload[1]).toBeInstanceOf(Transaction);
			expect(createdBlock.payload[1].id).toStrictEqual(block.payload[1].id);
		});

		it('should create block with all index required and remove the same height block from temp', async () => {
			await dataAccess.saveBlock(block, stateStore as any, 0, true);

			await expect(
				db.has(Buffer.from(`blocks:id:${block.header.id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`blocks:height:${formatInt(block.header.height)}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`transactions:blockID:${block.header.id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`transactions:id:${block.payload[0].id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`transactions:id:${block.payload[1].id.toString('binary')}`)),
			).resolves.toBeTrue();
			await expect(
				db.has(Buffer.from(`tempBlocks:height:${formatInt(block.header.height)}`)),
			).resolves.toBeFalse();
			const createdBlock = await dataAccess.getBlockByID(block.header.id);
			expect(createdBlock.header).toStrictEqual(block.header);
			expect(createdBlock.payload[0]).toBeInstanceOf(Transaction);
			expect(createdBlock.payload[0].id).toStrictEqual(block.payload[0].id);
			expect(createdBlock.payload[1]).toBeInstanceOf(Transaction);
			expect(createdBlock.payload[1].id).toStrictEqual(block.payload[1].id);
		});

		it('should delete diff before the finalized height', async () => {
			await db.set(Buffer.from(`diff:${formatInt(99)}`), Buffer.from('random diff'));
			await db.set(Buffer.from(`diff:${formatInt(100)}`), Buffer.from('random diff 2'));
			await dataAccess.saveBlock(block, stateStore as any, 100, true);

			await expect(db.has(Buffer.from(`diff:${formatInt(100)}`))).resolves.toBeTrue();
			await expect(db.has(Buffer.from(`diff:${formatInt(99)}`))).resolves.toBeFalse();
		});
	});

	describe('deleteBlock', () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const stateStore = { finalize: () => {} };

		it('should delete block and all related indexes', async () => {
			// Deleting temp blocks to test the saving
			await dataAccess.clearTempBlocks();
			await dataAccess.deleteBlock(blocks[2], stateStore as any);

			await expect(
				db.has(Buffer.from(`blocks:id:${blocks[2].header.id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`blocks:height:${formatInt(blocks[2].header.height)}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`transactions:blockID:${blocks[2].header.id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`transactions:id:${blocks[2].payload[0].id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`transactions:id:${blocks[2].payload[1].id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`tempBlocks:height:${formatInt(blocks[2].header.height)}`)),
			).resolves.toBeFalse();
		});

		it('should return all updated accounts', async () => {
			// Deleting temp blocks to test the saving
			await dataAccess.clearTempBlocks();
			const deletedAccount = createFakeDefaultAccount({
				token: {
					balance: BigInt(200),
				},
			});
			const updatedAccount = createFakeDefaultAccount({
				token: {
					balance: BigInt(100000000),
				},
			});
			await db.set(
				Buffer.from(`diff:${formatInt(blocks[2].header.height)}`),
				codec.encode(stateDiffSchema, {
					created: [],
					updated: [
						{
							key: `${DB_KEY_ACCOUNTS_ADDRESS}:${updatedAccount.address.toString('binary')}`,
							value: dataAccess.encodeAccount(updatedAccount),
						},
					],
					deleted: [
						{
							key: `${DB_KEY_ACCOUNTS_ADDRESS}:${deletedAccount.address.toString('binary')}`,
							value: dataAccess.encodeAccount(deletedAccount),
						},
					],
				}),
			);
			const diffAccounts = await dataAccess.deleteBlock(blocks[2], stateStore as any);

			expect(diffAccounts).toHaveLength(2);
			expect(
				(diffAccounts.find(a => a.address.equals(deletedAccount.address)) as any).token.balance,
			).toEqual(BigInt(200));
			expect(
				(diffAccounts.find(a => a.address.equals(deletedAccount.address)) as any).token.balance,
			).toEqual(BigInt(200));
		});

		it('should throw an error when there is no diff', async () => {
			// Deleting temp blocks to test the saving
			await db.del(Buffer.from(`diff:${formatInt(blocks[2].header.height)}`));
			await dataAccess.clearTempBlocks();

			await expect(dataAccess.deleteBlock(blocks[2], stateStore as any)).rejects.toThrow(
				'Specified key 646966663a0000012e does not exist',
			);
		});

		it('should delete block and all related indexes and save to temp', async () => {
			// Deleting temp blocks to test the saving
			await dataAccess.clearTempBlocks();
			await dataAccess.deleteBlock(blocks[2], stateStore as any, true);

			await expect(
				db.has(Buffer.from(`blocks:id:${blocks[2].header.id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`blocks:height:${formatInt(blocks[2].header.height)}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`transactions:blockID:${blocks[2].header.id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`transactions:id:${blocks[2].payload[0].id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`transactions:id:${blocks[2].payload[1].id.toString('binary')}`)),
			).resolves.toBeFalse();
			await expect(
				db.has(Buffer.from(`tempBlocks:height:${formatInt(blocks[2].header.height)}`)),
			).resolves.toBeTrue();

			const tempBlocks = await dataAccess.getTempBlocks();
			expect(tempBlocks).toHaveLength(1);
			expect(tempBlocks[0].header).toStrictEqual(blocks[2].header);
			expect(tempBlocks[0].payload[0]).toBeInstanceOf(Transaction);
			expect(tempBlocks[0].payload[0].id).toStrictEqual(blocks[2].payload[0].id);
		});
	});
});
