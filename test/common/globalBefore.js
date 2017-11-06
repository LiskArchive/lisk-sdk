'use strict';

var async = require('async');
var child_process = require('child_process');
var popsicle = require('popsicle');

var config = require('../../config.json');
var database = require('../../helpers/database.js');
var genesisblock = require('../genesisBlock.json');
var ed = require('../../helpers/ed.js');
var z_schema = require('../../helpers/z_schema.js');

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

/**
 * @param {function} cb
 * @param {number} [retries=10] retries
 * @param {number} [timeout=200] timeout
 * @param {string} [baseUrl='http://localhost:5000'] timeout
 */
function waitUntilBlockchainReady (cb, retries, timeout, baseUrl) {
	if (!retries) {
		retries = 10;
	}
	if (!timeout) {
		timeout = 1000;
	}

	baseUrl = baseUrl || 'http://' + config.address + ':' + config.httpPort;
	(function fetchBlockchainStatus () {
		popsicle.get(baseUrl + '/api/node/status')
			.then(function (res) {
				retries -= 1;
				res = JSON.parse(res.body);
				if (!res.loaded && retries >= 0) {
					return setTimeout(function () {
						fetchBlockchainStatus();
					}, timeout);
				}
				else if (res.loaded) {
					return cb();
				}
				return cb('Failed to load blockchain');
			})
			.catch(function (err) {
				retries -= 1;
				if (retries >= 0) {
					return setTimeout(function () {
						fetchBlockchainStatus();
					}, timeout);
				} else {
					return cb('Server is not responding');
				}

			});
	})();
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
