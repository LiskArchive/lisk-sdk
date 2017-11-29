'use strict';

var async = require('async');
var popsicle = require('popsicle');

var config = require('../../config.json');
var genesisblock = require('../genesisBlock.json');
var ed = require('../../helpers/ed.js');
var z_schema = require('../../helpers/z_schema.js');

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
				if (!res.data.loaded && retries >= 0) {
					return setTimeout(function () {
						fetchBlockchainStatus();
					}, timeout);
				}
				else if (res.data.loaded) {
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
	waitUntilBlockchainReady: waitUntilBlockchainReady
};
