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

import { Batch, Database, InMemoryDatabase } from '@liskhq/lisk-db';
import { utils } from '@liskhq/lisk-cryptography';
import { encodeBlock, encodeLegacyChainBracketInfo } from '../../../../src/engine/legacy/codec';
import { Storage } from '../../../../src/engine/legacy/storage';
import { blockFixtures } from './fixtures';
import { buildBlockHeightDbKey, buildBlockIDDbKey } from '../../../../src/engine/legacy/utils';

describe('Legacy storage', () => {
	let db: InMemoryDatabase;
	let storage: Storage;
	let batch: Batch;
	const blocks = blockFixtures;

	beforeAll(() => {
		db = new InMemoryDatabase();
		storage = new Storage(db as unknown as Database);
	});

	beforeEach(async () => {
		batch = new Batch();
		for (const block of blocks) {
			const { header, payload } = block;

			batch.set(buildBlockIDDbKey(header.id), encodeBlock({ header, payload }));
			batch.set(buildBlockHeightDbKey(header.height), header.id);
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
			const { header, payload } = blockFixtures[0];
			const result = await storage.getBlockByID(header.id);

			expect(result).toEqual(encodeBlock({ header, payload }));
		});

		it('should throw error if block with given id does not exist', async () => {
			await expect(storage.getBlockByID(Buffer.alloc(0))).rejects.toThrow(
				`Specified key 626c6f636b733a6964 does not exist`,
			);
		});
	});

	describe('getBlockByHeight', () => {
		it('should return block with given height', async () => {
			const { header, payload } = blockFixtures[0];
			const result = await storage.getBlockByHeight(header.height);

			expect(result).toEqual(encodeBlock({ header, payload }));
		});

		it('should throw an error if the block is not found', async () => {
			await expect(storage.getBlockByHeight(100)).rejects.toThrow(
				`Specified key 626c6f636b733a68656967687400000064 does not exist`,
			);
		});
	});

	describe('getBlocksByHeightBetween', () => {
		it('should return blocks with given height range', async () => {
			const { header, payload } = blockFixtures[0];
			const result = await storage.getBlocksByHeightBetween(header.height, header.height + 1);

			expect(result).toHaveLength(2);
			expect(result[1]).toEqual(encodeBlock({ header, payload }));
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
			const result = await storage.isBlockHeightPersisted(100);

			expect(result).toBeFalse();
		});
	});

	describe('saveBlock', () => {
		it("should save the block along with it's transactions", async () => {
			const { header, payload } = blockFixtures[0];
			await storage.saveBlock(header.id, header.height, encodeBlock({ header, payload }), payload);

			const result = await storage.getBlockByID(header.id);
			expect(result).toEqual(encodeBlock({ header, payload }));

			const tx = await storage.getTransactionByID(utils.hash(payload[0]));
			expect(tx).toEqual(payload[0]);

			const transactions = await storage.getTransactionsByBlockID(header.id);
			expect(transactions[0]).toEqual(payload[0]);
		});

		it("should save the block without it's transactions", async () => {
			const { header, payload } = blockFixtures[0];
			await storage.saveBlock(header.id, header.height, encodeBlock({ header, payload }), []);

			const result = await storage.getBlockByID(header.id);
			expect(result).toEqual(encodeBlock({ header, payload }));

			try {
				await storage.getTransactionByID(utils.hash(payload[0]));
			} catch (error: any) {
				expect(error.message).toInclude('does not exist');
			}

			try {
				await storage.getTransactionsByBlockID(header.id);
			} catch (error: any) {
				expect(error.message).toInclude('does not exist');
			}
		});
	});

	describe('getLegacyChainBracketInfo', () => {
		it('should return the chain bracket info', async () => {
			const { header } = blockFixtures[1];
			const bracketInfo = {
				startHeight: header.height,
				snapshotBlockHeight: header.height,
				lastBlockHeight: header.height,
			};

			await storage.setLegacyChainBracketInfo(header.id, bracketInfo);

			const result = await storage.getLegacyChainBracketInfo(header.id);

			expect(result).toEqual(encodeLegacyChainBracketInfo(bracketInfo));
		});

		it('should throw error if block with given id does not exist', async () => {
			await expect(storage.getLegacyChainBracketInfo(Buffer.alloc(0))).rejects.toThrow(
				`Specified key 02 does not exist`,
			);
		});
	});
});
