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

const randomstring = require('randomstring');
const {
	entities: { BaseEntity, Account },
	errors: {
		NonSupportedFilterTypeError,
		NonSupportedOptionError,
		NonSupportedOperationError,
	},
} = require('../../../../../../src/components/storage');
const storageSandbox = require('../../../../common/storage_sandbox');
const seeder = require('../../../../common/storage_seed');
const accountFixtures = require('../../../../fixtures').accounts;

describe('Account', () => {
	let adapter;
	let storage;
	let AccountEntity;
	let SQLs;
	let validAccountSQLs;
	let validAccountFields;
	let validOptions;
	let invalidOptions;
	let validFilters;
	let validSimpleObjectFields;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_accounts',
		);
		await storage.bootstrap();

		adapter = storage.adapter;

		AccountEntity = storage.entities.Account;
		SQLs = AccountEntity.SQLs;

		validAccountSQLs = ['get', 'count', 'isPersisted'];

		validAccountFields = [
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
			'fees',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'voteWeight',
			'votedDelegatesPublicKeys',
			'membersPublicKeys',
		];

		validSimpleObjectFields = [
			'address',
			'publicKey',
			'secondPublicKey',
			'username',
			'isDelegate',
			'secondSignature',
			'balance',
			'asset',
			'multiMin',
			'multiLifetime',
			'nameExist',
			'missedBlocks',
			'producedBlocks',
			'fees',
			'rewards',
			'voteWeight',
			'productivity',
			'votedDelegatesPublicKeys',
			'membersPublicKeys',
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
			'isDelegate',
			'isDelegate_eql',
			'isDelegate_ne',
			'secondSignature',
			'secondSignature_eql',
			'secondSignature_ne',
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
			'voteWeight',
			'voteWeight_eql',
			'voteWeight_ne',
			'voteWeight_gt',
			'voteWeight_gte',
			'voteWeight_lt',
			'voteWeight_lte',
			'voteWeight_in',
			'votedDelegatesPublicKeys',
			'membersPublicKeys',
			'asset_contains',
			'asset_exists',
		];

		validOptions = {
			limit: 100,
			offset: 0,
		};

		invalidOptions = {
			foo: true,
		};
	});

	beforeEach(() => seeder.seed(storage));

	afterEach(async () => {
		sinonSandbox.restore();
		await seeder.reset(storage);
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

	describe('create()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Account.prototype.create).to.throw(NonSupportedOperationError);
		});
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Account.prototype.update).to.throw(NonSupportedOperationError);
		});
	});

	describe('updateOne()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Account.prototype.updateOne).to.throw(NonSupportedOperationError);
		});
	});

	describe('delete()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Account.prototype.delete).to.throw(NonSupportedOperationError);
		});
	});

	describe('getOne()', () => {
		it('should call _getResults with proper param for extended=false', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: false },
			);
			expect(_getResultsSpy.firstCall.args[1]).to.be.eql({ extended: false });
		});

		it('should call _getResults with proper param for extended=true', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const _getResultsSpy = sinonSandbox.spy(AccountEntity, '_getResults');
			await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: true },
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
					Object.getPrototypeOf(_getResultsSpy.firstCall.args[2]),
				).to.be.eql(Object.getPrototypeOf(tx));
			});
		});

		it('should resolve with one object matching specification of type definition of simple object', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const results = await AccountEntity.getOne(
				{ address: anAccount.address },
				{ extended: false },
			);
			expect(results).to.have.all.keys(validSimpleObjectFields);
		});

		it('should reject with error if matched with multiple records for provided filters', async () => {
			return expect(AccountEntity.getOne({})).to.eventually.be.rejectedWith(
				'Multiple rows were not expected.',
			);
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
			// Act
			const data = await AccountEntity.get();

			// Assert
			expect(data)
				.to.be.an('array')
				.and.have.lengthOf(5);
			// Just to make sure it's returning account objects
			expect(data[0]).to.have.property('address');
			expect(data[0]).to.have.property('publicKey');
			expect(data[0]).to.have.property('username');
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
					Object.getPrototypeOf(_getResultsSpy.firstCall.args[2]),
				).to.be.eql(Object.getPrototypeOf(tx));
			});
		});

		it('should resolve with one object matching specification of type definition of simple object', async () => {
			const anAccount = new accountFixtures.Account();
			await AccountEntity.create(anAccount);
			const results = await AccountEntity.get(
				{ address: anAccount.address },
				{ extended: false },
			);
			expect(results[0]).to.have.all.keys(validSimpleObjectFields);
		});

		it('should not change any of the provided parameter');

		describe('dynamic fields', () => {
			it('should fetch "productivity" with two decimal places when value is not integer', async () => {
				const producedBlocks = 50;
				const missedBlocks = 25;
				const validAccount = new accountFixtures.Account({
					producedBlocks,
					missedBlocks,
				});
				await AccountEntity.create(validAccount);
				const productivity = 66.67;

				const account = await AccountEntity.getOne(
					{ address: validAccount.address },
					{ extended: true },
				);

				expect(account.productivity).to.be.eql(productivity);
			});

			it('should fetch "productivity" with no decimal places when value is integer', async () => {
				const producedBlocks = 75;
				const missedBlocks = 25;
				const validAccount = new accountFixtures.Account({
					producedBlocks,
					missedBlocks,
				});
				await AccountEntity.create(validAccount);
				const productivity = 75;

				const account = await AccountEntity.getOne(
					{ address: validAccount.address },
					{ extended: true },
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
					{ extended: true },
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

			it('should return "secondSignature" as "boolean"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].secondSignature).to.be.a('boolean');
			});

			it('should return "fees" as "bigint"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].fees).to.be.a('string');
			});

			it('should return "rewards" as "bigint"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].rewards).to.be.a('string');
			});

			it('should return "voteWeight" as "bigint"', async () => {
				const data = await AccountEntity.get(filters, options);
				expect(data[0].voteWeight).to.be.a('string');
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
					`SELECT "publicKey" FROM mem_accounts WHERE "address" = '${validAccount.address}'`,
				);

				expect(accounts[0].publicKey).to.be.eql(
					rawKey[0].publicKey.toString('hex'),
				);
			});

			it('should always return "secondPublicKey" as "encode(secondPublicKey, \'hex\')"', async () => {
				const accounts = await AccountEntity.get(filters, options);
				const rawKey = await adapter.execute(
					`SELECT "secondPublicKey" FROM mem_accounts WHERE "address" = '${validAccount.address}'`,
				);

				expect(accounts[0].secondPublicKey).to.be.eql(
					rawKey[0].secondPublicKey.toString('hex'),
				);
			});
		});

		describe('filters', () => {
			describe('asset_contains', () => {
				let aliceAccount = null;
				let bobAccount = null;

				beforeEach(async () => {
					aliceAccount = new accountFixtures.Account({
						asset: {
							name: 'Alice',
							company: 'Acme Corp',
							tags: ['blockchain', 'decentralized'],
						},
					});
					bobAccount = new accountFixtures.Account({
						asset: {
							name: 'Bob',
							company: 'Acme Corp',
							tags: ['blockchain', 'crypto'],
						},
					});

					await AccountEntity.create([aliceAccount, bobAccount]);
				});

				it('should return single result when asset value contains unique property at the top level', async () => {
					const filters = { asset_contains: { name: 'Alice' } };
					const accounts = await AccountEntity.get(filters);

					expect(accounts.length).to.be.eql(1);
					expect(accounts[0].address).to.be.eql(aliceAccount.address);
				});

				it('should return result when asset value contains given array element', async () => {
					const filters = { asset_contains: { tags: ['crypto'] } };
					const accounts = await AccountEntity.get(filters);

					expect(accounts.length).to.be.eql(1);
					expect(accounts[0].address).to.be.eql(bobAccount.address);
				});

				it('should return all results when asset value contains multiple entries with a given object at the top level', async () => {
					const filters = { asset_contains: { company: 'Acme Corp' } };
					const accounts = await AccountEntity.get(filters, { extended: true });
					const sortedAccounts = accounts.sort((accountA, accountB) =>
						accountA.asset.name < accountB.asset.name ? -1 : 1,
					);

					expect(accounts.length).to.be.eql(2);
					expect(sortedAccounts[0].address).to.be.eql(aliceAccount.address);
					expect(sortedAccounts[1].address).to.be.eql(bobAccount.address);
				});

				it('should return empty result when asset value does not contain the given object at the top level', async () => {
					const filters = { asset_contains: { name: 'Eve' } };
					const accounts = await AccountEntity.get(filters);

					expect(accounts).to.be.empty;
				});

				it('should return result when filter includes multiple array elements', async () => {
					const filters = {
						asset_contains: { tags: ['blockchain', 'decentralized'] },
					};
					const accounts = await AccountEntity.get(filters, { extended: true });

					expect(accounts.length).to.be.eql(1);
					expect(accounts[0].address).to.be.eql(aliceAccount.address);
				});

				it('should return all accounts when query term is empty but tag exists', async () => {
					const filters = { asset_contains: { tags: [] } };
					const accounts = await AccountEntity.get(filters, { extended: true });
					const sortedAccounts = accounts.sort((accountA, accountB) =>
						accountA.asset.name < accountB.asset.name ? -1 : 1,
					);

					expect(accounts.length).to.be.eql(2);
					expect(sortedAccounts[0].address).to.be.eql(aliceAccount.address);
					expect(sortedAccounts[1].address).to.be.eql(bobAccount.address);
				});

				it('should return no accounts when query term is empty', async () => {
					const filters = { asset_contains: { name: '' } };
					const accounts = await AccountEntity.get(filters, { extended: true });
					expect(accounts.length).to.be.eql(0);
				});

				it('should return no accounts when query key is invalid', async () => {
					const filters = { asset_contains: { this_does_not_exist: '' } };
					const accounts = await AccountEntity.get(filters, { extended: true });
					expect(accounts.length).to.be.eql(0);
				});
			});

			describe('asset_exits', () => {
				let aliceAccount = null;
				let bobAccount = null;

				beforeEach(async () => {
					aliceAccount = new accountFixtures.Account({
						asset: {
							name: 'Alice',
							height: '1.79',
						},
					});
					bobAccount = new accountFixtures.Account({
						asset: {
							name: 'Bob',
							weight: '74',
						},
					});

					await AccountEntity.create([aliceAccount, bobAccount]);
				});

				it('should return single result when asset key exits at the top level', async () => {
					const filters = { asset_exists: 'height' };
					const accounts = await AccountEntity.get(filters);

					expect(accounts.length).to.be.eql(1);
					expect(accounts[0].address).to.be.eql(aliceAccount.address);
				});

				it('should return all results when key is present in all documents', async () => {
					const filters = { asset_exists: 'name' };
					const accounts = await AccountEntity.get(filters, { extended: true });
					const sortedAccounts = accounts.sort((accountA, accountB) =>
						accountA.asset.name < accountB.asset.name ? -1 : 1,
					);

					expect(accounts.length).to.be.eql(2);
					expect(sortedAccounts[0].address).to.be.eql(aliceAccount.address);
					expect(sortedAccounts[1].address).to.be.eql(bobAccount.address);
				});

				it('should return empty result when key is not present in any of the documents', async () => {
					const filters = { asset_exists: 'this_does_not_exists' };
					const accounts = await AccountEntity.get(filters);
					expect(accounts.length).to.be.eql(0);
				});

				it('should return empty result when key is empty string', async () => {
					const filters = { asset_exists: '' };
					const accounts = await AccountEntity.get(filters);
					expect(accounts.length).to.be.eql(0);
				});
			});

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
						{ sort: 'address', limit: 10 },
					);
					const actualData = _.map(data, 'address');
					expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
				});

				it('should sort by address in ascending if sort="address:asc"', async () => {
					const data = await AccountEntity.get(
						{},
						{ sort: 'address:asc', limit: 10 },
					);
					const actualData = _.map(data, 'address');
					expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
				});

				it('should sort by address in descending if sort="address:desc"', async () => {
					const data = await AccountEntity.get(
						{},
						{ sort: 'address:desc', limit: 10 },
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
						},
					);

					const sortedAccounts = _.orderBy(
						{ ...accounts },
						['username', 'address'],
						['desc', 'asc'],
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
						'SELECT COUNT(*)::int as count from mem_accounts',
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
						'SELECT COUNT(*) FROM mem_accounts;',
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

		it('should throw error for invalid filters', async () => {
			const account = new Account(adapter);
			try {
				account.get({ invalid_filter: true });
			} catch (err) {
				expect(err.message).to.equal('One or more filters are not supported.');
			}
		});

		it('should accept only valid options', async () => {
			// Act & Assert
			expect(() => {
				AccountEntity.get({}, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const account = new Account(adapter);
			try {
				account.get({}, invalidOptions);
			} catch (err) {
				expect(err.message).to.equal('One or more options are not supported.');
			}
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile', async () => {
			const executeSpy = sinonSandbox.spy(AccountEntity.adapter, 'executeFile');
			await AccountEntity.begin('testTX', async tx => {
				await AccountEntity.get({}, {}, tx);
				expect(Object.getPrototypeOf(executeSpy.firstCall.args[3])).to.be.eql(
					Object.getPrototypeOf(tx),
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
				loadSQLFiles: sinonSandbox.stub().returns({
					isPersisted: 'isPersisted SQL file',
				}),
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
				loadSQLFiles: sinonSandbox.stub().returns({
					isPersisted: 'isPersisted SQL file',
				}),
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
});
