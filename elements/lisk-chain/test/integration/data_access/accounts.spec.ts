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
import { Storage } from '../../../src/data_access/storage';

describe('dataAccess.transactions', () => {
	let db: KVStore;
	let storage: Storage;
	let accounts: any;

	beforeAll(() => {
		const parentPath = path.join(__dirname, '../../tmp/accounts');
		fs.ensureDirSync(parentPath);
		db = new KVStore(path.join(parentPath, '/test-accounts.db'));
		storage = new Storage(db);
	});

	beforeEach(async () => {
		accounts = [
			{
				address: '7546125166665832140L',
				publicKey:
					'456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
				balance: '99',
				keys: {
					mandatoryKeys: [],
					optionalKeys: [],
					numberOfSignatures: 0,
				},
			},
			{
				address: '10676488814586252632L',
				publicKey:
					'd468707933e4f24888dc1f00c8f84b2642c0edf3d694e2bb5daa7a0d87d18708',
				balance: '10000',
				keys: {
					mandatoryKeys: [
						'456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					],
					optionalKeys: [],
					numberOfSignatures: 3,
				},
			},
		];
		const batch = db.batch();
		for (const account of accounts) {
			batch.put(`accounts:address:${account.address}`, account);
		}
		await batch.write();
	});

	afterEach(async () => {
		await db.clear();
	});

	describe('getAccountByAddress', () => {
		it('should throw not found error if non existent address is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getAccountByAddress('8973039982577606154L');
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return account by address', async () => {
			const account = await storage.getAccountByAddress(accounts[1].address);
			expect(account).toStrictEqual(accounts[1]);
		});
	});

	describe('getAccountsByPublicKey', () => {
		it('should throw not found error if non existent public key is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getAccountsByPublicKey([
					'e3ee6527848d873db7b8e7577384a3ee5f100b988b2f6c027a2851f5427e9426',
					accounts[0].publicKey,
				]);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return account by public keys', async () => {
			const result = await storage.getAccountsByPublicKey([
				accounts[1].publicKey,
				accounts[0].publicKey,
			]);
			expect(result[0]).toStrictEqual(accounts[1]);
			expect(result[1]).toStrictEqual(accounts[0]);
		});
	});

	describe('getAccountsByAddress', () => {
		it('should throw not found error if non existent address is specified', async () => {
			expect.assertions(1);
			try {
				await storage.getAccountsByAddress([
					'8973039982577606154L',
					accounts[0].address,
				]);
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		it('should return account by address', async () => {
			const result = await storage.getAccountsByAddress([
				accounts[1].address,
				accounts[0].address,
			]);
			expect(result[0]).toStrictEqual(accounts[1]);
			expect(result[1]).toStrictEqual(accounts[0]);
		});
	});
});
