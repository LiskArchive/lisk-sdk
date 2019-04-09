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

const pgpLib = require('pg-promise');
const {
	entities: { BaseEntity },
	utils: { filterTypes: { NUMBER } },
} = require('../../../../../../src/components/storage');

describe('BaseEntity', () => {
	let adapter;
	let defaultFilters;
	let defaultOptions;
	let defaultFields;

	beforeEach(async () => {
		const pgp = pgpLib();
		adapter = {
			loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
			parseQueryComponent: pgp.as.format,
		};
		defaultFilters = {
			id: 1,
			name: 6,
		};
		defaultFields = [
			{
				name: 'id',
				type: NUMBER,
				options: {
					filter: NUMBER,
				},
			},
			{
				name: 'name',
				type: NUMBER,
				options: {
					filter: NUMBER,
				},
			},
		];
		defaultOptions = {
			limit: 10,
			offset: 0,
			sort: false,
			extended: false,
		};
	});

	afterEach(async () => {
		sinonSandbox.reset();
	});

	it('should be a constructable function', async () => {
		expect(BaseEntity.prototype.constructor).to.be.not.null;
		expect(BaseEntity.prototype.constructor.name).to.be.eql('BaseEntity');
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(BaseEntity.prototype.constructor.length).to.be.eql(1);
		});

		it('should assign given adapter', async () => {
			const baseEntity = new BaseEntity(adapter);
			expect(baseEntity.adapter).to.be.eql(adapter);
		});

		it('should setup defaultFilters as empty object', async () => {
			const baseEntity = new BaseEntity(adapter);
			expect(baseEntity.defaultFilters).to.be.eql({});
		});

		it('should assign given defaultFilters', async () => {
			const baseEntity = new BaseEntity(adapter, defaultFilters);
			expect(baseEntity.defaultFilters).to.be.eql(defaultFilters);
		});

		it('should setup fields as empty object', async () => {
			const baseEntity = new BaseEntity(adapter);
			expect(baseEntity.fields).to.be.eql({});
		});

		it('should setup filters as empty object', async () => {
			const baseEntity = new BaseEntity(adapter);
			expect(baseEntity.filters).to.be.eql({});
		});

		it('should setup defaultOptions with correct values', async () => {
			const baseEntity = new BaseEntity(adapter);
			expect(baseEntity.defaultOptions).to.be.eql(defaultOptions);
		});
	});

	describe('loadSQLFiles()', () => {
		let baseEntity;
		let entityLabel;
		let sqlFilesKeys;
		let sqlFiles;
		let customEntitiesPath;

		beforeEach(async () => {
			baseEntity = new BaseEntity(adapter);
			entityLabel = 'baseEntity';
			sqlFilesKeys = ['get', 'save', 'update'];
			sqlFiles = {
				get: 'path/to/get.sql',
				save: 'path/to/save.sql',
				update: 'path/to/update.sql',
			};
			customEntitiesPath = '../my/path/';
		});

		afterEach(async () => {
			sinonSandbox.reset();
		});

		it('should initialize adapter.SQLs as object', async () => {
			baseEntity.loadSQLFiles(entityLabel, {});
			expect(typeof baseEntity.adapter.SQLs).to.be.eql('object');
		});

		it('should initialize adapter.SQLs[entityLabel] as object', async () => {
			baseEntity.loadSQLFiles(entityLabel, {});
			expect(typeof baseEntity.adapter.SQLs[entityLabel]).to.be.eql('object');
		});

		it('should return expected object', async () => {
			const SQLs = baseEntity.loadSQLFiles(entityLabel, sqlFiles);
			expect(SQLs).to.include.all.keys(sqlFilesKeys);
		});

		it('should call adapter.loadSQLFile 3 times', async () => {
			baseEntity.loadSQLFiles(entityLabel, sqlFiles);
			expect(adapter.loadSQLFile.callCount).to.eql(
				Object.keys(sqlFiles).length
			);
		});

		it('should not call adapter.loadSQLFile again when using same arguments', async () => {
			baseEntity.loadSQLFiles(entityLabel, sqlFiles);
			baseEntity.loadSQLFiles(entityLabel, sqlFiles);
			expect(adapter.loadSQLFile.callCount).to.eql(
				Object.keys(sqlFiles).length
			);
		});

		describe('given custom entities', () => {
			it('should initialize adapter.SQLs as object', async () => {
				baseEntity.loadSQLFiles(entityLabel, {}, customEntitiesPath);
				expect(typeof baseEntity.adapter.SQLs).to.be.eql('object');
			});

			it('should initialize adapter.SQLs[entityLabel] as object', async () => {
				baseEntity.loadSQLFiles(entityLabel, {}, customEntitiesPath);
				expect(typeof baseEntity.adapter.SQLs[entityLabel]).to.be.eql('object');
			});

			it('should return expected object', async () => {
				const SQLs = baseEntity.loadSQLFiles(
					entityLabel,
					sqlFiles,
					customEntitiesPath
				);
				expect(SQLs).to.include.all.keys(sqlFilesKeys);
			});

			it('should call adapter.loadSQLFile 3 times', async () => {
				baseEntity.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				expect(adapter.loadSQLFile.callCount).to.eql(
					Object.keys(sqlFiles).length
				);
			});

			it('should call adapter.loadSQLFile with a second parameter', async () => {
				baseEntity.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				adapter.loadSQLFile.args.forEach(arg => {
					expect(arg).to.include(customEntitiesPath);
				});
			});

			it('should not call adapter.loadSQLFile again when using same arguments', async () => {
				baseEntity.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				baseEntity.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				expect(adapter.loadSQLFile.callCount).to.eql(
					Object.keys(sqlFiles).length
				);
			});
		});
	});

	describe('parseFilters', () => {
		let baseEntity;

		beforeEach(async () => {
			baseEntity = new BaseEntity(adapter, defaultFilters);
			defaultFields.forEach(field =>
				baseEntity.addField(field.name, field.type, field.options)
			);
		});

		it('should create parse filters when filter is an object', async () => {
			const filter = { id: 10, name: '2' };
			expect(baseEntity.parseFilters(filter)).to.equal(
				'WHERE ("id" = 10 AND "name" = \'2\')'
			);
		});

		it('should create parse filters when filter is an array', async () => {
			const filter = [{ id: 10, name: '2' }, { id: 2 }, { name: '4' }];
			expect(baseEntity.parseFilters(filter)).to.equal(
				'WHERE ("id" = 10 AND "name" = \'2\') OR ("id" = 2) OR ("name" = \'4\')'
			);
		});

		it('should return an empty string when filter is an empty object', async () => {
			const filter = {};
			expect(baseEntity.parseFilters(filter)).to.equal('');
		});
	});
});
