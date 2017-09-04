'use strict';

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
		logger.err('Failed to clear database table: ' + table);
		throw err;
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
	waitUntilBlockchainReady: waitUntilBlockchainReady
};
