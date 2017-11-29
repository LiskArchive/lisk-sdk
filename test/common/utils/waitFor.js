'use strict';

var test = require('../../test');
var node = require('../../node.js');

var popsicle = require('popsicle');

var config = require('../../data/config.json');

var slots = require('../../../helpers/slots.js');

/**
 * @param {function} cb
 * @param {number} [retries=10] retries
 * @param {number} [timeout=200] timeout
 * @param {string} [baseUrl='http://localhost:5000'] timeout
 */
function blockchainReady (cb, retries, timeout, baseUrl) {
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

// Run callback on new round
function newRound (cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			var nextRound = slots.calcRound(height);
			var blocksToWait = nextRound * slots.delegates - height;
			test.debug('blocks to wait: '.grey, blocksToWait);
			waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

// Returns current block height
function getHeight (cb) {
	var request = popsicle.get(test.baseUrl + '/api/node/status');

	request.use(popsicle.plugins.parse(['json']));

	request.then(function (res) {
		if (res.status !== 200) {
			return setImmediate(cb, ['Received bad response code', res.status, res.url].join(' '));
		} else {
			return setImmediate(cb, null, res.body.data.height);
		}
	});

	request.catch(function (err) {
		return setImmediate(cb, err);
	});
};

// Waits for (n) blocks to be created
function blocks (blocksToWait, cb) {
	getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

function waitForNewBlock (height, blocksToWait, cb) {
	if (blocksToWait === 0) {
		return setImmediate(cb, null, height);
	}

	var actualHeight = height;
	var counter = 1;
	var target = height + blocksToWait;

	node.async.doWhilst(
		function (cb) {
			var request = popsicle.get(test.baseUrl + '/api/node/status');

			request.use(popsicle.plugins.parse(['json']));

			request.then(function (res) {
				if (res.status !== 200) {
					return cb(['Received bad response code', res.status, res.url].join(' '));
				}

				test.debug('	Waiting for block:'.grey, 'Height:'.grey, res.body.data.height, 'Target:'.grey, target, 'Second:'.grey, counter++);

				if (target === res.body.data.height) {
					height = res.body.data.height;
				}

				setTimeout(cb, 1000);
			});

			request.catch(function (err) {
				return cb(err);
			});
		},
		function () {
			return actualHeight >= height;
		},
		function (err) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, height);
			}
		}
	);
};

module.exports = {
	blockchainReady: blockchainReady,
	newRound: newRound,
	blocks: blocks
};