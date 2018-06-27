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

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const sql = require('../sql').migrations;
const { sqlRoot } = require('../sql/config');

/**
 * Database migrations interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires fs-extra
 * @requires path
 * @requires db/sql/config
 * @requires db/sql/index.migrations
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a MigrationsRepository
 */
class MigrationsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
		this.inTransaction = !!(db.ctx && db.ctx.inTransaction);
	}

	/**
	 * Verifies presence of the 'migrations' OID named relation.
	 *
	 * @returns {Promise<boolean>} Promise object that resolves with a boolean.
	 */
	hasMigrations() {
		return this.db.proc(
			'to_regclass',
			'migrations',
			a => (a ? !!a.to_regclass : false)
		);
	}

	/**
	 * Gets id of the last migration record, or 0, if none exist.
	 *
	 * @returns {Promise<number>}
	 * Promise object that resolves with either 0 or id of the last migration record.
	 */
	getLastId() {
		return this.db.oneOrNone(sql.getLastId, [], a => (a ? +a.id : 0));
	}

	/**
	 * Executes 'migrations/runtime.sql' file, to set peers clock to null and state to 1.
	 *
	 * @returns {Promise<null>} Promise object that resolves with `null`.
	 */
	applyRuntime() {
		// Must use a transaction here when not in one:
		const job = t => t.none(sql.runtime);
		return this.inTransaction ? job(this.db) : this.db.tx('applyRuntime', job);
	}

	/**
	 * Reads 'sql/migrations/updates' folder and returns an array of objects for further processing.
	 *
	 * @param {number} lastMigrationId
	 * @returns {Promise<Array<Object>>}
	 * Promise object that resolves with an array of objects `{id, name, path, file}`.
	 */
	readPending(lastMigrationId) {
		const updatesPath = path.join(sqlRoot, 'migrations/updates');
		return fs.readdir(updatesPath).then(files =>
			files
				.map(f => {
					const m = f.match(/(\d+)_(.+).sql/);
					return (
						m && {
							id: m[1],
							name: m[2],
							path: path.join(updatesPath, f),
						}
					);
				})
				.sort((a, b) => a.id - b.id) // Sort by migration ID, ascending
				.filter(
					f =>
						f &&
						fs.statSync(f.path).isFile() &&
						(!lastMigrationId || +f.id > lastMigrationId)
				)
				.map(f => {
					f.file = new this.pgp.QueryFile(f.path, {
						minify: true,
						noWarnings: true,
					});
					return f;
				})
		);
	}

	/**
	 * Applies a cumulative update: all pending migrations + runtime.
	 * Each update+insert execute within their own SAVEPOINT, to ensure data integrity on the updates level.
	 *
	 * @returns {Promise} Promise object that resolves with `undefined`.
	 */
	applyAll() {
		return this.db.task('migrations:applyAll', t1 =>
			t1.migrations
				.hasMigrations()
				.then(hasMigrations => (hasMigrations ? t1.migrations.getLastId() : 0))
				.then(lastId => t1.migrations.readPending(lastId))
				.then(updates =>
					Promise.mapSeries(updates, u => {
						const tag = `update:${u.name}`;
						return t1.tx(tag, t2 =>
							t2.none(u.file).then(() => t2.none(sql.add, u))
						);
					})
				)
				.then(() => t1.migrations.applyRuntime())
		);
	}
}

module.exports = MigrationsRepository;
