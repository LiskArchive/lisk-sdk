/* eslint-disable max-classes-per-file */
/*
 * Copyright © 2022 Lisk Foundation
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

import { intToBuffer } from '@liskhq/lisk-cryptography/dist-node/utils';
import { Batch, Database, InMemoryDatabase } from '@liskhq/lisk-db';
import { decodeBlockJSON, encodeBlock } from '../../../../src/engine/legacy/codec';
import {
	DB_KEY_BLOCK_ID,
	DB_KEY_BLOCK_HEIGHT,
	Storage,
} from '../../../../src/engine/legacy/storage';
import { blockFixtures } from './fixtures';

describe('Legacy storage', () => {
	let db: InMemoryDatabase;
	let storage: Storage;
	let batch: Batch;
	const blocks = blockFixtures;

	beforeAll(() => {
		db = new InMemoryDatabase();
		storage = new Storage((db as unknown) as Database);
	});

	beforeEach(async () => {
		batch = new Batch();
		for (const block of blocks) {
			const { header, transactions } = block;

			batch.set(Buffer.concat([DB_KEY_BLOCK_ID, header.id]), encodeBlock({ header, transactions }));
			batch.set(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(header.height, 4)]), header.id);
		}

		await db.write(batch);
	});

	afterEach(async () => {
		await db.clear();
	});

	afterAll(() => {
		db.close();
	});

	describe('getBlockByID', () => {
		it('should return block with given id', async () => {
			const { header, transactions } = blockFixtures[0];
			const { block } = await storage.getBlockByID(header.id);

			expect(block).toEqual(decodeBlockJSON(encodeBlock({ header, transactions })).block);
		});

		it('should throw an error if the block is not found', async () => {
			await expect(storage.getBlockByID(Buffer.alloc(0))).rejects.toThrow(
				'Specified key  does not exist.',
			);
		});
	});

	describe('getBlockByHeight', () => {
		it('should return block with given height', async () => {
			const { header, transactions } = blockFixtures[0];
			const { block } = await storage.getBlockByHeight(header.height);

			expect(block).toEqual(decodeBlockJSON(encodeBlock({ header, transactions })).block);
		});

		it('should throw an error if the block is not found', async () => {
			await expect(storage.getBlockByHeight(0)).rejects.toThrow(
				'Specified height 0 does not exist.',
			);
		});
	});

	describe('getBlocksByHeightBetween', () => {
		it('should return blocks with given height range', async () => {
			const { header, transactions } = blockFixtures[0];
			const result = await storage.getBlocksByHeightBetween(header.height, header.height + 1);

			expect(result).toHaveLength(2);
			expect(result[1].block).toEqual(decodeBlockJSON(encodeBlock({ header, transactions })).block);
			expect(result[1].block.header.height).toBeLessThan(result[0].block.header.height);
		});
	});

	describe('isBlockPersisted', () => {
		it('should return true if block exists', async () => {
			const { header } = blockFixtures[0];
			const result = await storage.isBlockPersisted(header.id);

			expect(result).toBeTrue();
		});

		it('should return false if block does not exist', async () => {
			const result = await storage.isBlockPersisted(Buffer.alloc(0));

			expect(result).toBeFalse();
		});
	});

	describe('isBlockHeightPersisted', () => {
		it('should return true if block exists', async () => {
			const { header } = blockFixtures[0];
			const result = await storage.isBlockHeightPersisted(header.height);

			expect(result).toBeTrue();
		});

		it('should return false if block does not exist', async () => {
			const result = await storage.isBlockHeightPersisted(0);

			expect(result).toBeFalse();
		});
	});

	describe('saveBlock', () => {
		it('should save the block', async () => {
			const { header, transactions } = blockFixtures[0];
			await storage.saveBlock(header.id, header.height, encodeBlock({ header, transactions }));

			const { block } = await storage.getBlockByID(header.id);

			expect(block).toEqual(decodeBlockJSON(encodeBlock({ header, transactions })).block);
		});
	});
});
