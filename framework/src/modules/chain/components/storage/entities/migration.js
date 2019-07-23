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
const fs = require('fs-extra');
const { defaults, pick } = require('lodash');
const {
	entities: { BaseEntity },
	errors: { NonSupportedOperationError },
	utils: {
		filterTypes: { TEXT },
	},
} = require('../../../../../components/storage');

const defaultCreateValues = {};

const sqlFiles = {
	select: 'migrations/get.sql',
	isPersisted: 'migrations/is_persisted.sql',
	create: 'migrations/create.sql',
};

/**
 * Migration
 * @typedef {Object} Migration
 * @property {string} id
 * @property {string} name
 */

/**
 * Migration Filters
 * @typedef {Object} filters.Migration
 * @property {string} [id]
 * @property {string} [id_eql]
 * @property {string} [id_ne]
 * @property {string} [id_in]
 * @property {string} [id_like]
 * @property {string} [name]
 * @property {string} [name_eql]
 * @property {string} [name_ne]
 * @property {string} [name_in]
 * @property {string} [name_like]
 */

class Migration extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.Migration} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: TEXT });
		this.addField('name', 'string', { filter: TEXT });

		const defaultSort = { sort: 'id:asc' };
		this.extendDefaultOptions(defaultSort);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('migration', sqlFiles, this.sqlDirectory);
	}

	/**
	 * Get one Migration
	 *
	 * @param {filters.Migration|filters.Migration[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Migration, Error>}
	 */
	getOne(filters, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of Migrations
	 *
	 * @param {filters.Migration|filters.Migration[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Migration[], Error>}
	 */
	get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = defaults(
			{},
			pick(options, ['limit', 'offset', 'sort']),
			pick(this.defaultOptions, ['limit', 'offset', 'sort'])
		);
		const parsedSort = this.parseSort(parsedOptions.sort);

		const params = {
			limit: parsedOptions.limit,
			offset: parsedOptions.offset,
			parsedSort,
			parsedFilters,
		};

		return this.adapter.executeFile(
			this.SQLs.select,
			params,
			{ expectedResultCount },
			tx
		);
	}

	/**
	 * Create migration object
	 *
	 * @param {Object} data
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {null}
	 */
	// eslint-disable-next-line no-unused-vars
	create(data, _options = {}, tx = null) {
		const objectData = defaults(data, defaultCreateValues);
		const createSet = this.getValuesSet(objectData);
		const attributes = Object.keys(data)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, attributes },
			{ expectedResultCount: 0 },
			tx
		);
	}

	/**
	 * Update operation is not supported for Migrations
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new NonSupportedOperationError();
	}

	/**
	 * UpdateOne operation is not supported for Migrations
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	updateOne() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Delete operation is not supported for Migrations
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	delete() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Migration} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isPersisted(filters, _options, tx = null) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.isPersisted,
				{ parsedFilters },
				{ expectedResultCount: 1 },
				tx
			)
			.then(result => result.exists);
	}

	/**
	 * Verifies presence of the 'migrations' OID named relation.
	 *
	 * @returns {Promise<boolean>} Promise object that resolves with a boolean.
	 */
	async hasMigrations() {
		const hasMigrations = await this.adapter.execute(
			"SELECT table_name hasMigrations FROM information_schema.tables WHERE table_name = 'migrations';"
		);
		return !!hasMigrations.length;
	}

	/**
	 * Gets id of the last migration record, or 0, if none exist.
	 *
	 * @returns {Promise<number>}
	 * Promise object that resolves with either 0 or id of the last migration record.
	 */
	async getLastId() {
		const result = await this.get({}, { sort: 'id:DESC', limit: 1 });
		return result.length ? parseInt(result[0].id) : null;
	}

	/**
	 * Reads 'sql/migrations/updates' folder and returns an array of objects for further processing.
	 *
	 * @param {number} lastMigrationId
	 * @returns {Promise<Array<Object>>}
	 * Promise object that resolves with an array of objects `{id, name, path, file}`.
	 */
	readPending(lastMigrationId) {
		const updatesPath = path.join(__dirname, '../sql/migrations/updates');
		return fs.readdir(updatesPath).then(files =>
			files
				.map(migrationFile => {
					const migration = migrationFile.match(/(\d+)_(.+).sql/);
					return (
						migration && {
							id: migration[1],
							name: migration[2],
							path: path.join('../sql/migrations/updates', migrationFile),
						}
					);
				})
				.sort((a, b) => a.id - b.id) // Sort by migration ID, ascending
				.filter(
					migration =>
						migration &&
						fs
							.statSync(path.join(this.sqlDirectory, migration.path))
							.isFile() &&
						(!lastMigrationId || +migration.id > lastMigrationId)
				)
				.map(f => {
					f.file = this.adapter.loadSQLFile(f.path, this.sqlDirectory);
					return f;
				})
		);
	}

	async applyPendingMigration(pendingMigration, tx) {
		// eslint-disable-next-line no-restricted-syntax
		await this.adapter.executeFile(pendingMigration.file, {}, {}, tx);
		await this.create(
			{ id: pendingMigration.id, name: pendingMigration.name },
			{},
			tx
		);
	}

	/**
	 * Applies a cumulative update: all pending migrations + runtime.
	 * Each update+insert execute within their own SAVEPOINT, to ensure data integrity on the updates level.
	 *
	 * @returns {Promise} Promise object that resolves with `undefined`.
	 */
	async applyAll() {
		const hasMigrations = await this.hasMigrations();
		const lastId = hasMigrations ? await this.getLastId() : 0;
		const pendingMigrations = await this.readPending(lastId);

		if (pendingMigrations.length > 0) {
			// eslint-disable-next-line no-restricted-syntax
			for (const migration of pendingMigrations) {
				const execute = tx => this.applyPendingMigration(migration, tx);
				// eslint-disable-next-line no-await-in-loop
				await this.begin('migrations:applyAll', execute);
			}
		}
	}
}

module.exports = Migration;
