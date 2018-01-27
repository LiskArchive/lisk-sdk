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

const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const sql = require('../sql').migrations;
const {sqlRoot} = require('../sql/config');

/**
 * @class
 * @private
 * @param {Object} pgp - pg promise
 * @param {Object} db - pg connection
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
	 * Reads 'sql/migrations/updates' folder and returns an array of QueryFile
	 * objects that need to be executed.
	 * @method
	 * @param {number} lastMigrationId
	 * @return {Promise<Array<{id, name, path, file}>>}
	 */
	readPending (lastMigrationId) {
		const migrationsPath = path.join(sqlRoot, 'migrations/updates');
		return new Promise((resolve, reject) => {
			fs.readdir(migrationsPath, (err, files) => {
				if (err) {
					reject(err);
				} else {
					resolve(files);
				}
			});
		})
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
					.forEach(f => {
						f.file = new this.pgp.QueryFile(f.path, {minify: true, noWarnings: true});
					});
			});
	}

	/**
	 * Creates and exasync.waterfallecute a db query for each pending migration.
	 * @method
	 * @param {Array} pendingMigrations
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error | appliedMigrations
	 */
	applyPending () {
		return this.db.tx('applyPending', function * (t1) {
			const hasMigrations = yield t1.migrations.hasMigrations();
			let lastId = 0;
			if(hasMigrations) {
				lastId = yield t1.migrations.getLastId();
			}
			const updates = yield t1.migrations.readPending(lastId);
			const savePoints = updates.map(u => {
				return t1.tx(u.name, function * (t2) {
					yield t2.none(u.file);
					yield t2.none(sql.add, u);
				});
			});
			yield t1.batch(savePoints);
		});
	}

	/**
	 * Executes 'runtime.sql' file, that set peers clock to null and state to 1.
	 * @method
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error
	 */
	applyRuntime () {
		return this.db.tx('applyRuntime', t => t.none(sql.runtime));
	}
}

module.exports = MigrationsRepository;
