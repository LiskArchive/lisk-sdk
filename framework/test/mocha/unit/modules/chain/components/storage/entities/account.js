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
	Account,
} = require('../../../../../../../../src/modules/chain/components/storage/entities');
const storageSandbox = require('../../../../../../common/storage_sandbox');
const seeder = require('../../../../../../common/storage_seed');
const accountFixtures = require('../../../../../../fixtures').accounts;
const forksFixtures = require('../../../../../../fixtures').forks;

const defaultCreateValues = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: 0,
	username: null,
	isDelegate: false,
	balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	nameExist: false,
	multiMin: 0,
	multiLifetime: 0,
};

const dependentFieldsTableMap = {
	membersPublicKeys: 'mem_accounts2multisignatures',
	votedDelegatesPublicKeys: 'mem_accounts2delegates',
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
			'lisk_test_storage_custom_account_chain_module'
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
			'increaseFieldBy',
			'decreaseFieldBy',
			'createDependentRecord',
			'deleteDependentRecord',
			'delegateBlocksRewards',
			'syncDelegatesRank',
			'insertFork',
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
					validOptions
				);
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

		// @todo review this file and move these tests to integration.
		it('should create an account object successfully', async () => {
			const account = new accountFixtures.Account();

			await expect(
				AccountEntity.create(account)
			).to.eventually.be.fulfilled.and.deep.equal([]);

			const accountResult = await AccountEntity.getOne(
				{
					address: account.address,
				},
				{
					extended: true,
				}
			);
			const mergedObject = Object.assign({}, defaultCreateValues, account);

			expect(mergedObject).to.be.eql(accountResult);
		});

		it('should create an account object with asset field successfully', async () => {
			const account = new accountFixtures.Account();
			account.asset = { lisk: 'test-asset' };

			await expect(
				AccountEntity.create(account)
			).to.eventually.be.fulfilled.and.deep.equal([]);

			const accountResult = await AccountEntity.getOne(
				{
					address: account.address,
				},
				{
					extended: true,
				}
			);
			const mergedObject = Object.assign({}, defaultCreateValues, account);

			expect(mergedObject).to.be.eql(accountResult);
			expect(accountResult.asset).to.be.eql(account.asset);
		});

		it('should create multiple account objects successfully', async () => {
			const accounts = [
				new accountFixtures.Account(),
				new accountFixtures.Account(),
			];

			await expect(
				AccountEntity.create(accounts)
			).to.eventually.be.fulfilled.and.deep.equal([]);

			return Promise.all(
				accounts.map(async account => {
					const accountResult = await AccountEntity.getOne(
						{
							address: account.address,
						},
						{
							extended: true,
						}
					);
					const mergedObject = Object.assign({}, defaultCreateValues, account);

					return expect(mergedObject).to.be.eql(accountResult);
				})
			);
		});

		it('should reject with invalid data provided', async () => {
			return expect(
				AccountEntity.create(
					{
						missedBlocks: 'FOO-BAR',
						address: '1234L',
					},
					validOptions
				)
			).to.eventually.be.rejectedWith(
				'invalid input syntax for integer: "FOO-BAR"'
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
				}
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
				productivity: 0,
				votedDelegatesPublicKeys: null,
				membersPublicKeys: null,
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
				AccountEntity.update(invalidFilter, {})
			).to.eventually.be.rejectedWith(NonSupportedFilterTypeError);
		});

		it('should throw error for in-valid filters', async () => {
			const account = new accountFixtures.Account();

			return expect(
				AccountEntity.update({ myAddress: '123' }, account)
			).to.eventually.be.rejectedWith(
				NonSupportedFilterTypeError,
				'One or more filters are not supported.'
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
					account
				)
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
				account
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
				}
			);
			await AccountEntity.update(
				{
					isDelegate: false,
				},
				{
					balance: '5678',
				}
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
				account
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
				}
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
					{}
				)
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
					}
				)
			).to.eventually.be.rejectedWith('syntax error at or near "WHERE"');
		});

		it('should not throw error if no matching record found', async () => {
			// Arrange
			const filter = {
				rank: -100,
			};
			// Act & Assert
			expect(() => {
				AccountEntity.update(filter, {
					balance: 20,
				});
			}).not.to.throw();
		});

		it('should not create mem_accounts2delegates records if property membersPublicKeys is null', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			const address = account.address;
			await AccountEntity.create(account);
			// Act
			await AccountEntity.update({ address }, { balance: 100 });
			// Assert
			const relelatedRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2multisignatures WHERE "accountId"='${address}'`
			);
			expect(relelatedRecords).to.be.eql([]);
		});

		it('should not create mem_accounts2delegates records if property votedDelegatesPublicKeys is null', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			const address = account.address;
			await AccountEntity.create(account);
			// Act
			await AccountEntity.update({ address }, { balance: 100 });
			// Assert
			const relelatedRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2delegates WHERE "accountId"='${address}'`
			);
			expect(relelatedRecords).to.be.eql([]);
		});
	});

	describe('upsert', () => {
		it('should throw error if no filter specified', async () => {
			const account = new accountFixtures.Account();
			return expect(
				AccountEntity.upsert({}, account)
			).to.eventually.be.rejectedWith(
				NonSupportedFilterTypeError,
				'One or more filters are required for this operation.'
			);
		});

		it('should succeed updating or insert object', async () => {
			const account = new accountFixtures.Account();
			return expect(
				AccountEntity.upsert(
					{
						address: account.address,
					},
					account
				)
			).to.eventually.be.fulfilled.and.deep.equal([]);
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
				account
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
				account
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
			accounts[0].rank = 1000;
			accounts[1].rank = 1000;

			const filter = {
				rank: 1000,
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
					}
				)
			).to.eventually.be.rejectedWith(
				'value too long for type character varying(20)'
			);
		});

		it('should not throw error if no matching record found', async () => {
			// Arrange
			const filter = {
				rank: -100,
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
				'SELECT * FROM mem_accounts LIMIT 1'
			);

			await AccountEntity.delete({
				address: account[0].address,
			});

			const result = await adapter.execute(
				'SELECT * FROM mem_accounts WHERE "address" = ${address}',
				{
					address: account[0].address,
				}
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

		it('should throw error if invalid public key is passed', async () => {
			return expect(
				AccountEntity.delegateBlocksRewards({
					generatorPublicKey: 'xxxxxxxxx',
					start: (+new Date() / 1000).toFixed(),
					end: (+new Date() / 1000).toFixed(),
				})
			).to.eventually.be.rejectedWith('invalid hexadecimal digit: "x"');
		});

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

		it('should empty the table "mem_accounts2multisignatures"', async () => {
			await AccountEntity.resetMemTables();
			const result = await adapter.execute(
				'SELECT COUNT(*)::int AS count FROM mem_accounts2multisignatures'
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

			await AccountEntity.increaseFieldBy(
				{
					address,
				},
				'balance',
				123
			);

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.increaseFieldBy
			);
		});

		it('should increase account attribute', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = 15000;

			await AccountEntity.create(account);
			await AccountEntity.increaseFieldBy(
				{
					address,
				},
				'balance',
				1000
			);

			const updatedAccount = await AccountEntity.getOne({
				address,
			});

			expect(updatedAccount.balance).to.eql('16000');
		});

		it('should throw error if unknown field is provided', async () => {
			expect(() =>
				AccountEntity.increaseFieldBy(
					{
						address: '12L',
					},
					'unknown',
					1000
				)
			).to.throw('Field name "unknown" is not valid.');
		});

		it('should increase balance with string data', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = '15000';

			await AccountEntity.create(account);
			await AccountEntity.increaseFieldBy(
				{
					address,
				},
				'balance',
				1000
			);

			const updatedAccount = await AccountEntity.getOne({
				address,
			});

			expect(updatedAccount.balance).to.eql('16000');
		});
	});

	describe('decreaseFieldBy()', () => {
		it('should use the correct SQL', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const address = '12L';

			await AccountEntity.decreaseFieldBy(
				{
					address,
				},
				'balance',
				123
			);

			return expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.decreaseFieldBy
			);
		});

		it('should decrease account balance by 1000', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = 15000;

			await AccountEntity.create(account);
			await AccountEntity.decreaseFieldBy(
				{
					address,
				},
				'balance',
				1000
			);

			const updatedAccount = await AccountEntity.getOne({
				address,
			});

			expect(updatedAccount.balance).to.eql('14000');
		});

		it('should throw error if unknown field is provided', async () => {
			expect(() =>
				AccountEntity.decreaseFieldBy(
					{
						address: '12L',
					},
					'unknown',
					1000
				)
			).to.throw('Field name "unknown" is not valid.');
		});

		it('should decrease account balance by "1000" as string', async () => {
			const account = new accountFixtures.Account();
			const address = account.address;

			account.balance = '15000';

			await AccountEntity.create(account);
			await AccountEntity.decreaseFieldBy(
				{
					address,
				},
				'balance',
				'1000'
			);

			const updatedAccount = await AccountEntity.getOne({
				address,
			});

			expect(updatedAccount.balance).to.eql('14000');
		});
	});

	describe('createDependentRecord()', () => {
		it('should throw error if wrong dependency is passed', async () => {
			expect(() =>
				AccountEntity.createDependentRecord('unknown', '12L', '12345')
			).to.throw('Invalid dependency name "unknown" provided.');
		});

		['votedDelegatesPublicKeys', 'membersPublicKeys'].forEach(
			dependentTable => {
				describe(`${dependentTable}`, () => {
					it(`should use executeFile with correct parameters for ${dependentTable}`, async () => {
						const accounts = await AccountEntity.get(
							{},
							{
								limit: 2,
							}
						);

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
							{
								expectedResultCount: 0,
							}
						);
					});

					it(`should insert dependent account from ${dependentTable}`, async () => {
						const accounts = await AccountEntity.get(
							{},
							{
								limit: 2,
							}
						);

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
			}
		);
	});

	describe('deleteDependentRecord()', () => {
		it('should throw error if wrong dependency is passed', async () => {
			expect(() =>
				AccountEntity.deleteDependentRecord('unknown', '12L', '12345')
			).to.throw('Invalid dependency name "unknown" provided.');
		});

		['votedDelegatesPublicKeys', 'membersPublicKeys'].forEach(
			dependentTable => {
				it(`should remove dependent account from ${dependentTable}`, async () => {
					const accounts = await AccountEntity.get(
						{},
						{
							limit: 2,
						}
					);

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
			}
		);
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

	describe('insertFork()', () => {
		it('should use the correct SQL with given params', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const fork = new forksFixtures.Fork();
			await AccountEntity.insertFork(fork);

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.insertFork,
				fork,
				{
					expectedResultCount: 0,
				},
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

			it(`should be rejected with error if param "${attr}" is missing`, async () => {
				return expect(
					AccountEntity.insertFork(params)
				).to.be.eventually.rejectedWith(`Property '${attr}' doesn't exist.`);
			});
		});
	});

	describe('updateDependentRecords', () => {
		it('should update mem_accounts2multisignatures if membersPublicKeys present', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const savedAccount = await AccountEntity.getOne({
				address: account.address,
			});
			savedAccount.membersPublicKeys = ['1234L', '9876L'];
			const expectedRelatedRecords = [
				{ accountId: account.address, dependentId: '1234L' },
				{ accountId: account.address, dependentId: '9876L' },
			];
			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			// Assert
			const mulitsigDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2multisignatures WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(expectedRelatedRecords).to.be.eql(mulitsigDependentRecords);
		});

		it('should update mem_accounts2multisignatures with new keys if membersPublicKeys present', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const savedAccount = await AccountEntity.getOne({
				address: account.address,
			});
			savedAccount.membersPublicKeys = ['1234L', '9876L'];
			const expectedRelatedRecords = [
				{ accountId: account.address, dependentId: '1234L' },
				{ accountId: account.address, dependentId: '9876L' },
			];
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			const mulitsigDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2multisignatures WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(expectedRelatedRecords).to.be.eql(mulitsigDependentRecords);

			savedAccount.membersPublicKeys = ['999L', '888L'];
			const newExpectedRelatedRecords = [
				{ accountId: account.address, dependentId: '999L' },
				{ accountId: account.address, dependentId: '888L' },
			];

			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			const newMulitsigDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2multisignatures WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			// Assert
			expect(newExpectedRelatedRecords).to.be.eql(newMulitsigDependentRecords);
		});

		it('should update mem_accounts2delegates if votedDelegatesPublicKeys present', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const savedAccount = await AccountEntity.getOne({
				address: account.address,
			});
			savedAccount.votedDelegatesPublicKeys = ['1234L', '9876L'];
			const expectedRelatedRecords = [
				{ accountId: account.address, dependentId: '1234L' },
				{ accountId: account.address, dependentId: '9876L' },
			];
			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			// Assert
			const votedDelegatesPublicKeysDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2delegates WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(expectedRelatedRecords).to.be.eql(
				votedDelegatesPublicKeysDependentRecords
			);
		});

		it('should update mem_accounts2delegates with new votes if votedDelegatesPublicKeys present', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const savedAccount = await AccountEntity.getOne({
				address: account.address,
			});
			savedAccount.votedDelegatesPublicKeys = ['1234L', '9876L'];
			const expectedRelatedRecords = [
				{ accountId: account.address, dependentId: '1234L' },
				{ accountId: account.address, dependentId: '9876L' },
			];
			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			// Assert
			const votedDelegatesPublicKeysDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2delegates WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(expectedRelatedRecords).to.be.eql(
				votedDelegatesPublicKeysDependentRecords
			);

			savedAccount.votedDelegatesPublicKeys = ['42L', '43L', '63L'];
			const newExpectedRelatedRecords = [
				{ accountId: account.address, dependentId: '42L' },
				{ accountId: account.address, dependentId: '43L' },
				{ accountId: account.address, dependentId: '63L' },
			];
			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			// Assert
			const newVotedDelegatesPublicKeysDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2delegates WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(newExpectedRelatedRecords).to.be.eql(
				newVotedDelegatesPublicKeysDependentRecords
			);
		});

		it('should handle empty dependent data correctly for votedDelegatesPublicKeys', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const savedAccount = await AccountEntity.getOne({
				address: account.address,
			});
			savedAccount.votedDelegatesPublicKeys = [];
			// Act & Assert
			expect(() =>
				AccountEntity.update({ address: savedAccount.address }, savedAccount)
			).not.to.throw();
		});

		it('should clear votes when votedDelegatesPublicKeys is an empty array', async () => {
			// Arrange
			const account = new accountFixtures.Account();
			await AccountEntity.create(account);
			const savedAccount = await AccountEntity.getOne({
				address: account.address,
			});
			savedAccount.votedDelegatesPublicKeys = ['1234L', '9876L'];
			const expectedRelatedRecords = [
				{ accountId: account.address, dependentId: '1234L' },
				{ accountId: account.address, dependentId: '9876L' },
			];
			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			// Assert
			const votedDelegatesPublicKeysDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2delegates WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(expectedRelatedRecords).to.be.eql(
				votedDelegatesPublicKeysDependentRecords
			);

			savedAccount.votedDelegatesPublicKeys = [];
			const newExpectedRelatedRecords = [];
			// Act
			await AccountEntity.update(
				{ address: savedAccount.address },
				savedAccount
			);
			// Assert
			const newVotedDelegatesPublicKeysDependentRecords = await AccountEntity.adapter.execute(
				`SELECT * FROM mem_accounts2delegates WHERE "accountId"='${
					savedAccount.address
				}'`
			);
			expect(newExpectedRelatedRecords).to.be.eql(
				newVotedDelegatesPublicKeysDependentRecords
			);
		});
	});
});
