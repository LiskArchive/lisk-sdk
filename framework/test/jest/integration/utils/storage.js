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

const { Storage } = require('../../../../src/components/storage');

// Custom entitties
const {
	Account,
	Block,
	Round,
	Transaction,
} = require('../../../../src/modules/chain/components/storage/entities');

const {
	Peer,
} = require('../../../../src/modules/network/components/storage/entities');

const {
	MigrationEntity: Migration,
} = require('../../../../src/controller/migrations');

const ChainModule = require('../../../../src/modules/chain');
const NetworkModule = require('../../../../src/modules/network');
const HttpAPIModule = require('../../../../src/modules/http_api');

const modulesMigrations = {
	[ChainModule.alias]: ChainModule.migrations,
	[NetworkModule.alias]: NetworkModule.migrations,
	[HttpAPIModule.alias]: HttpAPIModule.migrations,
};

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} storage
 * @param {function} cb
 */
const clearDatabaseTable = async (storageInstance, table) =>
	storageInstance.adapter.db.query(`DELETE FROM ${table}`);

class StorageSandbox extends Storage {
	constructor(dbConfig, dbName) {
		if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
			throw new Error(
				`storage_sandbox is meant to be run in test environment only. NODE_ENV is: ${
					process.env.NODE_ENV
				}`
			);
		}
		super(dbConfig, console);

		this.dbName = dbName;

		dbConfig.database = dbName;
		dbConfig.max = process.env.LISK_TEST_DB_MAX_CONNECTIONS || 2;

		process.on('exit', async () => {
			await this._dropDB();
		});
	}

	async bootstrap() {
		await super.bootstrap();
		await this._dropDB();
		await this._createDB();

		this.registerEntity('Account', Account);
		this.registerEntity('Block', Block);
		this.registerEntity('Transaction', Transaction);

		// Custom entitties
		this.registerEntity('Migration', Migration);
		this.registerEntity('Peer', Peer);
		this.registerEntity('Round', Round);

		await this._createSchema();
		return true;
	}

	async cleanup() {
		super.cleanup();
		await this._dropDB();
	}

	async _dropDB() {
		await this.adapter.db.none(`DROP DATABASE ${this.dbName}`);
	}

	async _createDB() {
		await this.adapter.db.none(`CREATE DATABASE ${this.dbName}`);
	}

	async _createSchema() {
		await this.entities.Migration.defineSchema();
		await this.entities.Migration.applyAll(modulesMigrations);
	}
}

module.exports = {
	clearDatabaseTable,
	StorageSandbox,
};
