const {
	Account,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');
const { constants } = require('../../../../../../../../utils');

describe('storage.entities.Account.get', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'AccountGet' });

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
		await db.query('DELETE FROM mem_accounts');
	});

	describe('Given arguments ({publicKey}, {extended: true}, tx)', () => {
		it('should return array that contains 1 extended account object that has "votedDelegatesPublicKeys" and "membersPublicKeys" properties', async () => {
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
				isDelegate: false,
				secondPublicKey: null,
				username: null,
				secondSignature: false,
				asset: null,
				multiMin: 0,
				multiLifetime: 0,
				nameExist: false,
				missedBlocks: 0,
				producedBlocks: 0,
				rank: null,
				fees: '0',
				rewards: '0',
				vote: '0',
				voteWeight: '0',
				productivity: 0,
				votedDelegatesPublicKeys: null,
				membersPublicKeys: null,
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
			// properties that comes with "{extended: true}" option.
			expect(accounts[0]).toHaveProperty('votedDelegatesPublicKeys');
			expect(accounts[0]).toHaveProperty('membersPublicKeys');
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
				secondPublicKey: null,
				username: null,
				secondSignature: false,
				asset: null,
				multiMin: 0,
				multiLifetime: 0,
				nameExist: false,
				missedBlocks: 0,
				producedBlocks: 0,
				rank: null,
				fees: '0',
				rewards: '0',
				vote: '0',
				voteWeight: '0',
				productivity: 0,
				votedDelegatesPublicKeys: null,
				membersPublicKeys: null,
			};

			const expectedAccount2 = {
				...account2,
				balance: '12345',
				isDelegate: false,
				secondPublicKey: null,
				username: null,
				secondSignature: false,
				asset: null,
				multiMin: 0,
				multiLifetime: 0,
				nameExist: false,
				missedBlocks: 0,
				producedBlocks: 0,
				rank: null,
				fees: '0',
				rewards: '0',
				vote: '0',
				voteWeight: '0',
				productivity: 0,
				votedDelegatesPublicKeys: null,
				membersPublicKeys: null,
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
