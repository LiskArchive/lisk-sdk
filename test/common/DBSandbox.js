var child_process = require('child_process');

var database = require('../../helpers/database.js');

var testDatabaseNames = [];

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} db
 * @param {function} cb
 */
function clearDatabaseTable (db, logger, table, cb) {
	db.query('DELETE FROM ' + table).then(function (result) {
		cb(null, result);
	}).catch(function (err) {
		console.error('Failed to clear database table: ' + table);
		throw err;
	});
}

function DBSandbox (dbConfig, testDatabaseName) {
	this.dbConfig = dbConfig;
	this.originalDatabaseName = dbConfig.database;
	this.testDatabaseName = testDatabaseName || this.originalDatabaseName;
	this.dbConfig.database = this.testDatabaseName;
	testDatabaseNames.push(this.testDatabaseName);

	var dropCreatedDatabases = function () {
		testDatabaseNames.forEach(function (testDatabaseName) {
			child_process.exec('dropdb ' + testDatabaseName);
		});
	};

	process.on('exit', function () {
		dropCreatedDatabases();
	});
}

DBSandbox.prototype.create = function (cb) {
	child_process.exec('dropdb ' + this.dbConfig.database, function () {
		child_process.exec('createdb ' + this.dbConfig.database, function () {
			database.connect(this.dbConfig, console, cb);
		}.bind(this));
	}.bind(this));
};

DBSandbox.prototype.destroy = function (logger) {
	database.disconnect(logger);
	this.dbConfig.database = this.originalDatabaseName;
};

module.exports = {
	clearDatabaseTable: clearDatabaseTable,
	DBSandbox: DBSandbox,
};
