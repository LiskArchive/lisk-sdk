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
const Promise = require('bluebird');
const rewire = require('rewire');
const pgpLib = require('pg-promise');

const database = rewire('../../db');

const inTest = process.env.NODE_ENV === 'test';

const dbNames = [];

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} db
 * @param {function} cb
 */
function clearDatabaseTable(db, logger, table, cb) {
	db
		.query(`DELETE FROM ${table}`)
		.then(result => {
			cb(null, result);
		})
		.catch(err => {
			console.error(`Failed to clear database table: ${table}`);
			throw err;
		});
}

function DBSandbox(dbConfig, dbName) {
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

DBSandbox.prototype.create = function(cb) {
	child_process.exec(`dropdb ${this.dbConfig.database}`, () => {
		child_process.exec(`createdb ${this.dbConfig.database}`, () => {
			database
				.connect(this.dbConfig, console)
				.then(db => {
					return cb(null, db);
				})
				.catch(err => {
					return cb(err);
				});
		});
	});
};

DBSandbox.prototype.destroy = function(logger) {
	database.disconnect(logger);
	this.dbConfig.database = this.originalDbName;
};

function createStubbedDBObject(dbConfig, stubbedObject) {
	const initOptions = {
		capSQL: true,
		promiseLib: Promise,
		extend: object => {
			Object.assign(object, stubbedObject);
		},
		noLocking: inTest,
	};

	const pgp = pgpLib(initOptions);
	return pgp(dbConfig);
}

module.exports = {
	clearDatabaseTable,
	DBSandbox,
	createStubbedDBObject,
};
