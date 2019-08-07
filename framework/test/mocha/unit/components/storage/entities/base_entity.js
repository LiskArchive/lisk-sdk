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

const pgpLib = require('pg-promise');
const {
	entities: { BaseEntity },
	utils: {
		filterTypes: { NUMBER },
	},
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
			loadSQLFiles: sinonSandbox.stub().returns('loadSQLFiles'),
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
		it('should call adapter.loadSQLFiles with given arguments', async () => {
			// Arrange
			const baseEntity = new BaseEntity(adapter);
			const entityLabel = 'baseEntity';
			const sqlFiles = {
				get: 'path/to/get.sql',
				save: 'path/to/save.sql',
				update: 'path/to/update.sql',
			};
			const customEntitiesPath = '../my/path/';

			// Act
			baseEntity.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);

			// Assert
			expect(baseEntity.adapter.loadSQLFiles).to.be.calledWith(
				entityLabel,
				sqlFiles,
				customEntitiesPath,
			);
		});
	});

	describe('parseFilters', () => {
		let baseEntity;

		beforeEach(async () => {
			baseEntity = new BaseEntity(adapter, defaultFilters);
			defaultFields.forEach(field =>
				baseEntity.addField(field.name, field.type, field.options),
			);
		});

		it('should create parse filters when filter is an object', async () => {
			const filter = { id: 10, name: '2' };
			expect(baseEntity.parseFilters(filter)).to.equal(
				'WHERE ("id" = 10 AND "name" = \'2\')',
			);
		});

		it('should create parse filters when filter is an array', async () => {
			const filter = [{ id: 10, name: '2' }, { id: 2 }, { name: '4' }];
			expect(baseEntity.parseFilters(filter)).to.equal(
				'WHERE ("id" = 10 AND "name" = \'2\') OR ("id" = 2) OR ("name" = \'4\')',
			);
		});

		it('should return an empty string when filter is an empty object', async () => {
			const filter = {};
			expect(baseEntity.parseFilters(filter)).to.equal('');
		});
	});
});
