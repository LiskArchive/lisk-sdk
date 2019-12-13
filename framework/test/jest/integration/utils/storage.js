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

const childProcess = require('child_process');
const { Storage } = require('../../../../src/components/storage');

// Custom entities
const {
	Account,
	Block,
	RoundDelegates,
	Transaction,
} = require('../../../../src/modules/chain/components/storage/entities');

const {
	NetworkInfo,
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
	constructor(dbConfig) {
		if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
			throw new Error(
				`storage_sandbox is meant to be run in test environment only. NODE_ENV is: ${process.env.NODE_ENV}`,
			);
		}
		super(dbConfig, {});

		process.on('exit', async () => {
			await this._dropDB();
		});
	}

	async bootstrap() {
		await this._dropDB();
		await this._createDB();
		await super.bootstrap();

		this.registerEntity('Account', Account);
		this.registerEntity('Block', Block);
		this.registerEntity('Transaction', Transaction);

		// Custom entitties
		this.registerEntity('Migration', Migration);
		this.registerEntity('NetworkInfo', NetworkInfo);
		this.registerEntity('RoundDelegates', RoundDelegates);

		await this._createSchema();
		return true;
	}

	async cleanup() {
		super.cleanup();
		await this._dropDB();
	}

	_dropDB() {
		return new Promise(resolve => {
			childProcess.exec(`dropdb ${this.options.database}`, () => resolve());
		});
	}

	_createDB() {
		return new Promise((resolve, reject) => {
			childProcess.exec(`createdb ${this.options.database}`, error => {
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

const getAccount = async (storage, address) =>
	storage.entities.Account.getOne({ address }, { extended: true });

const getBlock = async (storage, blockId) =>
	storage.entities.Block.getOne({ id: blockId }, { extended: true });

const getTransaction = async (storage, id) =>
	storage.entities.Transaction.getOne({ id }, { extended: true });

const getTransactions = async (storage, filter) =>
	storage.entities.Transaction.get(filter, { extended: true });

module.exports = {
	clearDatabaseTable,
	StorageSandbox,
	getAccount,
	getBlock,
	getTransaction,
	getTransactions,
};
