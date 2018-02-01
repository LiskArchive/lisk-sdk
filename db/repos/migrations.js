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
const sql = require('../sql').migrations;
const { sqlRoot } = require('../sql/config');

/**
 * Database migrations interaction class.
 *
 * @class
 * @memberof db.repos
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} - An instance of a MigrationsRepository
 */
class MigrationsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
		this.inTransaction = db.ctx && db.ctx.inTransaction;
	}

	/**
	 * Verifies presence of the 'migrations' OID named relation.
	 *
	 * @return {Promise<boolean>}
	 * @todo Add description for the return value
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
	 * @return {Promise<number>}
	 * @todo Add description for the return value
	 */
	getLastId() {
		return this.db.oneOrNone(sql.getLastId, [], a => (a ? +a.id : 0));
	}

	/**
	 * Executes 'migrations/runtime.sql' file, to set peers clock to null and state to 1.
	 *
	 * @return {Promise<null>}
	 * @todo Add description for the return value
	 */
	applyRuntime() {
		// Must use a transaction here when not in one:
		const job = t => t.none(sql.runtime);
		return this.inTransaction ? job(this.db) : this.db.tx('applyRuntime', job);
	}

	/**
	 * Executes 'migrations/memoryTables.sql' file, to create and configure all memory tables.
	 *
	 * @return {Promise<null>}
	 * @todo Add description for the return value
	 */
	createMemoryTables() {
		// Must use a transaction here when not in one:
		const job = t => t.none(sql.memoryTables);
		return this.inTransaction
			? job(this.db)
			: this.db.tx('createMemoryTables', job);
	}

	/**
	 * Reads 'sql/migrations/updates' folder and returns an array of objects for further processing.
	 *
	 * @param {number} lastMigrationId
	 * @return {Promise<Array<{id, name, path, file}>>}
	 * @todo Add descriptions for the params and the return value
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
	 * @return {Promise}
	 * @todo Add description for the return value
	 */
	applyAll() {
		return this.db.tx('applyAll', function*(t1) {
			const hasMigrations = yield t1.migrations.hasMigrations();
			const lastId = hasMigrations ? yield t1.migrations.getLastId() : 0;
			const updates = yield t1.migrations.readPending(lastId);
			for (let i = 0; i < updates.length; i++) {
				const u = updates[i];
				const tag = `update:${u.name}`;
				yield t1.tx(tag, function*(t2) {
					yield t2.none(u.file);
					yield t2.none(sql.add, u);
				});
			}
			yield t1.migrations.applyRuntime();
		});
	}
}

module.exports = MigrationsRepository;
