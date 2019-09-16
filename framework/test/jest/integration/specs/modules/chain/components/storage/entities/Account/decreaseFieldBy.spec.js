const {
	Account,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');

describe('storage.entities.Account.decreaseFieldBy', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'AccountDecreaseFieldBy' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('Account', Account);

		storage.entities.Account.extendDefaultOptions({
			limit: 101, // @todo get it from constants
		});
	});

	afterAll(async () => {
		await db.done();
		await pgHelper.cleanup();
	});

	beforeEach(async () => {
		await db.query('DELETE FROM mem_accounts');
	});

	describe('Given arguments ({publicKey}, "producedBlocks", "1", tx)', () => {
		it('should decrease "producedBlocks" property of given account by "1"', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 100,
				producedBlocks: 5,
			};

			const expectedValue = 4;

			await PgHelper.createAccount(db, account);

			// Act
			await db
				.tx(async tx => {
					await storage.entities.Account.decreaseFieldBy(
						{
							publicKey: account.publicKey,
						},
						'producedBlocks',
						'1',
						tx,
					);
				})
				.catch(console.error);

			const updatedAccount = await PgHelper.getAccountByPublicKey(
				db,
				account.publicKey,
			);

			// Assert
			expect(updatedAccount.producedBlocks).toEqual(expectedValue);
		});
	});

	describe('Given arguments ({publicKey_in: []}, "missedBlocks", "1", tx)', () => {
		it('should decrease "missedBlocks" property of given account by 1', async () => {
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

			const expectedValue1 = 4;
			const expectedValue2 = 9;

			await PgHelper.createAccount(db, account);
			await PgHelper.createAccount(db, account2);

			// Act
			await db
				.tx(async tx => {
					await storage.entities.Account.decreaseFieldBy(
						{
							publicKey_in: [account.publicKey, account2.publicKey],
						},
						'missedBlocks',
						'1',
						tx,
					);
				})
				.catch(console.error);

			const updatedAccount1 = await PgHelper.getAccountByPublicKey(
				db,
				account.publicKey,
			);
			const updatedAccount2 = await PgHelper.getAccountByPublicKey(
				db,
				account2.publicKey,
			);

			// Assert
			expect(updatedAccount1.missedBlocks).toEqual(expectedValue1);
			expect(updatedAccount2.missedBlocks).toEqual(expectedValue2);
		});
	});

	describe('Given arguments ({publicKey}, "voteWeight", "Number", tx)', () => {
		it('should decrease "voteWeight" property of given account by given value', async () => {
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
			const expectedValue = '190';

			await PgHelper.createAccount(db, account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.decreaseFieldBy(
					{
						publicKey: account.publicKey,
					},
					'voteWeight',
					'10',
					tx,
				);
			});

			const updatedAccount = await PgHelper.getAccountByPublicKey(
				db,
				account.publicKey,
			);

			// Assert
			expect(updatedAccount.voteWeight).toBe(expectedValue);
		});
	});
});
