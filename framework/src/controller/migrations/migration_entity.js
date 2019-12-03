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

class MigrationEntity extends BaseEntity {
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

	getOne(filters, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

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

	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	updateOne() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	delete() {
		throw new NonSupportedOperationError();
	}

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

	async applyAll(migrationsObj) {
		const savedMigrations = await this.get({}, { limit: null });

		const pendingMigrations = await this.readPending(
			migrationsObj,
			savedMigrations,
		);

		if (pendingMigrations.length > 0) {
			for (const migration of pendingMigrations) {
				const execute = tx => this.applyPendingMigration(migration, tx);
				await this.begin('migrations:applyAll', execute);
			}
		}
	}

	async defineSchema() {
		return this.adapter.executeFile(this.SQLs.defineSchema);
	}
}

module.exports = MigrationEntity;
