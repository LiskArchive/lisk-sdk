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

const { BaseEntity, Account } = require('../../../../storage/entities');
const storageSandbox = require('../../../common/storage_sandbox');
const seeder = require('../../../common/storage_seed');

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

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters');
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('create()', () => {
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call getValuesSet with proper params');
		it('should call adapter.executeFile with proper params');
		it('should create an account object successfully');
		it('should create multiple account objects successfully');
		it('should skip if any invalid attribute is provided');
		it('should reject with invalid data provided');
		it('should populate account object with default values');
	});

	describe('update()', () => {
		it('should accept only valid filters');
		it('should throw error for in-valid filters');
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call getUpdateSet with proper params');
		it('should call adapter.executeFile with proper params');
		it(
			'should update all accounts object successfully with matching condition'
		);
		it('should skip if any invalid attribute is provided');
		it('should not throw error if no matching record found');
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
});
