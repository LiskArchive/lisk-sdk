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

const {
	Account,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');
const { constants } = require('../../../../../../../../utils');

describe('storage.entities.Account.increaseFieldBy', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'AccountIncreaseFieldBy' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('Account', Account);

		storage.entities.Account.extendDefaultOptions({
			limit: constants.ACTIVE_DELEGATES,
		});
	});

	afterAll(async () => {
		await pgHelper.cleanup();
	});

	beforeEach(async () => {
		await pgHelper.deleteAllAccounts();
	});

	describe('Given arguments ({publicKey}, "producedBlocks", "1", tx)', () => {
		it('should increase "producedBlocks" property of each given account by "1"', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 100,
				producedBlocks: 5,
			};

			const expectedValue = 6;

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.increaseFieldBy(
					{
						publicKey: account.publicKey,
					},
					'producedBlocks',
					'1',
					tx,
				);
			});

			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);

			// Assert
			expect(updatedAccount.producedBlocks).toEqual(expectedValue);
		});
	});

	describe('Given arguments ({publicKey_in: []}, "missedBlocks", "1", tx)', () => {
		it('should increase "missedBlocks" property of each given account by 1', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 100,
				missedBlocks: 5,
			};

			const account2 = {
				address: 'delegateAddress2',
				isDelegate: 0,
				publicKey:
					'abca7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590aa',
				balance: 100,
				missedBlocks: 10,
			};

			const expectedValue1 = 6;
			const expectedValue2 = 11;

			await pgHelper.createAccount(account);
			await pgHelper.createAccount(account2);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.increaseFieldBy(
					{
						publicKey_in: [account.publicKey, account2.publicKey],
					},
					'missedBlocks',
					'1',
					tx,
				);
			});

			const updatedAccount1 = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			const updatedAccount2 = await pgHelper.getAccountByPublicKey(
				account2.publicKey,
			);

			// Assert
			expect(updatedAccount1.missedBlocks).toEqual(expectedValue1);
			expect(updatedAccount2.missedBlocks).toEqual(expectedValue2);
		});
	});

	describe('Given arguments ({publicKey}, "voteWeight", "Number", tx)', () => {
		it('should increase "voteWeight" property of each given account by given value', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 100,
				voteWeight: 200,
			};

			// @todo check why this is coming string form db.
			const expectedValue = '210';

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.increaseFieldBy(
					{
						publicKey: account.publicKey,
					},
					'voteWeight',
					'10',
					tx,
				);
			});

			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);

			// Assert
			expect(updatedAccount.voteWeight).toBe(expectedValue);
		});
	});
});
