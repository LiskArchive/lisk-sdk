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
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { DataAccess } from '../../../src/data_access';
import { defaultAccountSchema } from '../../utils/account';
import { defaultBlockHeaderAssetSchema } from '../../utils/block';
import { registeredTransactions } from '../../utils/registered_transactions';
import { getTransferTransaction } from '../../utils/transaction';

describe('dataAccess.transactions', () => {
	let db: KVStore;
	let dataAccess: DataAccess;
	let transactions: any;

	beforeAll(() => {
		const parentPath = path.join(__dirname, '../../tmp/transactions');
		fs.ensureDirSync(parentPath);
		db = new KVStore(path.join(parentPath, '/test-transactions.db'));
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
	});

	beforeEach(async () => {
		transactions = [
			getTransferTransaction({ nonce: BigInt(1000) }),
			getTransferTransaction({ nonce: BigInt(0) }),
		];
		const batch = db.batch();
		for (const tx of transactions) {
			batch.put(`transactions:id:${tx.id.toString('binary')}`, tx.getBytes());
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
				await dataAccess.getTransactionByID(Buffer.from('randomId'));
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return transaction by ID', async () => {
			const tx = await dataAccess.getTransactionByID(transactions[0].id);
			expect(tx).toStrictEqual(transactions[0]);
		});
	});

	describe('getTransactionsByIDs', () => {
		it('should throw not found error if one of ID specified does not exist', async () => {
			expect.assertions(1);
			try {
				await dataAccess.getTransactionsByIDs([
					Buffer.from('randomId'),
					transactions[0].id,
				]);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return transaction by ID', async () => {
			const result = await dataAccess.getTransactionsByIDs([
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
				dataAccess.isTransactionPersisted(Buffer.from('random-id')),
			).resolves.toBeFalse();
		});

		it('should return true if transaction exist', async () => {
			await expect(
				dataAccess.isTransactionPersisted(transactions[1].id),
			).resolves.toBeTrue();
		});
	});
});
