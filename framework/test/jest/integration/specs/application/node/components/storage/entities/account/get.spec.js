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
	AccountEntity: Account,
} = require('../../../../../../../../../../src/application/storage/entities');
const {
	PgHelper,
} = require('../../../../../../../../../utils/storage/pg-helper');
const { constants } = require('../../../../../../../../../utils');

describe('storage.entities.Account.get', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ database: 'AccountGet' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('Account', Account);

		storage.entities.Account.extendDefaultOptions({
			limit: constants.activeDelegates,
		});
	});

	afterAll(async () => {
		await pgHelper.cleanup();
	});

	beforeEach(async () => {
		await pgHelper.deleteAllAccounts();
	});

	describe('Given arguments ({publicKey}, {extended: true}, tx)', () => {
		it('should return array that contains 1 extended account object that has "keys" property', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 55566,
			};

			const expectedAccount = {
				...account,
				balance: '55566',
				username: null,
				keys: null,
				votes: null,
				unlocking: null,
				delegate: null,
				totalVotesReceived: '0',
				asset: null,
				producedBlocks: 0,
				fees: '0',
				nonce: '0',
				rewards: '0',
				productivity: 0,
				missedBlocks: 0,
				isDelegate: false,
			};

			await pgHelper.createAccount(account);

			// Act
			let accounts;
			await db.tx(async tx => {
				accounts = await storage.entities.Account.get(
					{
						publicKey: account.publicKey,
					},
					{ extended: true },
					tx,
				);
			});

			// Assert
			expect(accounts[0]).toEqual(expectedAccount);
		});
	});

	describe('Given arguments (publicKey_in: []}, {extended: true}, tx)', () => {
		it('should return array that contains extended account objects for each given publicKey', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 55566,
			};

			const account2 = {
				address: 'delegateAddress2',
				isDelegate: 0,
				publicKey:
					'abca7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590aa',
				balance: 12345,
			};

			const expectedAccount = {
				...account,
				balance: '55566',
				isDelegate: false,
				username: null,
				asset: null,
				missedBlocks: 0,
				producedBlocks: 0,
				fees: '0',
				rewards: '0',
				productivity: 0,
			};

			const expectedAccount2 = {
				...account2,
				balance: '12345',
				isDelegate: false,
				username: null,
				asset: null,
				missedBlocks: 0,
				producedBlocks: 0,
				fees: '0',
				rewards: '0',
				productivity: 0,
			};

			await pgHelper.createAccount(account);
			await pgHelper.createAccount(account2);

			// Act
			let accounts;
			await db.tx(async tx => {
				accounts = await storage.entities.Account.get(
					{
						publicKey_in: [account.publicKey, account2.publicKey],
					},
					{ extended: true },
					tx,
				);
			});

			// Assert
			expect(accounts).toHaveLength(2);
			/**
			 * accounts should contain all expectedAccount objects
			 * However, there is no native matcher in jest to check
			 * if an array contains certain objects.
			 * Thus We need to have the assertions below.
			 *
			 * @todo Add toContainObjects matcher by using jest.extend
			 * https://jestjs.io/docs/en/expect.html#expectextendmatchers
			 */
			expect(accounts).toEqual(
				expect.arrayContaining([
					expect.objectContaining(expectedAccount),
					expect.objectContaining(expectedAccount2),
				]),
			);
		});
	});

	// @todo tx is missing in the arguments
	describe('Given arguments ({isDelegate: true}, {limit: activeDelegates, sort: ["voteWeigh:desc", "publicKey:asc"]})', () => {
		it.todo('should return array of sorted and limited delegate accounts');
	});
});
