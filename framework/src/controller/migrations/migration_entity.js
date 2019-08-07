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
} = require('../../components/storage');

const defaultCreateValues = {};

const sqlFiles = {
	select: 'get.sql',
	isPersisted: 'is_persisted.sql',
	create: 'create.sql',
	defineSchema: 'define_schema.sql',
};

/**
 * Migration
 * @typedef {Object} Migration
 * @property {string} id
 * @property {string} name
 * @property {string} namespace
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
 * @property {string} [namespace]
 * @property {string} [namespace_eql]
 * @property {string} [namespace_ne]
 * @property {string} [namespace_in]
 * @property {string} [namespace_like]
 */

class MigrationEntity extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.Migration} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: TEXT });
		this.addField('name', 'string', { filter: TEXT });
		this.addField('namespace', 'string', { filter: TEXT });

		const defaultSort = { sort: 'id:asc' };
		this.extendDefaultOptions(defaultSort);

		this.sqlDirectory = path.join(path.dirname(__filename), './sql');
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
			pick(this.defaultOptions, ['limit', 'offset', 'sort']),
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
			tx,
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
			tx,
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
				tx,
			)
			.then(result => result.exists);
	}

	/**
	 * Creates an array of objects with `{id, name, namespace, path}`, remove the ones already executed, sorts by ID ascending and add the file property
	 *
	 * @param {Objec} migrationsObj - Object where the key is the migrations namespace and the value an array of migration's path
	 * @param {Array} savedMigrations - Array of objects with all migrations already executed before
	 * @returns {Promise<Array<Object>>}
	 * Promise object that resolves with an array of objects `{id, name, namespace, path, file}`.
	 */
	async readPending(migrationsObj, savedMigrations) {
		return Object.keys(migrationsObj).reduce((prev, namespace) => {
			const curr = migrationsObj[namespace]
				.map(migrationFile => {
					const migration = path
						.basename(migrationFile)
						.match(/(\d+)_(.+).sql/);
					return (
						migration && {
							id: migration[1],
							name: migration[2],
							path: migrationFile,
							namespace,
						}
					);
				})
				.filter(
					migration =>
						migration &&
						fs.statSync(migration.path).isFile() &&
						!savedMigrations.find(
							saved =>
								saved.id === migration.id &&
								saved.namespace === migration.namespace,
						),
				)
				.sort((a, b) => a.id - b.id) // Sort by migration ID, ascending
				.map(migration => {
					migration.file = this.adapter.loadSQLFile(migration.path, '');
					return migration;
				});
			return prev.concat(curr);
		}, []);
	}

	async applyPendingMigration(pendingMigration, tx) {
		await this.adapter.executeFile(pendingMigration.file, {}, {}, tx);
		await this.create(
			{
				id: pendingMigration.id,
				name: pendingMigration.name,
				namespace: pendingMigration.namespace,
			},
			{},
			tx,
		);
	}

	/**
	 * Applies a cumulative update: all migrations passed as argument except the ones present in the migrations table.
	 * Each update+insert execute within their own SAVEPOINT, to ensure data integrity on the updates level.
	 *
	 * @returns {Promise} Promise object that resolves with `undefined`.
	 */
	async applyAll(migrationsObj) {
		const savedMigrations = await this.get({}, { limit: null });

		const pendingMigrations = await this.readPending(
			migrationsObj,
			savedMigrations,
		);

		if (pendingMigrations.length > 0) {
			// eslint-disable-next-line no-restricted-syntax
			for (const migration of pendingMigrations) {
				const execute = tx => this.applyPendingMigration(migration, tx);
				// eslint-disable-next-line no-await-in-loop
				await this.begin('migrations:applyAll', execute);
			}
		}
	}

	/**
	 * Define migrations schema
	 *
	 * @returns {Promise} Promise object that resolves with `undefined`.
	 */
	async defineSchema() {
		return this.adapter.executeFile(this.SQLs.defineSchema);
	}
}

module.exports = MigrationEntity;
