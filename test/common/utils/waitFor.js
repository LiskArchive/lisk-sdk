'use strict';

var popsicle = require('popsicle');
var async = require('async');
var Promise = require('bluebird');

var test = require('../../test');
var config = require('../../data/config.json');

var slots = require('../../../helpers/slots');
var apiHelpers = require('../helpers/api');

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

// Run callback on new round
function newRound (cb) {
	getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			var nextRound = slots.calcRound(height);
			var blocksToWait = nextRound * slots.delegates - height;
			test.debug('blocks to wait: '.grey, blocksToWait);
			newBlock(height, blocksToWait, cb);
		}
	});
};

// Waits for (n) blocks to be created
function blocks (blocksToWait, cb) {
	getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			newBlock(height, blocksToWait, cb);
		}
	});
};

var blocksPromise = Promise.promisify(blocks);

function newBlock (height, blocksToWait, cb) {
	if (blocksToWait === 0) {
		return setImmediate(cb, null, height);
	}

	var actualHeight = height;
	var counter = 1;
	var target = height + blocksToWait;

	async.doWhilst(
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

function confirmations (transactions, limitHeight) {
	limitHeight = limitHeight || 15;

	function checkConfirmations (transactions) {
		return Promise.all(transactions.map(function (transactionId) {
			return apiHelpers.getTransactionByIdPromise(transactionId);
		})).then(function (res) {
			return Promise.each(res, function (result) {
				if (result.body.data.length === 0) {
					throw Error('Transaction not confirmed');
				}
			});
		});
	}

	function waitUntilLimit (limit) {
		if (limit == 0) {
			throw new Error('Exceeded limit to wait for confirmations');
		}
		limit -= 1;

		return blocksPromise(1)
			.then(function () {
				return checkConfirmations(transactions);
			})
			.catch(function () {
				return waitUntilLimit(limit);
			});
	}

	// Wait a maximum of limitHeight*25 confirmed transactions
	return waitUntilLimit(limitHeight);
}

module.exports = {
	blockchainReady: blockchainReady,
	newRound: newRound,
	blocks: blocks,
	confirmations: confirmations
};