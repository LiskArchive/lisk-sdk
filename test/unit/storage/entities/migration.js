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

const { BaseEntity, Migration } = require('../../../../storage/entities');
const storageSandbox = require('../../../common/storage_sandbox');
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
	NonSupportedOperationError,
} = require('../../../../storage/errors');

describe('Migration', () => {
	let adapter;
	let validMigrationFields;
	let validMigrationSQLs;
	let validFilters;
	let addFieldSpy;
	let invalidFilter;
	let validFilter;
	let noResultsFilter;
	let invalidOptions;
	let validOptions;
	let storage;
	let validMigration;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_migrations'
		);
		await storage.bootstrap();

		validMigrationFields = ['id', 'name'];

		validMigrationSQLs = ['select', 'isPersisted'];

		validFilters = [
			'id',
			'id_eql',
			'id_ne',
			'id_in',
			'id_like',
			'name',
			'name_eql',
			'name_ne',
			'name_in',
			'name_like',
		];

		invalidFilter = {
			invalid: true,
			filter: true,
		};

		noResultsFilter = {
			id: '30160723182900',
		};

		validFilter = {
			id: '20160723182900',
		};

		invalidOptions = {
			foo: true,
			bar: true,
		};

		validOptions = {
			limit: 100,
			offset: 0,
		};

		validMigration = {
			id: '20160723182900',
			name: 'create_schema',
		};

		adapter = storage.adapter;

		addFieldSpy = sinonSandbox.spy(Migration.prototype, 'addField');
	});

	afterEach(async () => {
		sinonSandbox.reset();
	});

	it('should be a constructable function', async () => {
		expect(Migration.prototype.constructor).not.to.be.null;
		expect(Migration.prototype.constructor.name).to.be.eql('Migration');
	});

	it('should extend BaseEntity', async () => {
		expect(Migration.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Migration.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const migration = new Migration(adapter);
			expect(typeof migration.parseFilters).to.be.eql('function');
			expect(typeof migration.addFilter).to.be.eql('function');
			expect(typeof migration.addField).to.be.eql('function');
			expect(typeof migration.getFilters).to.be.eql('function');
			expect(typeof migration.getUpdateSet).to.be.eql('function');
			expect(typeof migration.getValuesSet).to.be.eql('function');
			expect(typeof migration.begin).to.be.eql('function');
			expect(typeof migration.validateFilters).to.be.eql('function');
			expect(typeof migration.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const migration = new Migration(adapter);
			expect(migration.SQLs).to.include.all.keys(validMigrationSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const migration = new Migration(adapter);
			expect(addFieldSpy.callCount).to.eql(
				Object.keys(migration.fields).length
			);
		});

		it('should setup correct fields', async () => {
			const migration = new Migration(adapter);
			expect(migration.fields).to.include.all.keys(validMigrationFields);
		});

		it('should setup specific filters');
	});

	describe('getOne()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const migration = new Migration(adapter);
			const _getResultsStub = sinonSandbox
				.stub(migration, '_getResults')
				.returns(validMigration);
			migration.getOne(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null, 1]);
		});
	});

	describe('get()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const migration = new Migration(adapter);
			const _getResultsStub = sinonSandbox
				.stub(migration, '_getResults')
				.returns(validMigration);
			migration.get(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null]);
		});
	});

	describe('_getResults()', () => {
		it('should accept only valid filters', async () => {
			const migration = new Migration(adapter);
			expect(() => {
				migration.getOne(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const migration = new Migration(adapter);
			expect(() => {
				migration.getOne(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const migration = new Migration(adapter);
			expect(() => {
				migration.getOne(validFilter, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const migration = new Migration(adapter);
			expect(() => {
				migration.getOne(validFilter, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile');

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				const migration = new Migration(adapter);
				expect(migration.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Migration.prototype.update).to.throw(NonSupportedOperationError);
		});
	});

	describe('isPersisted()', () => {
		afterEach(async () => {
			await storageSandbox.clearDatabaseTable(
				storage,
				storage.logger,
				'migrations'
			);
		});

		it('should accept only valid filters', async () => {
			const migration = new Migration(adapter);
			expect(() => {
				migration.isPersisted(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const migration = new Migration(adapter);
			expect(() => {
				migration.isPersisted(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validMigration]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const migration = new Migration(localAdapter);
			migration.mergeFilters = sinonSandbox.stub();
			migration.parseFilters = sinonSandbox.stub();
			migration.isPersisted(validFilter);
			expect(migration.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validMigration]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const migration = new Migration(localAdapter);
			migration.mergeFilters = sinonSandbox.stub().returns(validFilter);
			migration.parseFilters = sinonSandbox.stub();
			migration.isPersisted(validFilter);
			expect(migration.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validMigration]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const migration = new Migration(localAdapter);
			migration.mergeFilters = sinonSandbox.stub().returns(validFilter);
			migration.parseFilters = sinonSandbox.stub();
			migration.getUpdateSet = sinonSandbox.stub();
			migration.isPersisted(validFilter);
			expect(
				localAdapter.executeFile.calledWith(
					'loadSQLFile',
					{
						parsedFilters: undefined,
					},
					{ expectedResultCount: 1 },
					null
				)
			).to.be.true;
		});

		it('should resolve with true if matching record found', async () => {
			const localMigration = { ...validMigration };
			await storage.entities.Migration.create(localMigration);
			const res = await storage.entities.Migration.isPersisted(validFilter);
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			await storage.entities.Migration.create(validMigration);
			const res = await storage.entities.Migration.isPersisted(noResultsFilter);
			expect(res).to.be.false;
		});
	});

	describe('mergeFilters()', () => {
		it('should accept filters as single object', async () => {
			const migration = new Migration(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(migration, 'mergeFilters');
			expect(() => {
				migration.get(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith(validFilter)).to.be.true;
		});

		it('should accept filters as array of objects', async () => {
			const migration = new Migration(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(migration, 'mergeFilters');
			expect(() => {
				migration.get([validFilter, validFilter]);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith([validFilter, validFilter])).to.be.true;
		});

		it(
			'should merge provided filter with default filters by preserving default filters values'
		);
	});
});
