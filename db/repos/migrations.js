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
const {sqlRoot} = require('../sql/config');

/**
 * Migrations database interaction module
 * @memberof module:migrations
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {MigrationsRepository}
 */
class MigrationsRepository {

	constructor (db, pgp) {
		this.db = db;
		this.pgp = pgp;
	}

	/**
	 * Verifies presence of the 'migrations' OID named relation
	 * @method
	 * @return {Promise<boolean>}
	 */
	hasMigrations () {
		return this.db.proc('to_regclass', 'migrations', a => a ? !!a.to_regclass: false);
	}

	/**
	 * Gets id of the last migration record, or 0, if none exist.
	 * @method
	 * @return {Promise<number>}
	 */
	getLastId () {
		return this.db.oneOrNone(sql.getLastId, [], a => a ? +a.id : 0);
	}

	/**
	 * Reads 'sql/migrations/updates' folder and returns an array of objects for further processing.
	 * @method
	 * @param {number} lastMigrationId
	 * @return {Promise<Array<{id, name, path, file}>>}
	 */
	readPending (lastMigrationId) {
		const migrationsPath = path.join(sqlRoot, 'migrations/updates');
		return fs.readdir(migrationsPath)
			.then(files => {
				return files
					.map(f => {
						const m = f.match(/(\d+)_(\S+).sql/);
						return m && {
							id: m[1],
							name: m[2],
							path: path.join(migrationsPath, f)
						};
					})
					.filter(f => f && fs.statSync(f.path).isFile() && (!lastMigrationId || +f.id > lastMigrationId))
					.map(f => {
						f.file = new this.pgp.QueryFile(f.path, {minify: true, noWarnings: true});
						return f;
					});
			});
	}

	/**
	 * Applies all pending migration updates.
	 *
	 * Each update+insert execute within their own SAVEPOINT, to ensure data integrity on the updates level.
	 * @method
	 * @return {Promise}
	 */
	applyUpdates () {
		return this.db.tx('applyUpdates', function * (t1) {
			const hasMigrations = yield t1.migrations.hasMigrations();
			const lastId = hasMigrations ? yield t1.migrations.getLastId() : 0;
			const updates = yield t1.migrations.readPending(lastId);
			for(let i = 0;i < updates.length;i ++) {
				const u = updates[i], tag = 'update:' + u.name;
				yield t1.tx(tag, function * (t2) {
					yield t2.none(u.file);
					yield t2.none(sql.add, u);
				});
			}
		});
	}

	/**
	 * Executes 'migrations/runtime.sql' file, to set peers clock to null and state to 1.
	 * @method
	 * @return {Promise<null>}
	 */
	applyRuntime () {
		// we use a transaction here, because migrations/runtime.sql
		// contains multiple sql statements:
		return this.db.tx('applyRuntime', t => t.none(sql.runtime));
	}
}

module.exports = MigrationsRepository;
