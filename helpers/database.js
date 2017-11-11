'use strict';

var async = require('async');
var bignum = require('./bignum');
var fs = require('fs');
var path = require('path');
var monitor = require('pg-monitor');

var pgOptions = {
	pgNative: true
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

// var isWin = /^win/.test(process.platform);
// var isMac = /^darwin/.test(process.platform);

/**
 * Migrator functions
 * @class
 * @private
 * @param {Object} pgp - pg promise
 * @param {Object} db - pg connection
 * @param {Object} logger instance
 */
function Migrator (pgp, db, logger) {
	var self = this;

	/**
	 * Gets one record from `migrations` trable
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
	 * Gets last migration record from `migrations` trable.
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
	 * Reads folder `sql/migrations` and returns files grather than 
	 * lastMigration id.
	 * @method
	 * @param {Object} lastMigration
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error | pendingMigrations
	 */
	this.readPendingMigrations = function (lastMigration, waterCb) {
		var migrationsPath = path.join(process.cwd(), 'sql', 'migrations');
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
	 * Creates and execute a db query for each pending migration, insert migration to database.
	 * @method
	 * @param {Array} pendingMigrations 
	 * @param {function} cb - Callback function
	 * @return {function} cb with error
	 */
	this.applyPendingMigrations = function (pendingMigrations, cb) {
		async.eachSeries(pendingMigrations, function (file, eachCb) {
			if (!queryFilesCommands[file.path]) {
				queryFilesCommands[file.path] = new pgp.QueryFile(file.path, {minify: true});
			}
			logger.info('Performing database migration: ' + file.id.toString() + ' - ' + file.name + '...');
			db.query(queryFilesCommands[file.path]).then(function () {
				self.insertAppliedMigration(file, eachCb);
			}).catch(function (err) {
				return eachCb(err);
			});
		}, function (err) {
			return cb(err);
		});
	};

	/**
	 * Inserts into `migrations` table the previous applied migration.
	 * @method
	 * @param {Object} file - migration file details
	 * @param {function} cb - Callback function
	 * @return {function} cb with error
	 */
	this.insertAppliedMigration = function (file, cb) {
		db.query('INSERT INTO migrations(id, name) VALUES($1, $2)', [file.id.toString(), file.name]).then(function () {
			logger.info('Database migration applied: ' + file.id.toString() + ' - ' + file.name);
			return cb();
		}).catch(function (err) {
			return cb(err);
		});
	};

	/**
	 * Executes 'runtime.sql' file, that set peers clock to null and state to 1.
	 * @method
	 * @param {function} waterCb - Callback function
	 * @return {function} waterCb with error
	 */
	this.applyRuntimeQueryFile = function (waterCb) {
		var dirname = path.basename(__dirname) === 'helpers' ? path.join(__dirname, '..') : __dirname;
		var runtimeQueryPath = path.join(dirname, 'sql', 'runtime.sql');
		if (!queryFilesCommands[runtimeQueryPath]) {
			queryFilesCommands[runtimeQueryPath] = new pgp.QueryFile(path.join(dirname, 'sql', 'runtime.sql'), {minify: true});
		}
		db.query(queryFilesCommands[runtimeQueryPath]).then(function () {
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

	var migrator = new Migrator(pgp, db, logger);

	async.waterfall([
		migrator.checkMigrations,
		migrator.getLastMigration,
		migrator.readPendingMigrations,
		migrator.applyPendingMigrations,
		migrator.applyRuntimeQueryFile
	], function (err) {
		if (err) {
			logger.fatal('Database migrations failed, stopping application...', err);
			process.exit(0);
		}
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
