'use strict';

var node = require('./../node.js');
var child_process = require('child_process');
var testDatabaseNames = [];

var config = require('../../config.json');
var database = require('../../helpers/database.js');
var genesisblock = require('../genesisBlock.json');
var ed = require('../../helpers/ed.js');

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} db
 * @param {Function} cb
 */
function clearDatabaseTable (db, logger, table, cb) {
	db.query('DELETE FROM ' + table).then(function (result) {
		cb(null, result);
	}).catch(function (err) {
		logger.err('Failed to clear database table: ' + table);
		throw err;
	});
}

/**
 * @param {Function} cb
 * @param {Number} [retries=10] retries
 * @param {Number} [timeout=200] timeout
 */
function waitUntilBlockchainReady (cb, retries, timeout) {
	if (!retries) {
		retries = 10;
	}
	if (!timeout) {
		timeout = 1000;
	}
	(function fetchBlockchainStatus () {
		node.get('/api/loader/status', function (err, res) {
			node.expect(err).to.not.exist;
			retries -= 1;
			if (!res.body.loaded && retries >= 0) {
				return setTimeout(function () {
					fetchBlockchainStatus();
				}, timeout);
			}
			else if (res.body.success && res.body.loaded) {
				return cb();
			}
			return cb('Failed to load blockchain');
		});
	})();
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
	waitUntilBlockchainReady: waitUntilBlockchainReady
};
