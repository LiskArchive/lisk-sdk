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

const child_process = require('child_process');
const storage = require('../../storage');

const dbNames = [];

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} db
 * @param {function} cb
 */

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} db
 * @param {function} cb
 */
function clearDatabaseTable(storageInstance, logger, table) {
	return new Promise((resolve, reject) => {
		storageInstance.adapter.db
			.query(`DELETE FROM ${table}`)
			.then(result => {
				return resolve(result);
			})
			.catch(err => {
				logger.error(`Failed to clear database table: ${table}`);
				return reject(err);
			});
	});
}

class StorageSandbox {
	constructor(dbConfig, dbName) {
		this.dbConfig = dbConfig;
		this.originalDbName = dbConfig.database;
		this.dbName = dbName || this.originalDbName;
		this.dbConfig.database = this.dbName;
		dbNames.push(this.dbName);

		const dropCreatedDatabases = function() {
			dbNames.forEach(aDbName => {
				child_process.exec(`dropdb ${aDbName}`);
			});
		};

		process.on('exit', () => {
			dropCreatedDatabases();
		});
	}

	dropDB() {
		return new Promise(resolve => {
			child_process.exec(`dropdb ${this.dbConfig.database}`, () => {
				return resolve();
			});
		});
	}

	createDB() {
		return new Promise((resolve, reject) => {
			child_process.exec(`createdb ${this.dbConfig.database}`, error => {
				if (error) {
					return reject(error);
				}
				return resolve();
			});
		});
	}

	async create() {
		try {
			await this.dropDB();
			await this.createDB();
			const storageSandbox = storage(this.dbConfig, this.dbConfig.logger);
			await storageSandbox.bootstrap();
			return storageSandbox;
		} catch (err) {
			return new Error(err);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	async createSchema() {
		// run migrations for creating db tables
	}

	destroy(logger) {
		storage.disconnect(logger);
		this.dbConfig.database = this.originalDbName;
	}
}

module.exports = {
	clearDatabaseTable,
	StorageSandbox,
};
