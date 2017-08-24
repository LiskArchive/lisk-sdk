'use strict';

var async = require('async');
var popsicle = require('popsicle');
var config = require('../../config.json');


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
		if (logger) {
			logger.err('Failed to clear database table: ' + table);
		} else {
			console.error('Failed to clear database table: ' + table);
		}
		throw err;
	});
}

/**
 * @param {Object} db
 * @param {Function} cb
 */
function recreateZeroState (db, logger, cb) {
	async.every([
		'blocks where height > 1',
		'trs where "blockId" != \'6524861224470851795\'',
		'mem_accounts where address in (\'2737453412992791987L\', \'2896019180726908125L\')',
		'forks_stat',
		'votes where "transactionId" = \'17502993173215211070\''
	], function (table, cb) {
		clearDatabaseTable(db, logger, table, cb);
	}, function (err) {
		if (err) {
			return setImmediate(err);
		}
		return setImmediate(cb);
	});
}

/**
 * @param {Function} cb
 * @param {Number} [retries=10] retries
 * @param {Number} [timeout=200] timeout
 * @param {String} [baseUrl='http://localhost:5000'] timeout
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
		popsicle.get(baseUrl + '/api/loader/status')
			.then(function (res) {
				retries -= 1;
				res = JSON.parse(res.body);
				if (!res.loaded && retries >= 0) {
					return setTimeout(function () {
						fetchBlockchainStatus();
					}, timeout);
				}
				else if (res.success && res.loaded) {
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

module.exports = {
	clearDatabaseTable: clearDatabaseTable,
	recreateZeroState: recreateZeroState,
	waitUntilBlockchainReady: waitUntilBlockchainReady
};
