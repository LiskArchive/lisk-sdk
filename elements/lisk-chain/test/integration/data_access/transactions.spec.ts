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
import * as fs from 'fs';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { Storage } from '../../../src/data_access/storage';

describe('dataAccess.transactions', () => {
	let db: KVStore;
	let storage: Storage;
	let transactions: any;

	beforeAll(async () => {
		const parentPath = path.join(__dirname, '../../tmp');
		if (!fs.existsSync(parentPath)) {
			await fs.promises.mkdir(parentPath);
		}
		db = new KVStore(path.join(parentPath, '/test-transactions.db'));
		storage = new Storage(db);
	});

	beforeEach(async () => {
		transactions = [
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
		];
		const batch = db.batch();
		for (const tx of transactions) {
			batch.put(`transactions:id:${tx.id}`, tx);
		}
		await batch.write();
	});

	afterEach(async () => {
		await db.clear();
	});

	describe('getTransactionByID', () => {
		it('should throw not found error if non existent ID is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getTransactionByID('randomId');
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return transaction by ID', async () => {
			const transaction = await storage.getTransactionByID(transactions[0].id);
			expect(transaction).toStrictEqual(transactions[0]);
		});
	});

	describe('getTransactionsByIDs', () => {
		it('should throw not found error if one of ID specified does not exist', async () => {
			expect.assertions(1);
			try {
				await storage.getTransactionsByIDs(['randomId', transactions[0].id]);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return transaction by ID', async () => {
			const result = await storage.getTransactionsByIDs([
				transactions[1].id,
				transactions[0].id,
			]);
			expect(result[1]).toStrictEqual(transactions[0]);
			expect(result[0]).toStrictEqual(transactions[1]);
		});
	});

	describe('isTransactionPersisted', () => {
		it('should return false if transaction does not exist', async () => {
			await expect(
				storage.isTransactionPersisted('random-id'),
			).resolves.toBeFalse();
		});

		it('should return true if transaction exist', async () => {
			await expect(
				storage.isTransactionPersisted(transactions[1].id),
			).resolves.toBeTrue();
		});
	});
});
