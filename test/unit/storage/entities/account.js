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
const { BaseEntity, Account } = require('../../../../storage/entities');
const { NonSupportedFilterTypeError } = require('../../../../storage/errors');
const storageSandbox = require('../../../common/storage_sandbox');
const seeder = require('../../../common/storage_seed');
const accountFixtures = require('../../../fixtures').accounts;

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
	let SQLs;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_storage_accounts'
		);
		await storage.bootstrap();

		adapter = storage.adapter;

		AccountEntity = storage.entities.Account;
		SQLs = AccountEntity.SQLs;
	});

	beforeEach(() => {
		return seeder.seed(storage);
	});

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
		it('should accept only one parameter');
		it('should call super');
		it('should assign proper parameters');
		it('should setup specific filters');
	});

	describe('getOne()', () => {
		it('should accept only valid filters');
		it('should throw error for in-valid filters');
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call adapter.executeFile with proper param for extended=false');
		it('should call adapter.executeFile with proper param for extended=true');
		it('should accept "tx" as last parameter and pass to adapter.executeFile');
		it(
			'should resolve with one object matching specification of type definition of simple object'
		);
		it(
			'should resolve with one object matching specification of type definition of full object'
		);
		it(
			'should reject with error if matched with multiple records for provided filters'
		);
		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters');
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('get()', () => {
		it('should return data without any error', async () => {
			expect(AccountEntity.get()).to.be.fulfilled;
		});

		it('should accept only valid filters');
		it('should throw error for in-valid filters');
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call adapter.executeFile with proper param for extended=false');
		it('should call adapter.executeFile with proper param for extended=true');
		it('should accept "tx" as last parameter and pass to adapter.executeFile');
		it(
			'should resolve with one object matching specification of type definition of simple object'
		);
		it(
			'should resolve with one object matching specification of type definition of full object'
		);
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
			it('should have only specific filters');
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

				it('should fail if unknown sort field is specified', async () => {
					return expect(
						AccountEntity.get({}, { sort: 'unknownField', limit: 10 })
					).to.be.rejectedWith('column "unknownField" does not exist');
				});
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

	describe('create()', () => {
		it('should accept only valid options');
		it('should throw error for in-valid options');

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

			expect(AccountEntity.create(account)).to.be.fulfilled;

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
		it('should skip if any invalid attribute is provided');
		it('should reject with invalid data provided');
		it('should populate account object with default values');
	});

	describe('update()', () => {
		it('should accept only valid filters');
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
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call getUpdateSet with proper params');
		it('should call adapter.executeFile with proper params', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const account = new accountFixtures.Account();

			await AccountEntity.update({ address: account.address }, account);

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.update);
		});
		it('should update all accounts successfully with matching condition', async () => {
			const account = new accountFixtures.Account();
			const delegate = new accountFixtures.Delegate();

			await AccountEntity.create(account);
			await AccountEntity.create(delegate);

			await AccountEntity.update({ isDelegate: true }, { balance: '1234' });
			await AccountEntity.update({ isDelegate: false }, { balance: '5678' });

			const result1 = await AccountEntity.getOne({ address: delegate.address });
			const result2 = await AccountEntity.getOne({ address: account.address });

			expect(result1.balance).to.be.eql('1234');
			expect(result2.balance).to.be.eql('5678');
		});
		it('should not pass the readonly fields to update set', async () => {
			sinonSandbox.spy(AccountEntity, 'getUpdateSet');
			const account = new accountFixtures.Account();

			await AccountEntity.update({ address: account.address }, account);

			expect(AccountEntity.getUpdateSet).to.be.calledOnce;
			expect(AccountEntity.getUpdateSet.firstCall.args[0]).to.not.have.keys([
				'address',
			]);
		});

		it('should skip the readonly fields to update', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			await AccountEntity.create(account);
			await AccountEntity.update(
				{ address },
				{ balance: '1234', address: '1234L' }
			);
			const result = await AccountEntity.getOne({ address });

			expect(result.balance).to.be.eql('1234');
			expect(result.address).to.not.eql('1234L');
			expect(result.address).to.be.eql(address);
		});
		it('should resolve promise without any error if no data is passed', async () => {
			expect(AccountEntity.update({ address: '123L' }, {})).to.be.fulfilled;
		});
		it('should skip if any invalid attribute is provided');
		it('should not throw error if no matching record found');
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
		it('should accept only valid filters');
		it('should throw error for in-valid filters');
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call getUpdateSet with proper params');
		it('should call adapter.executeFile with proper params');
		it(
			'should update only one account object successfully with matching condition'
		);
		it('should skip if any invalid attribute is provided');
		it('should not throw error if no matching record found');
	});

	describe('isPersisted()', () => {
		it('should accept only valid filters');
		it('should throw error for in-valid filters');
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call adapter.executeFile with proper params');
		it('should resolve with true if matching record found');
		it('should resolve with false if matching record not found');
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

	describe('mergeFilters()', () => {
		it('should accept filters as single object');
		it('should accept filters as array of objects');
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

	describe('incrementField()', () => {
		it('should use the correct SQL', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const address = '12L';

			await AccountEntity.incrementField({ address }, 'balance', 123);

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.incrementField
			);
		});

		it('should increment account attribute', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = 15000;

			await AccountEntity.create(account);
			await AccountEntity.incrementField({ address }, 'balance', 1000);

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('16000');
		});

		it('should throw error if unknown field is provided', async () => {
			expect(() =>
				AccountEntity.incrementField({ address: '12L' }, 'unknown', 1000)
			).to.throw('Field name "unknown" is not valid.');
		});

		it('should increment balance with string data', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = '15000';

			await AccountEntity.create(account);
			await AccountEntity.incrementField({ address }, 'balance', 1000);

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('16000');
		});
	});

	describe('decrementField()', () => {
		it('should use the correct SQL', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const address = '12L';

			await AccountEntity.decrementField({ address }, 'balance', 123);

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.decrementField
			);
		});

		it('should decrementField account attribute', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = 15000;

			await AccountEntity.create(account);
			await AccountEntity.decrementField({ address }, 'balance', 1000);

			const updatedAccount = await AccountEntity.getOne({ address });

			expect(updatedAccount.balance).to.eql('14000');
		});

		it('should throw error if unknown field is provided', async () => {
			expect(() =>
				AccountEntity.decrementField({ address: '12L' }, 'unknown', 1000)
			).to.throw('Field name "unknown" is not valid.');
		});

		it('should decrementField balance with string data', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = '15000';

			await AccountEntity.create(account);
			await AccountEntity.decrementField({ address }, 'balance', 1000);

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

	describe('syncDelegatesRank', () => {
		it('should use the correct SQL');
		it(
			'should sync rank attribute of all delegates based on their vote value and public key'
		);
		it('should not throw error if there is no delegate available');
	});
});
