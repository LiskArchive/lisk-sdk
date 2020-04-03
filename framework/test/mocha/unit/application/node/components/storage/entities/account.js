/* eslint-disable mocha/no-pending-tests */
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

'use strict';

const {
	entities: { BaseEntity },
	errors: { NonSupportedFilterTypeError },
} = require('../../../../../../../../src/components/storage');
const {
	AccountEntity: Account,
} = require('../../../../../../../../src/application/storage/entities');
const storageSandbox = require('../../../../../../../utils/storage/storage_sandbox');
const seeder = require('../../../../../../../utils/storage/storage_seed');
const accountFixtures = require('../../../../../../../fixtures').accounts;

const defaultCreateValues = {
	publicKey: null,
	username: null,
	isDelegate: false,
	balance: '0',
	nonce: '0',
	votes: null,
	unlocking: null,
	totalVotesReceived: '0',
	delegate: {
		lastForgedHeight: 0,
		consecutiveMissedBlocks: 0,
		isBanned: false,
		pomHeights: [],
	},
	missedBlocks: 0,
	producedBlocks: 0,
	fees: '0',
	rewards: '0',
	keys: { mandatoryKeys: [], optionalKeys: [], numberOfSignatures: 0 },
};

describe('ChainAccount', () => {
	let adapter;
	let storage;
	let AccountEntity;
	let SQLs;
	let validAccountSQLs;
	let validOptions;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_custom_account_chain_module',
		);
		await storage.bootstrap();

		adapter = storage.adapter;

		AccountEntity = storage.entities.Account;
		SQLs = AccountEntity.SQLs;

		validAccountSQLs = [
			'create',
			'update',
			'updateOne',
			'delete',
			'resetMemTables',
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
		expect(Account.prototype.constructor.name).to.be.eql('ChainAccount');
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
	});

	describe('create()', () => {
		it('should throw error when address is missing', async () => {
			expect(() => {
				AccountEntity.create(
					{
						foo: 'bar',
						baz: 'qux',
					},
					validOptions,
				);
			}).to.throw("Property 'address' doesn't exist");
		});

		it('should merge default values to the provided account object', async () => {
			sinonSandbox.spy(AccountEntity, 'getValuesSet');
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);

			const mergedObject = { ...defaultCreateValues, ...account };

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

		// @todo review this file and move these tests to integration.
		it('should create an account object successfully', async () => {
			const account = new accountFixtures.Account();

			await expect(
				AccountEntity.create(account),
			).to.eventually.be.fulfilled.and.deep.equal(null);

			const accountResult = await AccountEntity.getOne({
				address: account.address,
			});
			const mergedObject = { ...defaultCreateValues, ...account };

			expect(mergedObject).to.be.eql(accountResult);
		});

		it('should create an account object with asset field successfully', async () => {
			const account = new accountFixtures.Account();
			account.asset = { lisk: 'test-asset' };

			await expect(
				AccountEntity.create(account),
			).to.eventually.be.fulfilled.and.deep.equal(null);

			const accountResult = await AccountEntity.getOne(
				{
					address: account.address,
				},
				{
					extended: true,
				},
			);
			const mergedObject = { ...defaultCreateValues, ...account };

			expect(mergedObject).to.be.eql(accountResult);
			expect(accountResult.asset).to.be.eql(account.asset);
		});

		it('should create multiple account objects successfully', async () => {
			const accounts = [
				new accountFixtures.Account(),
				new accountFixtures.Account(),
			];

			await expect(
				AccountEntity.create(accounts),
			).to.eventually.be.fulfilled.and.deep.equal(null);

			return Promise.all(
				accounts.map(async account => {
					const accountResult = await AccountEntity.getOne(
						{
							address: account.address,
						},
						{
							extended: true,
						},
					);
					const mergedObject = { ...defaultCreateValues, ...account };

					return expect(mergedObject).to.be.eql(accountResult);
				}),
			);
		});

		it('should reject with invalid data provided', async () => {
			return expect(
				AccountEntity.create(
					{
						missedBlocks: 'FOO-BAR',
						address: '1234L',
					},
					validOptions,
				),
			).to.eventually.be.rejectedWith(
				'invalid input syntax for integer: "FOO-BAR"',
			);
		});

		it('should populate account object with default values', async () => {
			const account = new accountFixtures.Account();
			await AccountEntity.create({
				address: account.address,
			});
			const accountFromDB = await AccountEntity.getOne(
				{
					address: account.address,
				},
				{
					extended: true,
				},
			);
			const expectedObject = {
				address: account.address,
				publicKey: null,
				username: null,
				isDelegate: false,
				balance: '0',
				nonce: '0',
				votes: null,
				unlocking: null,
				totalVotesReceived: '0',
				delegate: {
					lastForgedHeight: 0,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [],
				},
				keys: { mandatoryKeys: [], optionalKeys: [], numberOfSignatures: 0 },
				missedBlocks: 0,
				producedBlocks: 0,
				fees: '0',
				rewards: '0',
				productivity: 0,
				asset: {},
			};
			expect(accountFromDB).to.be.eql(expectedObject);
		});
	});

	describe('update()', () => {
		let localAdapter;
		const updateSqlFile = 'update Sql File';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					update: updateSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves(),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		it('should accept only valid filters', async () => {
			// Arrange
			const invalidFilter = {
				foo: 'bar',
			};
			// Act & Assert
			return expect(
				AccountEntity.update(invalidFilter, {}),
			).to.eventually.be.rejectedWith(NonSupportedFilterTypeError);
		});

		it('should throw error for in-valid filters', async () => {
			const account = new accountFixtures.Account();

			return expect(
				AccountEntity.update({ myAddress: '123' }, account),
			).to.eventually.be.rejectedWith(
				NonSupportedFilterTypeError,
				'One or more filters are not supported.',
			);
		});

		it('should update account without any error', async () => {
			const account = new accountFixtures.Account();

			await AccountEntity.create(account);

			return expect(
				AccountEntity.update(
					{
						address: account.address,
					},
					account,
				),
			).to.eventually.be.fulfilled.and.deep.equal([]);
		});

		it('should call mergeFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub();
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.update(validFilter, {
				username: 'not_a_rand_name',
			});
			// Assert
			expect(account.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			// Arrange
			const randAccount = new accountFixtures.Account();
			localAdapter.executeFile = sinonSandbox.stub().resolves([randAccount]);

			const validFilter = {
				address: randAccount.address,
			};
			const account = new Account(localAdapter);
			account.mergeFilters = sinonSandbox.stub().returns(validFilter);
			account.parseFilters = sinonSandbox.stub();
			// Act
			account.update(validFilter, {
				username: 'not_a_rand_name',
			});
			// Assert
			expect(account.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call getUpdateSet with proper params', async () => {
			// Arrange
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
			await AccountEntity.update(
				{
					address: account.address,
				},
				account,
			);
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

			await AccountEntity.update(
				{
					isDelegate: true,
				},
				{
					balance: '1234',
				},
			);
			await AccountEntity.update(
				{
					isDelegate: false,
				},
				{
					balance: '5678',
				},
			);

			const result1 = await AccountEntity.getOne({
				address: delegate.address,
			});
			const result2 = await AccountEntity.getOne({
				address: account.address,
			});
			// Assert
			expect(result1.balance).to.be.eql('1234');
			expect(result2.balance).to.be.eql('5678');
		});
		it('should not pass the readonly fields to update set', async () => {
			// Arrange
			sinonSandbox.spy(AccountEntity, 'getUpdateSet');
			const account = new accountFixtures.Account();
			// Act
			await AccountEntity.update(
				{
					address: account.address,
				},
				account,
			);
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
				{
					address,
				},
				{
					balance: '1234',
					address: '1234L',
				},
			);
			// Act
			const result = await AccountEntity.getOne({
				address,
			});
			// Assert
			expect(result.balance).to.be.eql('1234');
			expect(result.address).to.not.eql('1234L');
			expect(result.address).to.be.eql(address);
		});

		it('should resolve promise without any error if no data is passed', async () => {
			return expect(
				AccountEntity.update(
					{
						address: '123L',
					},
					{},
				),
			).to.eventually.be.fulfilled.and.equal(false);
		});

		it('should be rejected if any invalid attribute is provided', async () => {
			return expect(
				AccountEntity.update(
					{
						address: '123L',
					},
					{
						invalid: true,
					},
				),
			).to.eventually.be.rejectedWith('syntax error at or near "WHERE"');
		});

		it('should not throw error if no matching record found', async () => {
			// Arrange
			const filter = {
				producedBlocks: -100,
			};
			// Act & Assert
			expect(() => {
				AccountEntity.update(filter, {
					balance: 20,
				});
			}).not.to.throw();
		});

		it('should not create keys records if property keys is null', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			const address = account.address;
			await AccountEntity.create(account);
			// Act
			await AccountEntity.update({ address }, { balance: 100 });
			// Assert
			const updatedAccount = await AccountEntity.getOne({
				address,
			});
			expect(updatedAccount.keys).to.be.eql(null);
		});
	});

	describe('upsert', () => {
		it('should throw error if no filter specified', async () => {
			const account = new accountFixtures.Account();
			return expect(
				AccountEntity.upsert({}, account),
			).to.eventually.be.rejectedWith(
				NonSupportedFilterTypeError,
				'One or more filters are required for this operation.',
			);
		});

		it('should succeed updating or insert object', async () => {
			const account = new accountFixtures.Account();
			return expect(
				AccountEntity.upsert(
					{
						address: account.address,
					},
					account,
				),
			).to.eventually.be.fulfilled.and.deep.equal(null);
		});

		it('should insert account if matching filters not found', async () => {
			const account = new accountFixtures.Account();
			const filters = {
				address: account.address,
			};

			await AccountEntity.upsert(filters, account);
			const result = await AccountEntity.getOne(filters);

			expect(result).to.be.not.null;
		});

		it('should update account if matching filters found', async () => {
			const account1 = new accountFixtures.Account();
			const filters = {
				address: account1.address,
			};

			// Since DB trigger protects from updating username only if it was null before
			delete account1.username;

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

			await AccountEntity.upsert(
				{
					address: account.address,
				},
				account,
			);

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
		let localAdapter;
		const updateOneSqlFile = 'updateOne Sql File';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					updateOne: updateOneSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves(),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		it('should throw error for in-valid filters', async () => {
			// Arrange
			const invalidFilter = {
				foo: 'bar',
			};
			// Act & Assert
			expect(() => {
				AccountEntity.updateOne(invalidFilter, {
					username: 'test1234',
				});
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			// Arrange
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
			localAdapter.executeFile = sinonSandbox.stub().resolves([randAccount]);
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
			await AccountEntity.updateOne(
				{
					address: account.address,
				},
				account,
			);
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
			accounts[0].producedBlocks = 1000;
			accounts[1].producedBlocks = 1000;

			const filter = {
				producedBlocks: 1000,
			};

			await AccountEntity.create(accounts);
			// Act
			await AccountEntity.updateOne(filter, {
				balance: 20,
			});
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
			return expect(
				AccountEntity.updateOne(
					{
						address: randomAccount.address,
					},
					{
						username: 'AN_INVALID_LONG_USERNAME',
					},
				),
			).to.eventually.be.rejectedWith(
				'value too long for type character varying(20)',
			);
		});

		it('should not throw error if no matching record found', async () => {
			// Arrange
			const filter = {
				producedBlocks: -100,
			};
			// Act & Assert
			expect(() => {
				AccountEntity.updateOne(filter, {
					balance: 20,
				});
			}).not.to.throw();
		});
	});

	describe('delete()', () => {
		it('should remove an existing account', async () => {
			const account = await adapter.execute(
				'SELECT * FROM mem_accounts LIMIT 1',
			);

			await AccountEntity.delete({
				address: account[0].address,
			});

			const result = await adapter.execute(
				'SELECT * FROM mem_accounts WHERE "address" = ${address}',
				{
					address: account[0].address,
				},
			);

			expect(result).to.be.empty;
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
			'should merge provided filter with default filters by preserving default filters values ',
		);
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
				'SELECT COUNT(*)::int AS count FROM mem_accounts',
			);
			expect(result[0].count).to.equal(0);
		});
	});
});
