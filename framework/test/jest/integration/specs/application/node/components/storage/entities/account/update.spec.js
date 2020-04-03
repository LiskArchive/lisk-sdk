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

describe('storage.entities.Account.update', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ database: 'AccountUpdate' });

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

	describe('update(filter = {publicKey: account.publicKey}, data = {rewards, fees, balance}, tx = tx)', () => {
		it('should update rewards, fees and balance fields for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 1234,
				fees: 123,
				rewards: 1235,
			};

			const expectedAccount = {
				...account,
				balance: '2234',
				fees: '423',
				rewards: '3235',
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						balance: (account.balance + 1000).toString(),
						fees: (account.fees + 300).toString(),
						rewards: (account.rewards + 2000).toString(),
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});

		it('should update nonce field for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				nonce: '5',
			};

			const expectedAccount = {
				...account,
				nonce: '6',
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						nonce: (BigInt(account.nonce) + BigInt(1)).toString(),
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});

		it('should update totalVotesReceived field for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				totalVotesReceived: '1000000',
			};

			const expectedTotalVotesReceived = '2000';

			const expectedAccount = {
				...account,
				totalVotesReceived: expectedTotalVotesReceived,
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						totalVotesReceived: expectedTotalVotesReceived,
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});

		it('should update votes field for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				votes: JSON.stringify([{ delegateAddress: '123L', amount: '100' }]),
			};

			const expectedAccount = {
				...account,
				votes: [
					{ delegateAddress: '123L', amount: '100' },
					{ delegateAddress: '456L', amount: '10' },
				],
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						votes: [
							{ delegateAddress: '123L', amount: '100' },
							{ delegateAddress: '456L', amount: '10' },
						],
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});

		it('should update unlocking field for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				unlocking: JSON.stringify([
					{ delegateAddress: '123L', amount: '100', unvoteHeight: 10 },
				]),
			};

			const expectedAccount = {
				...account,
				unlocking: [
					{ delegateAddress: '123L', amount: '100', unvoteHeight: 10 },
					{ delegateAddress: '123L', amount: '50', unvoteHeight: 20 },
				],
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						unlocking: [
							{ delegateAddress: '123L', amount: '100', unvoteHeight: 10 },
							{ delegateAddress: '123L', amount: '50', unvoteHeight: 20 },
						],
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});

		it('should update delegate field for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				delegate: {
					lastForgedHeight: 0,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [],
				},
			};

			const expectedAccount = {
				...account,
				delegate: {
					lastForgedHeight: 10,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [5],
				},
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						delegate: {
							lastForgedHeight: 10,
							consecutiveMissedBlocks: 0,
							isBanned: false,
							pomHeights: [5],
						},
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});
	});
});
