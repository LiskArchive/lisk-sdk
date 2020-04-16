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
/* eslint-disable max-classes-per-file */

'use strict';

const child_process = require('child_process');
const pgpLib = require('pg-promise');
const {
	adapters: { PgpAdapter },
	Storage,
} = require('../../../src/components/storage');

// Custom entitties
const {
	AccountEntity,
	BlockEntity,
	TransactionEntity,
	ChainStateEntity,
	ConsensusStateEntity,
	ForgerInfoEntity,
	TempBlockEntity,
	MigrationEntity,
	NetworkInfoEntity,
} = require('../../../src/application/storage/entities');

const {
	networkMigrations,
	nodeMigrations,
} = require('../../../src/application/storage/migrations');

const HttpAPIModule = require('../../../src/modules/http_api');

const modulesMigrations = {};
modulesMigrations.node = nodeMigrations();
modulesMigrations.network = networkMigrations();
modulesMigrations[HttpAPIModule.alias] = HttpAPIModule.migrations;

const dbNames = [];

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} storage
 * @param {function} cb
 */
async function clearDatabaseTable(storageInstance, logger, table) {
	return new Promise((resolve, reject) => {
		storageInstance.adapter.db
			.query(`DELETE FROM ${table}`)
			.then(result => resolve(result))
			.catch(err => {
				logger.error(`Failed to clear database table: ${table}`);
				return reject(err);
			});
	});
}

class StorageSandbox extends Storage {
	constructor(dbConfig, dbName) {
		if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
			throw new Error(
				`storage_sandbox is meant to be run in test environment only. NODE_ENV is: ${process.env.NODE_ENV}`,
			);
		}

		dbNames.push(dbName);
		dbConfig.database = dbName;
		dbConfig.max = process.env.LISK_TEST_DB_MAX_CONNECTIONS || 2;

		const dropCreatedDatabases = function() {
			dbNames.forEach(aDbName => {
				child_process.exec(`dropdb ${aDbName}`);
			});
		};

		process.on('exit', () => {
			dropCreatedDatabases();
		});

		super(dbConfig, console);
		this.originalDbName = dbConfig.database;
	}

	async bootstrap() {
		await this._dropDB();
		await this._createDB();
		await super.bootstrap();

		this.registerEntity('Account', AccountEntity);
		this.registerEntity('Block', BlockEntity);
		this.registerEntity('Transaction', TransactionEntity);

		// Custom entitties
		this.registerEntity('Migration', MigrationEntity);
		this.registerEntity('NetworkInfo', NetworkInfoEntity);
		this.registerEntity('ChainState', ChainStateEntity);
		this.registerEntity('ConsensusState', ConsensusStateEntity);
		this.registerEntity('ForgerInfo', ForgerInfoEntity);
		this.registerEntity('TempBlock', TempBlockEntity);

		await this._createSchema();
		return true;
	}

	cleanup() {
		this.options.database = this.originalDbName;
		super.cleanup();
	}

	async _dropDB() {
		return new Promise(resolve => {
			child_process.exec(`dropdb ${this.options.database}`, () => resolve());
		});
	}

	async _createDB() {
		return new Promise((resolve, reject) => {
			child_process.exec(`createdb ${this.options.database}`, error => {
				if (error) {
					return reject(error);
				}
				return resolve();
			});
		});
	}

	async _createSchema() {
		await this.entities.Migration.defineSchema();
		await this.entities.Migration.applyAll(modulesMigrations);
	}
}

class TestAdapter extends PgpAdapter {
	constructor(options) {
		super({
			engineName: 'pgp-test',
			inTest: true,
		});

		this.logger = console;
		this.pgpOptions = {
			capSQL: true,
			promiseLib: Promise,
		};

		this.pgp = pgpLib(this.pgpOptions);
		options.max = process.env.LISK_TEST_DB_MAX_CONNECTIONS || 2;
		this.db = this.pgp(options);
	}
}

class TestStorageSandbox extends Storage {
	constructor(dbConfig, entityStubs) {
		if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
			throw new Error(
				`storage_sandbox is meant to be run in test environment only. NODE_ENV is: ${process.env.NODE_ENV}`,
			);
		}

		super(dbConfig, console);
		this.entityStubs = entityStubs;

		this.bootstrap();
	}

	bootstrap() {
		const adapter = new TestAdapter({
			...this.options,
			inTest: true,
			logger: this.logger,
		});

		this.isReady = true;
		this.adapter = adapter;
		this.entities = this.entityStubs;

		return true;
	}
}

module.exports = {
	clearDatabaseTable,
	StorageSandbox,
	TestStorageSandbox,
};
