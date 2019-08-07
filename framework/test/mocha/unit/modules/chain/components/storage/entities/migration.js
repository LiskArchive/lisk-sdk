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

const path = require('path');
const {
	entities: { BaseEntity },
	errors: {
		NonSupportedFilterTypeError,
		NonSupportedOperationError,
		NonSupportedOptionError,
	},
} = require('../../../../../../../../src/components/storage');
const {
	MigrationEntity,
} = require('../../../../../../../../src/controller/migrations');
const storageSandbox = require('../../../../../../common/storage_sandbox');

const ChainModule = require('../../../../../../../../src/modules/chain');
const NetworkModule = require('../../../../../../../../src/modules/network');
const HttpAPIModule = require('../../../../../../../../src/modules/http_api');

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
			__testContext.config.components.storage,
			'lisk_test_storage_custom_migration_chain_module',
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
			'namespace',
			'namespace_eql',
			'namespace_ne',
			'namespace_in',
			'namespace_like',
		];

		invalidFilter = {
			invalid: true,
			filter: true,
		};

		noResultsFilter = {
			id: '30160723182900',
		};

		validFilter = {
			id: '30200723182900',
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
			id: '30200723182900',
			name: 'create_schema',
			namespace: 'module_name',
		};

		adapter = storage.adapter;

		addFieldSpy = sinonSandbox.spy(MigrationEntity.prototype, 'addField');
	});

	afterEach(async () => {
		sinonSandbox.reset();
	});

	it('should be a constructable function', async () => {
		expect(MigrationEntity.prototype.constructor).not.to.be.null;
		expect(MigrationEntity.prototype.constructor.name).to.be.eql(
			'MigrationEntity',
		);
	});

	it('should extend BaseEntity', async () => {
		expect(MigrationEntity.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(MigrationEntity.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const migration = new MigrationEntity(adapter);
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
			const migration = new MigrationEntity(adapter);
			expect(migration.SQLs).to.include.all.keys(validMigrationSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const migration = new MigrationEntity(adapter);
			expect(addFieldSpy.callCount).to.eql(
				Object.keys(migration.fields).length,
			);
		});

		it('should setup correct fields', async () => {
			const migration = new MigrationEntity(adapter);
			expect(migration.fields).to.include.all.keys(validMigrationFields);
		});

		it('should setup specific filters');
	});

	describe('getOne()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const migration = new MigrationEntity(adapter);
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
			const migration = new MigrationEntity(adapter);
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
			const migration = new MigrationEntity(adapter);
			expect(() => {
				migration.getOne(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const migration = new MigrationEntity(adapter);
			expect(() => {
				migration.getOne(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const migration = new MigrationEntity(adapter);
			expect(() => {
				migration.getOne(validFilter, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const migration = new MigrationEntity(adapter);
			expect(() => {
				migration.getOne(validFilter, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile', async () => {
			// Arrange
			const migration = new MigrationEntity(adapter);
			const getSpy = sinonSandbox.spy(migration, 'get');
			// Act & Assert
			await migration.begin('testTX', async tx => {
				await migration.get({ id: '20160723182900' }, {}, tx);
				expect(Object.getPrototypeOf(getSpy.firstCall.args[2])).to.be.eql(
					Object.getPrototypeOf(tx),
				);
			});
		});

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				const migration = new MigrationEntity(adapter);
				expect(migration.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(MigrationEntity.prototype.update).to.throw(
				NonSupportedOperationError,
			);
		});
	});

	describe('delete()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(MigrationEntity.prototype.delete).to.throw(
				NonSupportedOperationError,
			);
		});
	});

	describe('isPersisted()', () => {
		let localAdapter;
		const isPersistedSqlFile = 'isPersisted SQL File';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					isPersisted: isPersistedSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves([validMigration]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		it('should accept only valid filters', async () => {
			const migration = new MigrationEntity(adapter);
			expect(() => {
				migration.isPersisted(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const migration = new MigrationEntity(adapter);
			expect(() => {
				migration.isPersisted(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const migration = new MigrationEntity(localAdapter);
			migration.mergeFilters = sinonSandbox.stub();
			migration.parseFilters = sinonSandbox.stub();
			migration.isPersisted(validFilter);
			expect(migration.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const migration = new MigrationEntity(localAdapter);
			migration.mergeFilters = sinonSandbox.stub().returns(validFilter);
			migration.parseFilters = sinonSandbox.stub();
			migration.isPersisted(validFilter);
			expect(migration.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const migration = new MigrationEntity(localAdapter);
			migration.mergeFilters = sinonSandbox.stub().returns(validFilter);
			migration.parseFilters = sinonSandbox.stub();
			migration.getUpdateSet = sinonSandbox.stub();
			migration.isPersisted(validFilter);
			expect(
				localAdapter.executeFile.calledWith(
					isPersistedSqlFile,
					{
						parsedFilters: undefined,
					},
					{ expectedResultCount: 1 },
					null,
				),
			).to.be.true;
		});

		it('should resolve with true if matching record found', async () => {
			const localMigration = { ...validMigration };
			await storage.entities.Migration.create(localMigration);
			const res = await storage.entities.Migration.isPersisted(validFilter);
			expect(res).to.be.true;
			await storage.entities.Migration.adapter.execute(
				`DELETE FROM migrations WHERE id = '${localMigration.id}'`,
			);
		});

		it('should resolve with false if matching record not found', async () => {
			await storage.entities.Migration.create(validMigration);
			const res = await storage.entities.Migration.isPersisted(noResultsFilter);
			expect(res).to.be.false;
			await storage.entities.Migration.adapter.execute(
				`DELETE FROM migrations WHERE id = '${validMigration.id}'`,
			);
		});
	});

	describe('mergeFilters()', () => {
		it('should accept filters as single object', async () => {
			const migration = new MigrationEntity(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(migration, 'mergeFilters');
			expect(() => {
				migration.get(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith(validFilter)).to.be.true;
		});

		it('should accept filters as array of objects', async () => {
			const migration = new MigrationEntity(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(migration, 'mergeFilters');
			expect(() => {
				migration.get([validFilter, validFilter]);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith([validFilter, validFilter])).to.be.true;
		});

		it(
			'should merge provided filter with default filters by preserving default filters values',
		);
	});

	describe('Schema Updates methods', () => {
		let savedMigrations;

		const modulesMigrations = {};
		modulesMigrations[ChainModule.alias] = ChainModule.migrations;
		modulesMigrations[NetworkModule.alias] = NetworkModule.migrations;
		modulesMigrations[HttpAPIModule.alias] = HttpAPIModule.migrations;

		before(async () => {
			savedMigrations = Object.keys(modulesMigrations).reduce(
				(prev, namespace) => {
					const curr = modulesMigrations[namespace].map(migrationFile => {
						const migration = path
							.basename(migrationFile)
							.match(/(\d+)_(.+).sql/);
						return (
							migration && {
								id: migration[1],
								name: migration[2],
								namespace,
							}
						);
					});
					return prev.concat(curr);
				},
				[],
			);
		});

		afterEach(async () => {
			sinonSandbox.restore();
		});

		describe('readPending', () => {
			it('should resolve with list of pending files if there exists any', async () => {
				const pendingMigrationsMock = savedMigrations.slice(0, 2);
				const savedMigrationsMock = savedMigrations.slice(2);
				const pendingMigrations = await storage.entities.Migration.readPending(
					modulesMigrations,
					savedMigrationsMock,
				);
				expect(
					pendingMigrations.map(m => ({
						id: m.id,
						name: m.name,
						namespace: m.namespace,
					})),
				).to.be.eql(pendingMigrationsMock);
			});

			it('should resolve with empty array if there is no pending migration', async () => {
				const pending = await storage.entities.Migration.readPending(
					modulesMigrations,
					savedMigrations,
				);

				return expect(pending).to.be.empty;
			});

			it('should resolve with the list in correct format', async () => {
				const savedMigrationsMock = savedMigrations.slice(2);
				const pendingMigrations = await storage.entities.Migration.readPending(
					modulesMigrations,
					savedMigrationsMock,
				);

				expect(pendingMigrations).to.be.an('array');
				expect(pendingMigrations[0]).to.have.all.keys(
					'id',
					'name',
					'namespace',
					'path',
					'file',
				);
				expect(pendingMigrations[0].file).to.be.instanceOf(
					storage.entities.Migration.adapter.pgp.QueryFile,
				);
			});
		});

		describe('defineSchema()', () => {
			it('should call adapter.executeFile with proper params', async () => {
				sinonSandbox.spy(adapter, 'executeFile');
				const migration = new MigrationEntity(adapter);
				await migration.defineSchema();

				expect(adapter.executeFile.firstCall.args[0]).to.be.eql(
					migration.SQLs.defineSchema,
				);
			});
		});

		describe('applyAll()', () => {
			let pendingMigrations;

			beforeEach(async () => {
				const savedMigrationsMock = savedMigrations.slice(2);
				pendingMigrations = await storage.entities.Migration.readPending(
					modulesMigrations,
					savedMigrationsMock,
				);
			});

			it('should call this.get()', async () => {
				sinonSandbox.spy(storage.entities.Migration, 'get');
				await storage.entities.Migration.applyAll(modulesMigrations);
				expect(storage.entities.Migration.get).to.be.calledOnce;
			});

			it('should call readPending()', async () => {
				sinonSandbox.spy(storage.entities.Migration, 'readPending');
				await storage.entities.Migration.applyAll(modulesMigrations);
				expect(storage.entities.Migration.readPending).to.be.calledOnce;
			});

			it('should apply all pending migrations in independent transactions', async () => {
				sinonSandbox.spy(storage.entities.Migration, 'begin');
				sinonSandbox
					.stub(storage.entities.Migration, 'readPending')
					.resolves(pendingMigrations);
				sinonSandbox
					.stub(storage.entities.Migration, 'applyPendingMigration')
					.resolves(null);

				await storage.entities.Migration.applyAll(modulesMigrations);

				expect(storage.entities.Migration.begin.callCount).to.be.eql(
					pendingMigrations.length,
				);
				expect(
					storage.entities.Migration.begin
						.getCalls()
						.filter(aCall => aCall.args[0] !== 'migrations:applyAll').length,
				).to.be.eql(0);

				const applyPendingMigrationCalls = storage.entities.Migration.applyPendingMigration.getCalls();

				applyPendingMigrationCalls.forEach((aCall, idx) => {
					expect(aCall.args[0]).to.be.eql(pendingMigrations[idx]);
					expect(aCall.args[1].constructor.name).to.be.eql('Task');
				});
			});
		});
	});
});
