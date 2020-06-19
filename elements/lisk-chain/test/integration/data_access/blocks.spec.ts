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
import { KVStore, formatInt, NotFoundError } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { Storage } from '../../../src/data_access/storage';
import {
	createValidDefaultBlock,
	encodeDefaultBlockHeader,
	encodedDefaultBlock,
	defaultBlockHeaderAssetSchema,
} from '../../utils/block';
import { getTransferTransaction } from '../../utils/transaction';
import { Block, stateDiffSchema } from '../../../src';
import { DataAccess } from '../../../src/data_access';
import { defaultAccountSchema } from '../../utils/account';
import { registeredTransactions } from '../../utils/registered_transactions';

describe('dataAccess.blocks', () => {
	const emptyEncodedDiff = codec.encode(stateDiffSchema, {
		created: [],
		updated: [],
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
			accountSchema: defaultAccountSchema as any,
			registeredBlockHeaders: {
				0: defaultBlockHeaderAssetSchema,
				2: defaultBlockHeaderAssetSchema,
			},
			registeredTransactions,
			minBlockHeaderCache: 3,
			maxBlockHeaderCache: 5,
		});
		// Prepare sample data
		const block300 = createValidDefaultBlock({
			header: { height: 300 },
			payload: [getTransferTransaction()],
		});

		const block301 = createValidDefaultBlock({ header: { height: 301 } });

		const block302 = createValidDefaultBlock({
			header: { height: 302 },
			payload: [
				getTransferTransaction({ nonce: BigInt(1) }),
				getTransferTransaction({ nonce: BigInt(2) }),
			],
		});

		const block303 = createValidDefaultBlock({ header: { height: 303 } });

		blocks = [block300, block301, block302, block303];
		const batch = db.batch();
		for (const block of blocks) {
			const { payload, header } = block;
			batch.put(
				`blocks:id:${header.id.toString('binary')}`,
				encodeDefaultBlockHeader(header),
			);
			batch.put(`blocks:height:${formatInt(header.height)}`, header.id);
			if (payload.length) {
				batch.put(
					`transactions:blockID:${header.id.toString('binary')}`,
					Buffer.concat(payload.map(tx => tx.id)),
				);
				for (const tx of payload) {
					batch.put(
						`transactions:id:${tx.id.toString('binary')}`,
						tx.getBytes(),
					);
				}
			}
			batch.put(
				`tempBlocks:height:${formatInt(blocks[2].header.height)}`,
				encodedDefaultBlock(blocks[2]),
			);
			batch.put(
				`tempBlocks:height:${formatInt(blocks[3].header.height)}`,
				encodedDefaultBlock(blocks[3]),
			);
			batch.put(
				// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
				`tempBlocks:height:${formatInt(blocks[3].header.height + 1)}`,
				encodedDefaultBlock(blocks[3]),
			);
			batch.put(`diff:${formatInt(block.header.height)}`, emptyEncodedDiff);
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
			expect(header).toStrictEqual(blocks[0].header);
		});
	});

	describe('getBlockHeadersByIDs', () => {
		it('should not throw "not found" error if non existent ID is specified', async () => {
			await expect(
				dataAccess.getBlockHeadersByIDs([
					Buffer.from('random-id'),
					blocks[1].header.id,
				]),
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
				dataAccess.getBlocksByIDs([
					Buffer.from('random-id'),
					blocks[1].header.id,
				]),
			).resolves.toEqual([blocks[1]]);
		});

		it('should return existent blocks if non existent ID is specified', async () => {
			const blocksFound = await dataAccess.getBlocksByIDs([
				blocks[0].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);

			expect(blocksFound).toEqual([blocks[0], blocks[1]]);
			expect(blocksFound).toHaveLength(2);
		});

		it('should return blocks by ID', async () => {
			const blocksFound = await dataAccess.getBlocksByIDs([
				blocks[1].header.id,
				blocks[0].header.id,
			]);

			expect(blocksFound).toEqual([blocks[1], blocks[0]]);
			expect(blocksFound).toHaveLength(2);
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

		it('should return existent blocks if non existent heeight is specified', async () => {
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
			const header = await dataAccess.getHighestCommonBlockHeader([
				blocks[3].header.id,
				Buffer.from('random-id'),
				blocks[1].header.id,
			]);
			expect(header).toEqual(blocks[3].header);
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
			expect(block).toStrictEqual(blocks[0]);
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
			expect(block).toStrictEqual(blocks[2]);
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
			payload: [
				getTransferTransaction({ nonce: BigInt(10) }),
				getTransferTransaction({ nonce: BigInt(20) }),
			],
		});
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const stateStore = { finalize: () => {} };

		it('should create block with all index required', async () => {
			await dataAccess.saveBlock(block, stateStore as any);

			await expect(
				db.exists(`blocks:id:${block.header.id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`blocks:height:${formatInt(block.header.height)}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:blockID:${block.header.id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${block.payload[0].id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${block.payload[1].id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(block.header.height)}`),
			).resolves.toBeTrue();
			await expect(
				dataAccess.getBlockByID(block.header.id),
			).resolves.toStrictEqual(block);
		});

		it('should create block with all index required and remove the same height block from temp', async () => {
			await dataAccess.saveBlock(block, stateStore as any, true);

			await expect(
				db.exists(`blocks:id:${block.header.id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`blocks:height:${formatInt(block.header.height)}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:blockID:${block.header.id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${block.payload[0].id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${block.payload[1].id.toString('binary')}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(block.header.height)}`),
			).resolves.toBeFalse();
			await expect(
				dataAccess.getBlockByID(block.header.id),
			).resolves.toStrictEqual(block);
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
				db.exists(`blocks:id:${blocks[2].header.id.toString('binary')}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`blocks:height:${formatInt(blocks[2].header.height)}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(
					`transactions:blockID:${blocks[2].header.id.toString('binary')}`,
				),
			).resolves.toBeFalse();
			await expect(
				db.exists(
					`transactions:id:${blocks[2].payload[0].id.toString('binary')}`,
				),
			).resolves.toBeFalse();
			await expect(
				db.exists(
					`transactions:id:${blocks[2].payload[1].id.toString('binary')}`,
				),
			).resolves.toBeFalse();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(blocks[2].header.height)}`),
			).resolves.toBeFalse();
		});

		it('should delete block and all related indexes and save to temp', async () => {
			// Deleting temp blocks to test the saving
			await dataAccess.clearTempBlocks();
			await dataAccess.deleteBlock(blocks[2], stateStore as any, true);

			await expect(
				db.exists(`blocks:id:${blocks[2].header.id.toString('binary')}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`blocks:height:${formatInt(blocks[2].header.height)}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(
					`transactions:blockID:${blocks[2].header.id.toString('binary')}`,
				),
			).resolves.toBeFalse();
			await expect(
				db.exists(
					`transactions:id:${blocks[2].payload[0].id.toString('binary')}`,
				),
			).resolves.toBeFalse();
			await expect(
				db.exists(
					`transactions:id:${blocks[2].payload[1].id.toString('binary')}`,
				),
			).resolves.toBeFalse();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(blocks[2].header.height)}`),
			).resolves.toBeTrue();

			const tempBlocks = await dataAccess.getTempBlocks();
			expect(tempBlocks).toHaveLength(1);
			expect(tempBlocks[0]).toStrictEqual(blocks[2]);
		});
	});
});
