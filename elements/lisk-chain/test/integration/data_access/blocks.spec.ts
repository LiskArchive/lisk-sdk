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
import { Storage } from '../../../src/data_access/storage';
import { newBlock } from '../../utils/block';

describe('dataAccess.blocks', () => {
	let db: KVStore;
	let storage: Storage;
	let blocks: any;

	beforeAll(() => {
		const parentPath = path.join(__dirname, '../../tmp/blocks');
		fs.ensureDirSync(parentPath);
		db = new KVStore(path.join(parentPath, '/test-blocks.db'));
		storage = new Storage(db);
	});

	beforeEach(async () => {
		// Prepare sample data
		const block300 = newBlock({ height: 300 });
		const block301 = newBlock({ height: 301 });
		const block302 = newBlock({ height: 302 });
		const block303 = newBlock({ height: 303 });
		blocks = [];
		blocks.push({
			...block300,
			totalFee: block300.totalFee.toString(),
			totalAmount: block300.totalAmount.toString(),
			reward: block300.reward.toString(),
			transactions: [
				{
					id: 'transaction-id-1',
					type: 20,
					senderPublicKey:
						'000efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					nonce: '1000',
					fee: '5000000',
					asset: { newInfo: [1, 4, 5] },
				},
			],
		});
		blocks.push({
			...block301,
			reward: block301.reward.toString(),
			totalFee: block301.totalFee.toString(),
			totalAmount: block301.totalAmount.toString(),
			transactions: [],
		});
		blocks.push({
			...block302,
			reward: block302.reward.toString(),
			totalFee: block302.totalFee.toString(),
			totalAmount: block302.totalAmount.toString(),
			transactions: [
				{
					id: 'transaction-id-2',
					type: 20,
					senderPublicKey:
						'001efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					nonce: '1000',
					fee: '2001110',
					asset: { data: 'new data' },
				},
				{
					id: 'transaction-id-3',
					type: 15,
					senderPublicKey:
						'002283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					nonce: '1000',
					fee: '2000000',
					asset: { valid: true },
				},
			],
		});
		blocks.push({
			...block303,
			reward: block303.reward.toString(),
			totalFee: block303.totalFee.toString(),
			totalAmount: block303.totalAmount.toString(),
			transactions: [],
		});
		const batch = db.batch();
		for (const block of blocks) {
			const { transactions, ...blockHeader } = block;
			batch.put(`blocks:id:${blockHeader.id}`, blockHeader);
			batch.put(`blocks:height:${formatInt(block.height)}`, block.id);
			if (block.transactions.length) {
				batch.put(
					`transactions:blockID:${block.id}`,
					block.transactions.map((tx: any) => tx.id),
				);
				for (const tx of block.transactions) {
					batch.put(`transactions:id:${tx.id}`, tx);
				}
			}
			batch.put(`tempBlocks:height:${formatInt(blocks[2].height)}`, blocks[2]);
			batch.put(`tempBlocks:height:${formatInt(blocks[3].height)}`, blocks[3]);
			batch.put(
				// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
				`tempBlocks:height:${formatInt(blocks[3].height + 1)}`,
				blocks[3],
			);
		}
		await batch.write();
	});

	afterEach(async () => {
		await db.clear();
	});

	describe('getBlockHeaderByID', () => {
		it('should throw not found error if non existent ID is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getBlockHeaderByID('randomId');
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return block header by ID', async () => {
			const header = await storage.getBlockHeaderByID(blocks[0].id);
			expect((header as any).transactions).toBeUndefined();
			const { transactions, ...blockHeader } = blocks[0];
			expect(header).toStrictEqual(blockHeader);
		});
	});

	describe('getBlockHeadersByIDs', () => {
		it('should throw not found error if non existent ID is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getBlockHeadersByIDs(['random-id', blocks[1].id]);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return block headers by ID', async () => {
			const headers = await storage.getBlockHeadersByIDs([
				blocks[1].id,
				blocks[0].id,
			]);
			const { transactions, ...blockHeader } = blocks[1];

			expect((headers[0] as any).transactions).toBeUndefined();
			expect((headers[1] as any).transactions).toBeUndefined();
			expect(headers[0]).toEqual(blockHeader);
			expect(headers).toHaveLength(2);
		});
	});

	describe('getBlockHeadersByHeightBetween', () => {
		it('should return block headers with in the height order by height', async () => {
			const headers = await storage.getBlockHeadersByHeightBetween(
				blocks[0].height,
				blocks[2].height,
			);
			const { transactions, ...blockHeader } = blocks[2];

			expect(headers).toHaveLength(3);
			expect((headers[0] as any).transactions).toBeUndefined();
			expect((headers[1] as any).transactions).toBeUndefined();
			expect((headers[2] as any).transactions).toBeUndefined();
			expect(headers[0]).toEqual(blockHeader);
		});
	});

	describe('getBlockHeadersWithHeights', () => {
		it('should throw not found error if one of heights does not exist', async () => {
			expect.assertions(1);
			try {
				await storage.getBlockHeadersWithHeights([blocks[1].height, 500]);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return block headers by height', async () => {
			const headers = await storage.getBlockHeadersWithHeights([
				blocks[1].height,
				blocks[3].height,
			]);
			const { transactions: _transactions1, ...blockHeader1 } = blocks[1];
			const { transactions: _transactions3, ...blockHeader3 } = blocks[3];

			expect((headers[0] as any).transactions).toBeUndefined();
			expect((headers[1] as any).transactions).toBeUndefined();
			expect(headers[0]).toEqual(blockHeader1);
			expect(headers[1]).toEqual(blockHeader3);
			expect(headers).toHaveLength(2);
		});
	});

	describe('getLastBlockHeader', () => {
		it('should return block header with highest height', async () => {
			const lastBlockHeader = await storage.getLastBlockHeader();
			const { transactions, ...blockHeader } = blocks[3];
			expect((lastBlockHeader as any).transactions).toBeUndefined();
			expect(lastBlockHeader).toEqual(blockHeader);
		});
	});

	describe('getLastCommonBlockHeader', () => {
		it('should return highest block header which exist in the list and non-existent should not throw', async () => {
			const header = await storage.getLastCommonBlockHeader([
				blocks[3].id,
				'random-id',
				blocks[1].id,
			]);
			const { transactions, ...blockHeader } = blocks[3];

			expect((header as any).transactions).toBeUndefined();
			expect(header).toEqual(blockHeader);
		});
	});

	describe('getBlockByID', () => {
		it('should throw not found error if non existent ID is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getBlockByID('randomId');
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return full block by ID', async () => {
			const block = await storage.getBlockByID(blocks[0].id);
			expect(block).toStrictEqual(blocks[0]);
		});
	});

	describe('getBlockByHeight', () => {
		it('should throw not found error if non existent height is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getBlockByHeight(500);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return full block by height', async () => {
			const block = await storage.getBlockByHeight(blocks[2].height);
			expect(block).toStrictEqual(blocks[2]);
		});
	});

	describe('getLastBlock', () => {
		it('should return highest height full block', async () => {
			const block = await storage.getLastBlock();
			expect(block).toStrictEqual(blocks[3]);
		});
	});

	describe('isTempBlockEmpty', () => {
		it('should return false if tempBlock exists', async () => {
			const empty = await storage.isTempBlockEmpty();
			expect(empty).toBeFalse();
		});

		it('should return true if tempBlock is empty', async () => {
			await db.clear();

			const empty = await storage.isTempBlockEmpty();
			expect(empty).toBeTrue();
		});
	});

	describe('clearTempBlocks', () => {
		it('should clean up all temp blocks, but not other data', async () => {
			await storage.clearTempBlocks();

			expect(await storage.isTempBlockEmpty()).toBeTrue();
			const lastBlock = await storage.getLastBlock();
			expect(lastBlock.height).toEqual(blocks[3].height);
		});
	});

	describe('saveBlock', () => {
		const blockInstance = newBlock({ height: 304 });
		const blockJSON = {
			...blockInstance,
			reward: blockInstance.reward.toString(),
			totalFee: blockInstance.totalFee.toString(),
			totalAmount: blockInstance.totalAmount.toString(),
			transactions: [
				{
					id: 'transaction-id-10',
					type: 20,
					senderPublicKey:
						'001efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					nonce: '1000',
					fee: '2001110',
					asset: { data: 'new data' },
				},
				{
					id: 'transaction-id-11',
					type: 15,
					senderPublicKey:
						'002283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					nonce: '1000',
					fee: '2000000',
					asset: { valid: true },
				},
			],
		};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const stateStore = { finalize: () => {} };

		it('should create block with all index required', async () => {
			await storage.saveBlock(blockJSON, stateStore as any);

			await expect(db.exists(`blocks:id:${blockJSON.id}`)).resolves.toBeTrue();
			await expect(
				db.exists(`blocks:height:${formatInt(blockJSON.height)}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:blockID:${blockJSON.id}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${blockJSON.transactions[0].id}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${blockJSON.transactions[1].id}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(blockJSON.height)}`),
			).resolves.toBeTrue();
			await expect(storage.getBlockByID(blockJSON.id)).resolves.toStrictEqual(
				blockJSON,
			);
		});

		it('should create block with all index required and remove the same height block from temp', async () => {
			await storage.saveBlock(blockJSON, stateStore as any, true);

			await expect(db.exists(`blocks:id:${blockJSON.id}`)).resolves.toBeTrue();
			await expect(
				db.exists(`blocks:height:${formatInt(blockJSON.height)}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:blockID:${blockJSON.id}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${blockJSON.transactions[0].id}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`transactions:id:${blockJSON.transactions[1].id}`),
			).resolves.toBeTrue();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(blockJSON.height)}`),
			).resolves.toBeFalse();
			await expect(storage.getBlockByID(blockJSON.id)).resolves.toStrictEqual(
				blockJSON,
			);
		});
	});

	describe('deleteBlock', () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const stateStore = { finalize: () => {} };

		it('should delete block and all related indexes', async () => {
			// Deleting temp blocks to test the saving
			await storage.clearTempBlocks();
			await storage.deleteBlock(blocks[2], stateStore as any);

			await expect(db.exists(`blocks:id:${blocks[2].id}`)).resolves.toBeFalse();
			await expect(
				db.exists(`blocks:height:${formatInt(blocks[2].height)}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`transactions:blockID:${blocks[2].id}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`transactions:id:${blocks[2].transactions[0].id}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`transactions:id:${blocks[2].transactions[1].id}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(blocks[2].height)}`),
			).resolves.toBeFalse();
		});

		it('should delete block and all related indexes and save to temp', async () => {
			// Deleting temp blocks to test the saving
			await storage.clearTempBlocks();
			await storage.deleteBlock(blocks[2], stateStore as any, true);

			await expect(db.exists(`blocks:id:${blocks[2].id}`)).resolves.toBeFalse();
			await expect(
				db.exists(`blocks:height:${formatInt(blocks[2].height)}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`transactions:blockID:${blocks[2].id}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`transactions:id:${blocks[2].transactions[0].id}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`transactions:id:${blocks[2].transactions[1].id}`),
			).resolves.toBeFalse();
			await expect(
				db.exists(`tempBlocks:height:${formatInt(blocks[2].height)}`),
			).resolves.toBeTrue();

			const tempBlocks = await storage.getTempBlocks();
			expect(tempBlocks).toHaveLength(1);
			expect(tempBlocks[0]).toStrictEqual(blocks[2]);
		});
	});
});
