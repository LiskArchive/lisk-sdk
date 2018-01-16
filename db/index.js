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

var async = require('async');
var bignum = require('../helpers/bignum');
var fs = require('fs');
var path = require('path');
var monitor = require('pg-monitor');
var repos = require('require-all')(__dirname + '/repos');

var pgOptions = {
	pgNative: true,

	// Extending the database protocol with our custom repositories;
	// API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
	extend: function (object, dc) {
		Object.keys(repos).forEach(function (repoName) {
			object[repoName] = new repos[repoName](object, pgp);
		});
	}
};
var pgp = require('pg-promise')(pgOptions);
var db;

/**
 * Stores all db queries created using pgp.QueryFile to avoid
 * "Creating a duplicate QueryFile object for the same file"
 * while running multiple times
 * @type {{}}
 */
var queryFilesCommands = {};

/**
 * Creates memoized QueryFile object
 * @param {string} sqlPath - Path to SQL file
 * @return {Object} Memoized QueryFile object
 */
var createQueryFile = function (sqlPath) {
	if (!queryFilesCommands[sqlPath]) {
		queryFilesCommands[sqlPath] = new pgp.QueryFile(sqlPath, {minify: true});
	}

	return queryFilesCommands[sqlPath];
};

// var isWin = /^win/.test(process.platform);
// var isMac = /^darwin/.test(process.platform);

/**
 * Migrator functions
 * @class
 * @private
 * @param {Object} pgp - pg promise
 * @param {Object} db - pg connection
 */
function Migrator (pgp, db) {

	/**
	 * Gets one record from `migrations` table
	 * @method
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error | Boolean
	 */
	this.checkMigrations = function (waterCb) {
		db.one('SELECT to_regclass(\'migrations\')').then(function (row) {
			return waterCb(null, Boolean(row.to_regclass));
		}).catch(function (err) {
			return waterCb(err);
		});
	};

	/**
	 * Gets last migration record from `migrations` table.
	 * @method
	 * @param {boolean} hasMigrations
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error | row data
	 */
	this.getLastMigration = function (hasMigrations, waterCb) {
		if (!hasMigrations) {
			return waterCb(null, null);
		}
		db.query('SELECT * FROM migrations ORDER BY "id" DESC LIMIT 1').then(function (rows) {
			if (rows[0]) {
				rows[0].id = new bignum(rows[0].id);
			}
			return waterCb(null, rows[0]);
		}).catch(function (err) {
			return waterCb(err);
		});
	};

	/**
	 * Reads folder `sql/migrations` and returns files rather than
	 * lastMigration id.
	 * @method
	 * @param {Object} lastMigration
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error | pendingMigrations
	 */
	this.readPendingMigrations = function (lastMigration, waterCb) {
		var migrationsPath = path.join(process.cwd(), './db/sql/init/migrations');
		var pendingMigrations = [];

		function matchMigrationName (file) {
			var name = file.match(/_.+\.sql$/);

			return Array.isArray(name) ? name[0].replace(/_/, '').replace(/\.sql$/, '') : null;
		}

		function matchMigrationId (file) {
			var id = file.match(/^[0-9]+/);

			return Array.isArray(id) ? new bignum(id[0]) : null;
		}

		fs.readdir(migrationsPath, function (err, files) {
			if (err) {
				return waterCb(err);
			}

			files.map(function (file) {
				return {
					id: matchMigrationId(file),
					name: matchMigrationName(file),
					path: path.join(migrationsPath, file)
				};
			}).filter(function (file) {
				return (
					(file.id && file.name) && fs.statSync(file.path).isFile() && /\.sql$/.test(file.path)
				);
			}).forEach(function (file) {
				if (!lastMigration || file.id.greaterThan(lastMigration.id)) {
					pendingMigrations.push(file);
				}
			});

			return waterCb(null, pendingMigrations);
		});
	};

	/**
	 * Creates and execute a db query for each pending migration.
	 * @method
	 * @param {Array} pendingMigrations
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error | appliedMigrations
	 */
	this.applyPendingMigrations = function (pendingMigrations, waterCb) {
		var appliedMigrations = [];


		async.eachSeries(pendingMigrations, function (file, eachCb) {
			var queryFile = createQueryFile(file.path);
			db.query(queryFile).then(function () {
				appliedMigrations.push(file);
				return eachCb();
			}).catch(function (err) {
				return eachCb(err);
			});
		}, function (err) {
			return waterCb(err, appliedMigrations);
		});
	};

	/**
	 * Inserts into `migrations` table the previous applied migrations.
	 * @method
	 * @param {Array} appliedMigrations
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error
	 */
	this.insertAppliedMigrations = function (appliedMigrations, waterCb) {
		async.eachSeries(appliedMigrations, function (file, eachCb) {
			db.query('INSERT INTO migrations(id, name) VALUES($1, $2) ON CONFLICT DO NOTHING', [file.id.toString(), file.name]).then(function () {
				return eachCb();
			}).catch(function (err) {
				return eachCb(err);
			});
		}, function (err) {
			return waterCb(err);
		});
	};

	/**
	 * Executes 'runtime.sql' file, that set peers clock to null and state to 1.
	 * @method
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error
	 */
	this.applyRuntimeQueryFile = function (waterCb) {
		var runtimeQueryPath = path.join(process.cwd(), './db/sql/init/runtime.sql');
		var queryFile = createQueryFile(runtimeQueryPath);
		db.query(queryFile).then(function () {
			return waterCb();
		}).catch(function (err) {
			return waterCb(err);
		});
	};
}

/**
 * Connects to the database and performs:
 * - checkMigrations
 * - getLastMigration
 * - readPendingMigrations
 * - applyPendingMigrations
 * - insertAppliedMigrations
 * - applyRuntimeQueryFile
 * @memberof module:helpers
 * @requires pg-promise
 * @requires pg-monitor
 * @implements Migrator
 * @function connect
 * @param {Object} config
 * @param {function} logger
 * @param {function} cb
 * @return {function} error|cb
 */
module.exports.connect = function (config, logger, cb) {
	try {
		monitor.detach();
	} catch (ex) {}

	monitor.attach(pgOptions, config.logEvents);
	monitor.setTheme('matrix');

	monitor.log = function (msg, info){
		logger.log(info.event, info.text);
		info.display = false;
	};

	config.user = config.user || process.env.USER;

	pgp.end();
	db = pgp(config);

	var migrator = new Migrator(pgp, db);

	async.waterfall([
		migrator.checkMigrations,
		migrator.getLastMigration,
		migrator.readPendingMigrations,
		migrator.applyPendingMigrations,
		migrator.insertAppliedMigrations,
		migrator.applyRuntimeQueryFile
	], function (err) {
		return cb(err, db);
	});
};

/**
 * Detaches pg-monitor. Should be invoked after connect.
 * @param {Object} logger
 */
module.exports.disconnect = function (logger) {
	logger = logger || console;
	try {
		monitor.detach();
	} catch (ex) {
		logger.log('database disconnect exception - ', ex);
	}
};

module.exports.createQueryFile = createQueryFile;
