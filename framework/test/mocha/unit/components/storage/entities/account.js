/* eslint-disable mocha/no-pending-tests */
/*
 * Copyright © 2018 Lisk Foundation
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

'use strict';

const randomstring = require('randomstring');
const {
	BaseEntity,
	Account,
} = require('../../../../../../src/components/storage/entities');
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../../../../../../src/components/storage/errors');
const storageSandbox = require('../../../../common/storage_sandbox');
const seeder = require('../../../../common/storage_seed');
const accountFixtures = require('../../../../fixtures').accounts;
const transactionsFixtures = require('../../../../fixtures').transactions;
const forksFixtures = require('../../../../fixtures').forks;

const defaultCreateValues = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: 0,
	u_secondSignature: 0,
	username: null,
	u_username: null,
	isDelegate: false,
	u_isDelegate: false,
	balance: '0',
	u_balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	nameExist: false,
	u_nameExist: false,
	multiMin: 0,
	u_multiMin: 0,
	multiLifetime: 0,
	u_multiLifetime: 0,
};

const dependentFieldsTableMap = {
	membersPublicKeys: 'mem_accounts2multisignatures',
	u_membersPublicKeys: 'mem_accounts2u_multisignatures',
	votedDelegatesPublicKeys: 'mem_accounts2delegates',
	u_votedDelegatesPublicKeys: 'mem_accounts2u_delegates',
};

describe('Account', () => {
	let adapter;
	let storage;
	let AccountEntity;
	let TransactionEntity;
	let SQLs;
	let validAccountSQLs;
	let validAccountFields;
	let validOptions;
	let validFilters;
	let validExtendedObjectFields;
	let validSimpleObjectFields;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_storage_accounts'
		);
		await storage.bootstrap();

		adapter = storage.adapter;

		AccountEntity = storage.entities.Account;
		TransactionEntity = storage.entities.Transaction;
		SQLs = AccountEntity.SQLs;

		validAccountSQLs = [
			'selectSimple',
			'selectFull',
			'count',
			'create',
			'update',
			'updateOne',
			'isPersisted',
			'delete',
			'resetUnconfirmedState',
			'resetMemTables',
			'increaseFieldBy',
			'decreaseFieldBy',
			'createDependentRecord',
			'deleteDependentRecord',
			'delegateBlocksRewards',
			'syncDelegatesRank',
			'countDuplicatedDelegates',
			'insertFork',
		];

		validAccountFields = [
			'address',
			'publicKey',
			'secondPublicKey',
			'username',
			'u_username',
			'isDelegate',
			'u_isDelegate',
			'secondSignature',
			'u_secondSignature',
			'balance',
			'u_balance',
			'multiMin',
			'u_multiMin',
			'multiLifetime',
			'u_multiLifetime',
			'nameExist',
			'u_nameExist',
			'fees',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'rank',
			'vote',
		];

		validExtendedObjectFields = [
			'address',
			'publicKey',
			'secondPublicKey',
			'username',
			'isDelegate',
			'secondSignature',
			'balance',
			'multiMin',
			'multiLifetime',
			'nameExist',
			'missedBlocks',
			'producedBlocks',
			'rank',
			'fees',
			'rewards',
			'vote',
			'u_username',
			'u_isDelegate',
			'u_secondSignature',
			'u_nameExist',
			'u_multiMin',
			'u_multiLifetime',
			'u_balance',
			'productivity',
			'votedDelegatesPublicKeys',
			'u_votedDelegatesPublicKeys',
			'membersPublicKeys',
			'u_membersPublicKeys',
		];

		validSimpleObjectFields = [
			'address',
			'publicKey',
			'secondPublicKey',
			'username',
			'isDelegate',
			'secondSignature',
			'balance',
			'multiMin',
			'multiLifetime',
			'nameExist',
			'missedBlocks',
			'producedBlocks',
			'rank',
			'fees',
			'rewards',
			'vote',
		];

		validFilters = [
			'address',
			'address_eql',
			'address_ne',
			'address_in',
			'address_like',
			'publicKey',
			'publicKey_eql',
			'publicKey_ne',
			'publicKey_in',
			'publicKey_like',
			'secondPublicKey',
			'secondPublicKey_eql',
			'secondPublicKey_ne',
			'secondPublicKey_in',
			'secondPublicKey_like',
			'username',
			'username_eql',
			'username_ne',
			'username_in',
			'username_like',
			'u_username',
			'u_username_eql',
			'u_username_ne',
			'u_username_in',
			'u_username_like',
			'isDelegate',
			'isDelegate_eql',
			'isDelegate_ne',
			'u_isDelegate',
			'u_isDelegate_eql',
			'u_isDelegate_ne',
			'secondSignature',
			'secondSignature_eql',
			'secondSignature_ne',
			'u_secondSignature',
			'u_secondSignature_eql',
			'u_secondSignature_ne',
			'balance',
			'balance_eql',
			'balance_ne',
			'balance_gt',
			'balance_gte',
			'balance_lt',
			'balance_lte',
			'balance_in',
			'multiMin',
			'multiMin_eql',
			'multiMin_ne',
			'multiMin_gt',
			'multiMin_gte',
			'multiMin_lt',
			'multiMin_lte',
			'multiMin_in',
			'multiLifetime',
			'multiLifetime_eql',
			'multiLifetime_ne',
			'multiLifetime_gt',
			'multiLifetime_gte',
			'multiLifetime_lt',
			'multiLifetime_lte',
			'multiLifetime_in',
			'nameExist',
			'nameExist_eql',
			'nameExist_ne',
			'fees',
			'fees_eql',
			'fees_ne',
			'fees_gt',
			'fees_gte',
			'fees_lt',
			'fees_lte',
			'fees_in',
			'rewards',
			'rewards_eql',
			'rewards_ne',
			'rewards_gt',
			'rewards_gte',
			'rewards_lt',
			'rewards_lte',
			'rewards_in',
			'producedBlocks',
			'producedBlocks_eql',
			'producedBlocks_ne',
			'producedBlocks_gt',
			'producedBlocks_gte',
			'producedBlocks_lt',
			'producedBlocks_lte',
			'producedBlocks_in',
			'missedBlocks',
			'missedBlocks_eql',
			'missedBlocks_ne',
			'missedBlocks_gt',
			'missedBlocks_gte',
			'missedBlocks_lt',
			'missedBlocks_lte',
			'missedBlocks_in',
			'rank',
			'rank_eql',
			'rank_ne',
			'rank_gt',
			'rank_gte',
			'rank_lt',
			'rank_lte',
			'rank_in',
			'vote',
			'vote_eql',
			'vote_ne',
			'vote_gt',
			'vote_gte',
			'vote_lt',
			'vote_lte',
			'vote_in',
			'votedDelegatesPublicKeys_in',
			'u_votedDelegatesPublicKeys_in',
			'membersPublicKeys_in',
			'u_membersPublicKeys_in',
		];

		validOptions = {
			limit: 100,
			offset: 0,
		};
	});

	beforeEach(() => seeder.seed(storage));

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(storage)
			.then(() => done(null))
			.catch(done);
	});

	it('should be a constructable function', async () => {
		expect(Account.prototype.constructor).not.to.be.null;
		expect(Account.prototype.constructor.name).to.be.eql('Account');
	});

	it('should extend BaseEntity', async () => {
		expect(Account.prototype instanceof BaseEntity).to.be.true;
	});

	it('should assign a prototype property defaultOptions', async () => {
		const account = new Account(adapter);
		expect(account.defaultOptions.sort).to.be.eql('balance:asc');
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Account.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const account = new Account(adapter);
			expect(typeof account.parseFilters).to.be.eql('function');
			expect(typeof account.addFilter).to.be.eql('function');
			expect(typeof account.addField).to.be.eql('function');
			expect(typeof account.getFilters).to.be.eql('function');
			expect(typeof account.getUpdateSet).to.be.eql('function');
			expect(typeof account.getValuesSet).to.be.eql('function');
			expect(typeof account.begin).to.be.eql('function');
			expect(typeof account.validateFilters).to.be.eql('function');
			expect(typeof account.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const account = new Account(adapter);
			expect(account.SQLs).to.include.all.keys(validAccountSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const addFieldSpy = sinonSandbox.spy(Account.prototype, 'addField');
			const account = new Account(adapter);
			expect(addFieldSpy.callCount).to.eql(Object.keys(account.fields).length);
		});

		it('should setup correct fields', async () => {
			const account = new Account(adapter);
			expect(account.fields).to.include.all.keys(validAccountFields);
		});

		it('should setup specific filters', async () => {
			expect(AccountEntity.getFilters()).to.have.members(validFilters);
		});
	});

	describe('getOne()', () => {
		it('should call _getResults with proper param for extended=false', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: false }
			);
			expect(_getResultsSpy.firstCall.args[1]).to.be.eql({ extended: false });
		});

		it('should call _getResults with proper param for extended=true', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: true }
			);
			expect(_getResultsSpy.firstCall.args[1]).to.be.eql({ extended: true });
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.begin('testTX', async tx => {
				await AccountEntity.getOne({ address: anAccount.address }, {}, tx);
				expect(
					Object.getPrototypeOf(_getResultsSpy.firstCall.args[2])
				).to.be.eql(Object.getPrototypeOf(tx));
			});
		});

		it('should resolve with one object matching specification of type definition of simple object', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const results = await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: false }
			);
			expect(results).to.have.all.keys(validSimpleObjectFields);
		});

		it('should resolve with one object matching specification of type definition of full object', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const results = await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: true }
			);
			expect(results).to.have.all.keys(validExtendedObjectFields);
		});

		it('should reject with error if matched with multiple records for provided filters', async () => {
			expect(AccountEntity.getOne({})).to.be.rejected;
		});

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				expect(AccountEntity.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('get()', () => {
		it('should return data without any error', async () => {
			expect(AccountEntity.get()).to.be.fulfilled;
		});

		it('should call _getResults with proper param for extended=false', async () => {
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.get({}, { extended: false });
			expect(_getResultsSpy.firstCall.args[1]).to.be.eql({ extended: false });
		});

		it('should call _getResults with proper param for extended=true', async () => {
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.get({}, { extended: true });
			expect(_getResultsSpy.firstCall.args[1]).to.be.eql({ extended: true });
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile', async () => {
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.begin('testTX', async tx => {
				await AccountEntity.get({}, {}, tx);
				expect(
					Object.getPrototypeOf(_getResultsSpy.firstCall.args[2])
				).to.be.eql(Object.getPrototypeOf(tx));
			});
		});

		it('should resolve with one object matching specification of type definition of simple object', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const results = await AccountEntity.get(
				{ address: anAccount.address },
				{ extended: false }
			);
			expect(results[0]).to.have.all.keys(validSimpleObjectFields);
		});

		it('should resolve with one object matching specification of type definition of full object', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const results = await AccountEntity.get(
				{ address: anAccount.address },
				{ extended: true }
			);
			expect(results[0]).to.have.all.keys(validExtendedObjectFields);
		});

		it('should not change any of the provided parameter');

		describe('dynamic fields', () => {
			it('should fetch "votedDelegatesPublicKeys" with correct query', async () => {
				const accounts = await AccountEntity.get({}, { extended: true });

				await Promise.all(
					accounts.map(async account => {
						const keys = await adapter.execute(
							`SELECT (ARRAY_AGG("dependentId")) AS "keys" FROM mem_accounts2delegates WHERE "accountId" = '${
								account.address
							}'`
						);
						expect(account.votedDelegatesPublicKeys).to.be.eql(keys[0].keys);
					})
				);
			});

			it('should fetch "u_votedDelegatesPublicKeys" with correct query', async () => {
				const accounts = await AccountEntity.get({}, { extended: true });

				await Promise.all(
					accounts.map(async account => {
						const keys = await adapter.execute(
							`SELECT (ARRAY_AGG("dependentId")) AS "keys" FROM mem_accounts2u_delegates WHERE "accountId" = '${
								account.address
							}'`
						);
						expect(account.u_votedDelegatesPublicKeys).to.be.eql(keys[0].keys);
					})
				);
			});

			it('should fetch "membersPublicKeys" with correct query', async () => {
				const accounts = await AccountEntity.get({}, { extended: true });

				await Promise.all(
					accounts.map(async account => {
						const keys = await adapter.execute(
							`SELECT (ARRAY_AGG("dependentId")) AS "keys" FROM mem_accounts2multisignatures WHERE "accountId" = '${
								account.address
							}'`
						);
						expect(account.membersPublicKeys).to.be.eql(keys[0].keys);
					})
				);
			});

			it('should fetch "u_membersPublicKeys" with correct query', async () => {
				const accounts = await AccountEntity.get({}, { extended: true });

				await Promise.all(
					accounts.map(async account => {
						const keys = await adapter.execute(
							`SELECT (ARRAY_AGG("dependentId")) AS "keys" FROM mem_accounts2u_multisignatures WHERE "accountId" = '${
								account.address
							}'`
						);
						expect(account.u_membersPublicKeys).to.be.eql(keys[0].keys);
					})
				);
			});

			it('should fetch "productivity" with correct query', async () => {
				const producedBlocks = 5;
				const missedBlocks = 3;
				const validAccount = new accountFixtures.Account({
					producedBlocks,
					missedBlocks,
				});
				await AccountEntity.create(validAccount);
				const productivity = parseInt(
					producedBlocks / (producedBlocks + missedBlocks) * 100.0
				);

				const account = await AccountEntity.getOne(
					{ address: validAccount.address },
					{ extended: true }
				);

				expect(account.productivity).to.be.eql(productivity);
			});

			it('should fetch "productivity" with correct query when base values are zero', async () => {
				const producedBlocks = 0;
				const missedBlocks = 0;
				const validAccount = new accountFixtures.Account({
					producedBlocks,
					missedBlocks,
				});
				await AccountEntity.create(validAccount);
				const productivity = 0;

				const account = await AccountEntity.getOne(
					{ address: validAccount.address },
					{ extended: true }
				);

				expect(account.productivity).to.be.eql(productivity);
			});
		});

		describe('data casting', () => {
			const options = { extended: true, limit: 1 };
			const filters = {};

			it('should return "isDelegate" as "boolean"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].isDelegate).to.be.a('boolean');
			});

			it('should return "u_isDelegate" as "boolean"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].u_isDelegate).to.be.a('boolean');
			});

			it('should return "secondSignature" as "boolean"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].secondSignature).to.be.a('boolean');
			});

			it('should return "u_secondSignature" as "boolean"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].u_secondSignature).to.be.a('boolean');
			});

			it('should return "rank" as null', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].rank).to.be.eql(null);
			});

			it('should return "fees" as "bigint"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].fees).to.be.a('string');
			});

			it('should return "rewards" as "bigint"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].rewards).to.be.a('string');
			});

			it('should return "vote" as "bigint"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].vote).to.be.a('string');
			});

			it('should return "producedBlocks" as "number"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].producedBlocks).to.be.a('number');
			});

			it('should return "missedBlocks" as "number"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].missedBlocks).to.be.a('number');
			});
		});

		describe('functions', () => {
			const options = { extended: true, limit: 1 };
			let filters = null;
			let validAccount = null;

			beforeEach(async () => {
				validAccount = new accountFixtures.Account({
					secondPublicKey: randomstring
						.generate({ charset: '0123456789ABCDEF', length: 64 })
						.toLowerCase(),
				});
				await AccountEntity.create(validAccount);
				filters = { address: validAccount.address };
			});

			it('should always return "publicKey" as "encode(publicKey, \'hex\')"', async () => {
				const accounts = await AccountEntity.get(filters, options);
				const rawKey = await adapter.execute(
					`SELECT "publicKey" FROM mem_accounts WHERE "address" = '${
						validAccount.address
					}'`
				);

				expect(accounts[0].publicKey).to.be.eql(
					rawKey[0].publicKey.toString('hex')
				);
			});

			it('should always return "secondPublicKey" as "encode(secondPublicKey, \'hex\')"', async () => {
				const accounts = await AccountEntity.get(filters, options);
				const rawKey = await adapter.execute(
					`SELECT "secondPublicKey" FROM mem_accounts WHERE "address" = '${
						validAccount.address
					}'`
				);

				expect(accounts[0].secondPublicKey).to.be.eql(
					rawKey[0].secondPublicKey.toString('hex')
				);
			});
		});

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				expect(AccountEntity.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});

		describe('options', () => {
			describe('sort', () => {
				it('should sort by address in ascending if sort="address"', async () => {
					const data = await AccountEntity.get(
						{},
						{ sort: 'address', limit: 10 }
					);
					const actualData = _.map(data, 'address');
					expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
				});

				it('should sort by address in ascending if sort="address:asc"', async () => {
					const data = await AccountEntity.get(
						{},
						{ sort: 'address:asc', limit: 10 }
					);
					const actualData = _.map(data, 'address');
					expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
				});

				it('should sort by address in descending if sort="address:desc"', async () => {
					const data = await AccountEntity.get(
						{},
						{ sort: 'address:desc', limit: 10 }
					);
					const actualData = _.map(data, 'address');
					expect(actualData).to.be.eql(_(actualData).dbSort('desc'));
				});

				it('should sort by multiple keys if sort is provided as array', async () => {
					const accounts = await AccountEntity.get(
						{},
						{
							sort: ['username:desc', 'address:asc'],
							limit: 10,
						}
					);

					const sortedAccounts = _.orderBy(
						Object.assign({}, accounts),
						['username', 'address'],
						['desc', 'asc']
					);

					expect(accounts).to.lengthOf.above(0);
					return expect(accounts).to.eql(sortedAccounts);
				});

				it('should fail if unknown sort field is specified');
			});

			describe('limit & offset', () => {
				it('should return default limit results if no limit is specified', async () => {
					AccountEntity.extendDefaultOptions({ limit: 2 });
					const accounts = await AccountEntity.get({});

					expect(AccountEntity.defaultOptions.limit).to.be.eql(2);
					expect(accounts).to.have.lengthOf(2);
				});

				it('should return all results if limit is set to null is specified', async () => {
					const accounts = await AccountEntity.get({}, { limit: null });
					const result = await adapter.execute(
						'SELECT COUNT(*)::int as count from mem_accounts'
					);

					expect(accounts).to.have.lengthOf(result[0].count);
				});

				it('should return 1 result if options.limit=1', async () => {
					const accounts = await AccountEntity.get({}, { limit: 1 });
					expect(accounts).to.have.lengthOf(1);
				});

				it('should skip first result if options.offset=1', async () => {
					const data1 = await AccountEntity.get({}, { limit: 2 });
					const data2 = await AccountEntity.get({}, { limit: 1, offset: 1 });

					expect(data1.length).to.eql(2);
					expect(data2.length).to.eql(1);
					expect(data2[0]).to.eql(data1[1]);
				});

				it('should return all records if limit=null', async () => {
					const accounts = await AccountEntity.get({}, { limit: null });
					const result = await adapter.execute(
						'SELECT COUNT(*) FROM mem_accounts;'
					);

					expect(accounts).to.have.lengthOf(result[0].count);
				});
			});
		});
	});

	describe('_getResults()', () => {
		const accounts = [
			new accountFixtures.Account(),
			new accountFixtures.Account(),
			new accountFixtures.Account(),
		];

		beforeEach(async () => {
			await AccountEntity.create(accounts);
		});

		it('should accept only valid filters', async () => {
			// Arrange
			const validFilter = {
				address: accounts[0].address,
			};
			// Act & Assert
			expect(() => {
				AccountEntity.getOne(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters');

		it('should accept only valid options', async () => {
			// Act & Assert
			expect(() => {
				AccountEntity.get({}, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options');

		it('should accept "tx" as last parameter and pass to adapter.executeFile', async () => {
			const executeSpy = sinonSandbox.spy(AccountEntity.adapter, 'executeFile');
			await AccountEntity.begin('testTX', async tx => {
				await AccountEntity.get({}, {}, tx);
				expect(Object.getPrototypeOf(executeSpy.firstCall.args[3])).to.be.eql(
					Object.getPrototypeOf(tx)
				);
			});
		});

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				// Arrange
				const account = new Account(adapter);
				expect(account.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('create()', () => {
		it('should throw error when address is missing', async () => {
			expect(() => {
				AccountEntity.create({ foo: 'bar', baz: 'qux' }, validOptions);
			}).to.throw("Property 'address' doesn't exist");
		});

		it('should merge default values to the provided account object', async () => {
			sinonSandbox.spy(AccountEntity, 'getValuesSet');
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);

			const mergedObject = Object.assign({}, defaultCreateValues, account);

			expect(AccountEntity.getValuesSet.firstCall.args[0]).to.be.eql([
				mergedObject,
			]);
		});

		it('should call adapter.executeFile with proper params', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);

			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.create);
		});

		it('should create an account object successfully', async () => {
			const account = new accountFixtures.Account();

			await expect(AccountEntity.create(account)).to.be.fulfilled;

			const accountResult = await AccountEntity.getOne(
				{ address: account.address },
				{ extended: true }
			);
			const mergedObject = Object.assign({}, defaultCreateValues, account);

			expect(mergedObject).to.be.eql(accountResult);
		});

		it('should create multiple account objects successfully', async () => {
			const accounts = [
				new accountFixtures.Account(),
				new accountFixtures.Account(),
			];

			expect(AccountEntity.create(accounts)).to.be.fulfilled;

			accounts.forEach(async account => {
				const accountResult = await AccountEntity.getOne(
					{ address: account.address },
					{ extended: true }
				);
				const mergedObject = Object.assign({}, defaultCreateValues, account);

				expect(mergedObject).to.be.eql(accountResult);
			});
		});

		it('should reject with invalid data provided', async () => {
			expect(
				AccountEntity.create(
					{ missedBlocks: 'FOO-BAR', address: '1234L' },
					validOptions
				)
			).to.be.rejected;
		});

		it('should populate account object with default values', async () => {
			const account = new accountFixtures.Account();
			await AccountEntity.create({ address: account.address });
			const accountFromDB = await AccountEntity.getOne(
				{ address: account.address },
				{ extended: true }
			);
			const expectedObject = {
				address: account.address,
				publicKey: null,
				secondPublicKey: null,
				username: null,
				isDelegate: false,
				secondSignature: false,
				balance: '0',
				multiMin: 0,
				multiLifetime: 0,
				nameExist: false,
				missedBlocks: 0,
				producedBlocks: 0,
				rank: null,
				fees: '0',
				rewards: '0',
				vote: '0',
				u_username: null,
				u_isDelegate: false,
				u_secondSignature: false,
				u_nameExist: false,
				u_multiMin: 0,
				u_multiLifetime: 0,
				u_balance: '0',
				productivity: 0,
				votedDelegatesPublicKeys: null,
				u_votedDelegatesPublicKeys: null,
				membersPublicKeys: null,
				u_membersPublicKeys: null,
			};
			expect(accountFromDB).to.be.eql(expectedObject);
		});
	});

	describe('update()', () => {
		it('should accept only valid filters', async () => {
			// Arrange
			const invalidFilter = {
				foo: 'bar',
			};
			// Act & Assert
			expect(() => {
				AccountEntity.update(invalidFilter, {});
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for in-valid filters', async () => {
			const account = new accountFixtures.Account();

			expect(() => {
				AccountEntity.update({ myAddress: '123' }, account);
			}).to.throw(
				NonSupportedFilterTypeError,
				'One or more filters are not supported.'
			);
		});

		it('should update account without any error', async () => {
			const account = new accountFixtures.Account();

			await AccountEntity.create(account);

			expect(AccountEntity.update({ address: account.address }, account)).to.be
				.fulfilled;
		});

		it('should call mergeFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns(),
				executeFile: sinonSandbox.stub().resolves(),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub();
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.update(validFilter, { username: 'not_a_rand_name' });
			// Assert
			expect(account.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([randAccount]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub().returns(validFilter);
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.update(validFilter, { username: 'not_a_rand_name' });
			// Assert
			expect(account.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call getUpdateSet with proper params', async () => {
			// Arrange
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves(),
				parseQueryComponent: sinonSandbox.stub(),
			};

			const validFilter = {
				address: 'test1234',
			};

			const randomAccount = new accountFixtures.Account();

			const account = new Account(localAdapter);
			delete randomAccount.address;
			account.mergeFilters = sinonSandbox.stub().returns(validFilter);
			account.parseFilters = sinonSandbox.stub();
			account.getUpdateSet = sinonSandbox.stub();
			// Act
			account.update(validFilter, randomAccount);
			// Assert
			expect(account.getUpdateSet.calledWith(randomAccount)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			const account = new accountFixtures.Account();
			// Act
			await AccountEntity.update({ address: account.address }, account);
			// Assert
			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.update);
		});

		it('should update all accounts successfully with matching condition', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			const delegate = new accountFixtures.Delegate();
			// Act
			await AccountEntity.create(account);
			await AccountEntity.create(delegate);

			await AccountEntity.update({ isDelegate: true }, { balance: '1234' });
			await AccountEntity.update({ isDelegate: false }, { balance: '5678' });

			const result1 = await AccountEntity.getOne({ address: delegate.address });
			const result2 = await AccountEntity.getOne({ address: account.address });
			// Assert
			expect(result1.balance).to.be.eql('1234');
			expect(result2.balance).to.be.eql('5678');
		});
		it('should not pass the readonly fields to update set', async () => {
			// Arrange
			sinonSandbox.spy(AccountEntity, 'getUpdateSet');
			const account = new accountFixtures.Account();
			// Act
			await AccountEntity.update({ address: account.address }, account);
			// Assert
			expect(AccountEntity.getUpdateSet).to.be.calledOnce;
			expect(AccountEntity.getUpdateSet.firstCall.args[0]).to.not.have.keys([
				'address',
			]);
		});

		it('should skip the readonly fields to update', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			const address = account.address;

			await AccountEntity.create(account);
			await AccountEntity.update(
				{ address },
				{ balance: '1234', address: '1234L' }
			);
			// Act
			const result = await AccountEntity.getOne({ address });
			// Assert
			expect(result.balance).to.be.eql('1234');
			expect(result.address).to.not.eql('1234L');
			expect(result.address).to.be.eql(address);
		});

		it('should resolve promise without any error if no data is passed', async () => {
			expect(AccountEntity.update({ address: '123L' }, {})).to.be.fulfilled;
		});

		it('should be rejected if any invalid attribute is provided', async () => {
			expect(AccountEntity.update({ address: '123L' }, { invalid: true })).to.be
				.rejected;
		});

		it('should not throw error if no matching record found', async () => {
			// Arrange
			const filter = { rank: -100 };
			// Act & Assert
			expect(() => {
				AccountEntity.update(filter, { balance: 20 });
			}).not.to.throw();
		});
	});

	describe('upsert', () => {
		it('should throw error if no filter specified', async () => {
			const account = new accountFixtures.Account();
			expect(AccountEntity.upsert({}, account)).to.be.rejectedWith(
				NonSupportedFilterTypeError,
				'One or more filters are required for this operation.'
			);
		});

		it('should succeed updating or insert object', async () => {
			const account = new accountFixtures.Account();
			expect(AccountEntity.upsert({ address: account.address }, account)).to.be
				.fulfilled;
		});

		it('should insert account if matching filters not found', async () => {
			const account = new accountFixtures.Account();
			const filters = { address: account.address };

			await AccountEntity.upsert(filters, account);
			const result = await AccountEntity.getOne(filters);

			expect(result).to.be.not.null;
		});

		it('should update account if matching filters found', async () => {
			const account1 = new accountFixtures.Account();
			const filters = { address: account1.address };

			// Since DB trigger protects from updating username only if it was null before
			delete account1.username;
			delete account1.u_username;

			await AccountEntity.create(account1);
			await AccountEntity.upsert(filters, {
				username: 'my-user',
				balance: '1234',
			});

			const result = await AccountEntity.getOne(filters);

			expect(result.username).to.be.eql('my-user');
			expect(result.balance).to.be.eql('1234');
		});

		it('should execute all queries in one database transaction (txLevel = 0) tagged as `db:accounts:upsert`', async () => {
			const account = new accountFixtures.Account();
			let eventCtx;

			adapter.db.$config.options.query = function(event) {
				eventCtx = event.ctx;
			};

			const connect = sinonSandbox.stub();
			const disconnect = sinonSandbox.stub();

			adapter.db.$config.options.connect = connect;
			adapter.db.$config.options.disconnect = disconnect;

			await AccountEntity.upsert({ address: account.address }, account);

			expect(eventCtx).to.not.null;
			expect(eventCtx.isTX).to.be.true;
			expect(eventCtx.txLevel).to.be.eql(0);
			expect(eventCtx.tag).to.be.eql('storage:account:upsert');
			expect(connect.calledOnce).to.be.true;
			expect(disconnect.calledOnce).to.be.true;

			delete adapter.db.$config.options.connect;
			delete adapter.db.$config.options.disconnect;
			delete adapter.db.$config.options.query;
		});
	});

	describe('updateOne()', () => {
		it('should throw error for in-valid filters', async () => {
			// Arrange
			const invalidFilter = {
				foo: 'bar',
			};
			// Act & Assert
			expect(() => {
				AccountEntity.updateOne(invalidFilter, { username: 'test1234' });
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			// Arrange
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns(),
				executeFile: sinonSandbox.stub().resolves(),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				address: 'test1234',
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub();
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.updateOne(validFilter);
			// Assert
			expect(account.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([randAccount]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub().returns(validFilter);
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.updateOne(validFilter);
			// Assert
			expect(account.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call getUpdateSet with proper params', async () => {
			// Arrange
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves(),
				parseQueryComponent: sinonSandbox.stub(),
			};

			const validFilter = {
				address: 'test1234',
			};

			const randomAccount = new accountFixtures.Account();

			const account = new Account(localAdapter);
			delete randomAccount.address;
			account.mergeFilters = sinonSandbox.stub().returns(validFilter);
			account.parseFilters = sinonSandbox.stub();
			account.getUpdateSet = sinonSandbox.stub();
			// Act
			account.updateOne(validFilter, randomAccount);
			// Assert
			expect(account.getUpdateSet.calledWith(randomAccount)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			const account = new accountFixtures.Account();
			// Act
			await AccountEntity.updateOne({ address: account.address }, account);
			// Assert
			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.updateOne);
		});

		it('should update only one account object successfully with matching condition', async () => {
			// Arrange
			const accounts = [
				new accountFixtures.Account(),
				new accountFixtures.Account(),
			];
			accounts[0].rank = 1000;
			accounts[1].rank = 1000;

			const filter = { rank: 1000 };

			await AccountEntity.create(accounts);
			// Act
			await AccountEntity.updateOne(filter, { balance: 20 });
			const results = await AccountEntity.get(filter);
			const updated = results.filter(anAccount => anAccount.balance === '20');
			// Assert
			expect(updated.length).to.be.eql(1);
		});

		it('should be rejected if any invalid attribute is provided', async () => {
			// Arrange
			const randomAccount = new accountFixtures.Account();
			await AccountEntity.create(randomAccount);
			// Act & Assert
			expect(
				AccountEntity.updateOne(
					{ address: randomAccount.address },
					{ username: 'AN_INVALID_LONG_USERNAME' }
				)
			).to.be.rejected;
		});

		it('should not throw error if no matching record found', async () => {
			// Arrange
			const filter = { rank: -100 };
			// Act & Assert
			expect(() => {
				AccountEntity.updateOne(filter, { balance: 20 });
			}).not.to.throw();
		});
	});

	describe('isPersisted()', () => {
		it('should throw error for in-valid filters', async () => {
			// Arrange
			const invalidFilter = {
				foo: 'bar',
			};
			// Act & Assert
			expect(() => {
				AccountEntity.isPersisted(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns(),
				executeFile: sinonSandbox.stub().resolves([randAccount]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub();
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.isPersisted(validFilter);
			// Assert
			expect(account.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([randAccount]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub().returns(validFilter);
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.isPersisted(validFilter);
			// Assert
			expect(account.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			const account = new accountFixtures.Account();
			// Act
			await AccountEntity.isPersisted({ address: account.address });
			// Assert
			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.isPersisted);
		});

		it('should resolve with true if matching record found', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const res = await AccountEntity.isPersisted({ address: account.address });
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const res = await AccountEntity.isPersisted({ address: 'ABFFFF' });
			expect(res).to.be.false;
		});
	});

	describe('delete()', () => {
		it('should remove an existing account', async () => {
			const account = await adapter.execute(
				'SELECT * FROM mem_accounts LIMIT 1'
			);

			await AccountEntity.delete({ address: account[0].address });

			const result = await adapter.execute(
				'SELECT * FROM mem_accounts WHERE "address" = ${address}',
				{ address: account[0].address }
			);

			expect(result).to.be.empty;
		});
	});

	describe('aggregateBlocksReward()', () => {
		it('should use the correct SQL file with three parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const params = {
				generatorPublicKey: 'afafafafaf',
				fromTimestamp: (+new Date() / 1000).toFixed(),
				toTimestamp: (+new Date() / 1000).toFixed(),
			};
			await AccountEntity.delegateBlocksRewards(params);

			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(
				SQLs.delegateBlocksRewards
			);
			expect(adapter.executeFile.firstCall.args[1]).to.eql({
				generatorPublicKey: params.generatorPublicKey,
				fromTimestamp: params.fromTimestamp,
				toTimestamp: params.toTimestamp,
			});
			expect(adapter.executeFile).to.be.calledOnce;
		});

		it('should throw error if invalid public key is passed', async () =>
			expect(
				AccountEntity.delegateBlocksRewards({
					generatorPublicKey: 'xxxxxxxxx',
					start: (+new Date() / 1000).toFixed(),
					end: (+new Date() / 1000).toFixed(),
				})
			).to.be.rejectedWith('invalid hexadecimal digit: "x"'));

		it('should return empty data set if a valid but non existant key is passed', async () => {
			const account = new accountFixtures.Account();
			const rewards = await AccountEntity.delegateBlocksRewards({
				generatorPublicKey: account.publicKey,
				start: (+new Date() / 1000).toFixed(),
				end: (+new Date() / 1000).toFixed(),
			});
			expect(rewards).to.be.not.empty;
			expect(rewards).to.be.an('array');
			expect(rewards[0]).to.have.all.keys(
				'delegate',
				'count',
				'fees',
				'rewards'
			);
			expect(rewards[0].count).to.be.eql('0');
			expect(rewards[0].delegate).to.be.null;
			expect(rewards[0].fees).to.be.null;
			return expect(rewards[0].rewards).to.be.null;
		});

		it('should return empty data set if a valid public key of a non-delegate account is passed', async () => {
			const account = new accountFixtures.Account({
				isDelegate: false,
			});
			await AccountEntity.create(account);

			const rewards = await AccountEntity.delegateBlocksRewards({
				generatorPublicKey: account.publicKey,
				start: (+new Date() / 1000).toFixed(),
				end: (+new Date() / 1000).toFixed(),
			});
			expect(rewards).to.be.not.empty;
			expect(rewards).to.be.an('array');
			expect(rewards[0]).to.have.all.keys(
				'delegate',
				'count',
				'fees',
				'rewards'
			);
			expect(rewards[0].count).to.be.eql('0');
			expect(rewards[0].delegate).to.be.null;
			expect(rewards[0].fees).to.be.null;
			return expect(rewards[0].rewards).to.be.null;
		});

		it('should aggregate rewards and response in valid format', async () => {
			const account = await adapter.db.one(
				'SELECT encode("publicKey", \'hex\') as "publicKey" FROM mem_accounts LIMIT 1'
			);
			const rewards = await AccountEntity.delegateBlocksRewards({
				generatorPublicKey: account.publicKey,
				start: (+new Date('2017.01.01') / 1000).toFixed(),
				end: (+new Date() / 1000).toFixed(),
			});

			expect(rewards).to.be.not.empty;
			expect(rewards).to.be.an('array');
			return expect(rewards[0]).to.have.all.keys(
				'delegate',
				'count',
				'fees',
				'rewards'
			);
		});
	});

	describe('mergeFilters()', () => {
		it('should accept filters as single object', async () => {
			// Arrange
			const validFilter = {
				address: 'ABCFFF',
			};
			const mergeFiltersSpy = sinonSandbox.spy(AccountEntity, 'mergeFilters');
			// Act & Assert
			expect(() => {
				AccountEntity.get(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith(validFilter)).to.be.true;
		});

		it('should accept filters as array of objects', async () => {
			// Arrange
			const validFilter = {
				address: 'ABCFFF',
			};
			const mergeFiltersSpy = sinonSandbox.spy(AccountEntity, 'mergeFilters');
			// Act & Assert
			expect(() => {
				AccountEntity.get([validFilter, validFilter]);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith([validFilter, validFilter])).to.be.true;
		});

		it(
			'should merge provided filter with default filters by preserving default filters values '
		);
	});

	describe('resetUnconfirmedState()', () => {
		it('should use the correct SQL to fetch the count', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await AccountEntity.resetUnconfirmedState();

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.resetUnconfirmedState
			);
		});

		it('should pass no params to the SQL file', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await AccountEntity.resetUnconfirmedState();

			return expect(adapter.executeFile.args[1]).to.eql(undefined);
		});

		it('should execute only one query', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await AccountEntity.resetUnconfirmedState();

			expect(adapter.executeFile.calledOnce).to.be.true;
		});

		it('should throw error if something wrong in the SQL execution', async () => {
			sinonSandbox.stub(adapter, 'executeFile').rejects();

			expect(AccountEntity.resetUnconfirmedState()).to.be.rejected;
		});

		it('should update all accounts which have different unconfirmed state for u_isDelegate', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "isDelegate" = 1, "u_isDelegate" = 0'
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "isDelegate" <> "u_isDelegate"'
			);
			expect(result[0].count).to.be.equal('0');
		});

		it('should update all accounts which have different unconfirmed state for u_secondSignature', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "secondSignature" = 1, "u_secondSignature" = 0'
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "secondSignature" <> "u_secondSignature"'
			);

			expect(result[0].count).to.be.equal('0');
		});

		it('should update all accounts which have different unconfirmed state for u_username', async () => {
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "username" <> "u_username"'
			);

			return expect(result[0].count).to.be.equal('0');
		});

		it('should update all accounts which have different unconfirmed state for u_balance', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "balance" = 123, "u_balance" = 124'
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "balance" <> "u_balance"'
			);

			expect(result[0].count).to.be.equal('0');
		});

		it('should update all accounts which have different unconfirmed state for u_delegates', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "delegates" = \'Alpha\', "u_delegates" = \'Beta\' '
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "delegates" <> "u_delegates"'
			);

			expect(result[0].count).to.be.equal('0');
		});

		it('should update all accounts which have different unconfirmed state for u_multisignatures', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "multisignatures" = \'Alpha\', "u_multisignatures" = \'Beta\' '
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "multisignatures" <> "u_multisignatures"'
			);

			expect(result[0].count).to.be.equal('0');
		});

		it('should update all accounts which have different unconfirmed state for u_multimin', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "multimin" = 1, "u_multimin" = 0'
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "multimin" <> "u_multimin"'
			);

			expect(result[0].count).to.be.equal('0');
		});

		it('should update all db.accounts which have different unconfirmed state for u_multilifetime', async () => {
			await adapter.execute(
				'UPDATE mem_accounts SET "multilifetime" = 1, "u_multilifetime" = 0'
			);
			await AccountEntity.resetUnconfirmedState();
			const result = await adapter.execute(
				'SELECT count(*) FROM mem_accounts WHERE "multilifetime" <> "u_multilifetime"'
			);

			expect(result[0].count).to.be.equal('0');
		});
	});

	describe('resetMemTables()', () => {
		it('should use the correct SQL', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await AccountEntity.resetMemTables();

			expect(adapter.executeFile.firstCall.args[0]).to.eql(SQLs.resetMemTables);
		});

		it('should process without any error', async () => {
			await AccountEntity.resetMemTables();
		});

		it('should empty the table "mem_accounts"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_accounts'
			);
			expect(result[0].count).to.equal(0);
		});

		it('should empty the table "mem_round"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_round'
			);
			expect(result[0].count).to.equal(0);
		});

		it('should empty the table "mem_accounts2delegates"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_accounts2delegates'
			);
			expect(result[0].count).to.equal(0);
		});

		it('should empty the table "mem_accounts2u_delegates"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_accounts2u_delegates'
			);
			expect(result[0].count).to.equal(0);
		});

		it('should empty the table "mem_accounts2multisignatures"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_accounts2multisignatures'
			);
			expect(result[0].count).to.equal(0);
		});

		it('should empty the table "mem_accounts2u_multisignatures"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_accounts2u_multisignatures'
			);
			expect(result[0].count).to.equal(0);
		});

		it('should empty the table "rounds_rewards"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM rounds_rewards'
			);
			expect(result[0].count).to.equal(0);
		});
	});

	describe('increaseFieldBy()', () => {
		it('should use the correct SQL', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const address = '12L';

			await AccountEntity.increaseFieldBy({ address }, 'balance', 123);

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.increaseFieldBy
			);
		});

		it('should increase account attribute', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = 15000;

			await AccountEntity.create(account);
			await AccountEntity.increaseFieldBy({ address }, 'balance', 1000);

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('16000');
		});

		it('should throw error if unknown field is provided', async () => {
			expect(() =>
				AccountEntity.increaseFieldBy({ address: '12L' }, 'unknown', 1000)
			).to.throw('Field name "unknown" is not valid.');
		});

		it('should increase balance with string data', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = '15000';

			await AccountEntity.create(account);
			await AccountEntity.increaseFieldBy({ address }, 'balance', 1000);

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('16000');
		});
	});

	describe('decreaseFieldBy()', () => {
		it('should use the correct SQL', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const address = '12L';

			await AccountEntity.decreaseFieldBy({ address }, 'balance', 123);

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.decreaseFieldBy
			);
		});

		it('should decrease account balance by 1000', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = 15000;

			await AccountEntity.create(account);
			await AccountEntity.decreaseFieldBy({ address }, 'balance', 1000);

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('14000');
		});

		it('should throw error if unknown field is provided', async () => {
			expect(() =>
				AccountEntity.decreaseFieldBy({ address: '12L' }, 'unknown', 1000)
			).to.throw('Field name "unknown" is not valid.');
		});

		it('should decrease account balance by "1000" as string', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = '15000';

			await AccountEntity.create(account);
			await AccountEntity.decreaseFieldBy({ address }, 'balance', '1000');

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('14000');
		});
	});

	describe('createDependentRecord()', () => {
		it('should throw error if wrong dependency is passed', async () => {
			expect(() =>
				AccountEntity.createDependentRecord('unknown', '12L', '12345')
			).to.throw('Invalid dependency name "unknown" provided.');
		});

		[
			'votedDelegatesPublicKeys',
			'u_votedDelegatesPublicKeys',
			'membersPublicKeys',
			'u_membersPublicKeys',
		].forEach(dependentTable => {
			describe(`${dependentTable}`, () => {
				it(`should use executeFile with correct parameters for ${dependentTable}`, async () => {
					const accounts = await AccountEntity.get({}, { limit: 2 });

					sinonSandbox.spy(adapter, 'executeFile');
					await AccountEntity.createDependentRecord(
						dependentTable,
						accounts[0].address,
						accounts[1].publicKey
					);

					return expect(adapter.executeFile).to.be.calledWith(
						SQLs.createDependentRecord,
						{
							tableName: dependentFieldsTableMap[dependentTable],
							accountId: accounts[0].address,
							dependentId: accounts[1].publicKey,
						},
						{ expectedResultCount: 0 }
					);
				});

				it(`should insert dependent account from ${dependentTable}`, async () => {
					const accounts = await AccountEntity.get({}, { limit: 2 });

					const before = await adapter.execute(
						`SELECT count(*) from ${dependentFieldsTableMap[dependentTable]}`
					);

					await AccountEntity.createDependentRecord(
						dependentTable,
						accounts[0].address,
						accounts[1].publicKey
					);
					const after = await adapter.execute(
						`SELECT count(*) from ${dependentFieldsTableMap[dependentTable]}`
					);

					expect(before[0].count).to.eql('0');
					expect(after[0].count).to.eql('1');
				});
			});
		});
	});

	describe('deleteDependentRecord()', () => {
		it('should throw error if wrong dependency is passed', async () => {
			expect(() =>
				AccountEntity.deleteDependentRecord('unknown', '12L', '12345')
			).to.throw('Invalid dependency name "unknown" provided.');
		});

		[
			'votedDelegatesPublicKeys',
			'u_votedDelegatesPublicKeys',
			'membersPublicKeys',
			'u_membersPublicKeys',
		].forEach(dependentTable => {
			it(`should remove dependent account from ${dependentTable}`, async () => {
				const accounts = await AccountEntity.get({}, { limit: 2 });

				await adapter.execute(
					`INSERT INTO ${
						dependentFieldsTableMap[dependentTable]
					} ("accountId", "dependentId") VALUES('${accounts[0].address}', '${
						accounts[1].publicKey
					}')`
				);

				const before = await adapter.execute(
					`SELECT count(*) from ${dependentFieldsTableMap[dependentTable]}`
				);

				await AccountEntity.deleteDependentRecord(
					dependentTable,
					accounts[0].address,
					accounts[1].publicKey
				);
				const after = await adapter.execute(
					`SELECT count(*) from ${dependentFieldsTableMap[dependentTable]}`
				);

				expect(before[0].count).to.eql('1');
				expect(after[0].count).to.eql('0');
			});
		});
	});

	describe('syncDelegatesRanks', () => {
		it('should use the correct SQL', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			// Act
			await AccountEntity.syncDelegatesRanks();
			// Assert
			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(
				SQLs.syncDelegatesRank
			);
		});

		it(
			'should sync rank attribute of all delegates based on their vote value and public key'
		);

		it('should not throw error if there is no delegate available');
	});

	describe('countDuplicatedDelegates()', () => {
		it('should use the correct SQL no with parameter', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await AccountEntity.countDuplicatedDelegates();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.countDuplicatedDelegates,
				{},
				{ expectedResultCount: 1 }
			);
		});

		it('should return zero if no delegate records available', async () => {
			const block = seeder.getLastBlock();

			const trs1 = new transactionsFixtures.Transaction({
				blockId: block.id,
				type: 2,
			});
			const trs2 = new transactionsFixtures.Transaction({
				blockId: block.id,
				type: 2,
			});
			await TransactionEntity.create([trs1, trs2]);

			const delegates = await adapter.execute('SELECT * from delegates');

			// As we created two delegate transactions
			expect(delegates).to.have.lengthOf(2);

			const result = await AccountEntity.countDuplicatedDelegates();

			expect(result).to.be.eql(0);
		});

		it('should return zero if there are delegates but no duplicates', async () => {
			const result = await AccountEntity.countDuplicatedDelegates();

			expect(result).to.be.eql(0);
		});

		it('should return integer value of duplicate delegates', async () => {
			const block = seeder.getLastBlock();

			const trs1 = new transactionsFixtures.Transaction({
				blockId: block.id,
				type: 2,
			});
			const trs2 = new transactionsFixtures.Transaction({
				blockId: block.id,
				type: 2,
			});
			await TransactionEntity.create([trs1, trs2]);

			const delegates = await adapter.execute('SELECT * from delegates');

			// As we created two delegate transactions
			expect(delegates).to.have.lengthOf(2);

			// Create duplicate records for each delegate
			await Promise.all(
				delegates.map(delegate => {
					const username = randomstring.generate({
						length: 10,
						charset: 'alphabetic',
					});
					return adapter.execute(
						'INSERT INTO delegates ("transactionId", "username") VALUES ($1, $2)',
						[delegate.transactionId, username]
					);
				})
			);

			const result = await AccountEntity.countDuplicatedDelegates();

			expect(result).to.be.eql(2);
		});
	});

	describe('insertFork()', () => {
		it('should use the correct SQL with given params', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const fork = new forksFixtures.Fork();
			await AccountEntity.insertFork(fork);

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.insertFork,
				fork,
				{ expectedResultCount: 0 },
				sinonSandbox.match.any
			);
		});

		it('should insert valid fork entry successfully', async () => {
			const fork = new forksFixtures.Fork();
			await AccountEntity.insertFork(fork);

			const result = await adapter.execute('SELECT * from forks_stat');

			expect(result).to.be.not.empty;
			expect(result).to.have.lengthOf(1);
			expect(result[0]).to.have.all.keys(
				'delegatePublicKey',
				'blockTimestamp',
				'blockId',
				'blockHeight',
				'previousBlock',
				'cause'
			);
			expect(
				Buffer.from(result[0].delegatePublicKey, 'hex').toString()
			).to.be.eql(fork.delegatePublicKey);
			expect(result[0].blockId).to.be.eql(fork.blockId);
			expect(result[0].blockHeight).to.be.eql(fork.blockHeight);
			expect(result[0].previousBlock).to.be.eql(fork.previousBlockId);
			expect(result[0].blockTimestamp).to.be.eql(fork.blockTimestamp);
			return expect(result[0].cause).to.be.eql(fork.cause);
		});

		const fork = new forksFixtures.Fork();
		Object.keys(fork).forEach(attr => {
			const params = Object.assign({}, fork);
			delete params[attr];

			it(`should be rejected with error if param "${attr}" is missing`, async () =>
				expect(AccountEntity.insertFork(params)).to.be.eventually.rejectedWith(
					`Property '${attr}' doesn't exist.`
				));
		});
	});
});
