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

var popsicle = require('popsicle');
var async = require('async');
var Promise = require('bluebird');
var slots = require('../../../helpers/slots');
var apiHelpers = require('../helpers/api');

const { ACTIVE_DELEGATES } = global.constants;

/**
 * @param {function} cb
 * @param {number} [retries=10] retries
 * @param {number} [timeout=200] timeout
 * @param {string} [baseUrl='http://localhost:5000'] timeout
 */
function blockchainReady(cb, retries, timeout, baseUrl, doNotLogRetries) {
	if (!retries) {
		retries = 10;
	}
	if (!timeout) {
		timeout = 1000;
	}

	const totalRetries = retries;

	baseUrl =
		baseUrl ||
		`http://${__testContext.config.address}:${__testContext.config.httpPort}`;
	(function fetchBlockchainStatus() {
		popsicle
			.get(`${baseUrl}/api/node/status`)
			.then(res => {
				retries -= 1;
				res = JSON.parse(res.body);
				if (!res.data.loaded && retries >= 0) {
					if (!doNotLogRetries) {
						__testContext.debug(
							`Retrying ${totalRetries -
								retries} time loading blockchain in next ${timeout /
								1000.0} seconds...`
						);
					}
					return setTimeout(() => {
						fetchBlockchainStatus();
					}, timeout);
				} else if (res.data.loaded) {
					return cb();
				}
				return cb('Failed to load blockchain');
			})
			.catch(() => {
				retries -= 1;
				if (retries >= 0) {
					if (!doNotLogRetries) {
						__testContext.debug(
							`Retrying ${totalRetries -
								retries} time loading blockchain in next ${timeout /
								1000.0} seconds...`
						);
					}
					return setTimeout(() => {
						fetchBlockchainStatus();
					}, timeout);
				}
				return cb('Server is not responding');
			});
	})();
}

function nodeStatus(cb, baseUrl) {
	var request = popsicle.get(
		`${baseUrl || __testContext.baseUrl}/api/node/status`
	);

	request.use(popsicle.plugins.parse(['json']));

	request.then(res => {
		if (res.status !== 200) {
			return setImmediate(
				cb,
				['Received bad response code', res.status, res.url].join(' ')
			);
		}
		return setImmediate(cb, null, res.body.data);
	});

	request.catch(err => {
		return setImmediate(cb, err);
	});
}
// Returns current block height
function getHeight(cb, baseUrl) {
	nodeStatus((err, res) => {
		if (err) {
			return setImmediate(cb, err);
		}
		return setImmediate(cb, null, res.height);
	}, baseUrl);
}

// Run callback on new round
function newRound(cb, baseUrl) {
	getHeight((err, height) => {
		if (err) {
			return cb(err);
		}
		var nextRound = slots.calcRound(height);
		var blocksToWait = nextRound * ACTIVE_DELEGATES - height;
		__testContext.debug('blocks to wait: '.grey, blocksToWait);
		newBlock(height, blocksToWait, cb);
	}, baseUrl);
}

// Waits for (n) blocks to be created
function blocks(blocksToWait, cb, baseUrl) {
	getHeight((err, height) => {
		if (err) {
			return cb(err);
		}
		newBlock(height, blocksToWait, cb, baseUrl);
	}, baseUrl);
}

function newBlock(height, blocksToWait, cb, baseUrl) {
	if (blocksToWait === 0) {
		return setImmediate(cb, null, height);
	}

	var counter = 1;
	var target = height + blocksToWait;

	async.doWhilst(
		cb => {
			var request = popsicle.get(
				`${baseUrl || __testContext.baseUrl}/api/node/status`
			);

			request.use(popsicle.plugins.parse(['json']));

			request.then(res => {
				if (res.status !== 200) {
					return cb(
						['Received bad response code', res.status, res.url].join(' ')
					);
				}
				__testContext.debug(
					'Waiting for block:'.grey,
					'Height:'.grey,
					res.body.data.height,
					'Target:'.grey,
					target,
					'Second:'.grey,
					counter++
				);
				height = res.body.data.height;
				setTimeout(cb, 1000);
			});

			request.catch(err => {
				return cb(err);
			});
		},
		() => {
			return height < target;
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, height);
		}
	);
}

function confirmations(transactions, limitHeight) {
	limitHeight = limitHeight || 15;

	function checkConfirmations(transactions) {
		return Promise.all(
			transactions.map(transactionId => {
				return apiHelpers.getTransactionByIdPromise(transactionId);
			})
		).then(res => {
			return Promise.each(res, result => {
				if (result.body.data.length === 0) {
					throw Error('Transaction not confirmed');
				}
			});
		});
	}

	function waitUntilLimit(limit) {
		if (limit == 0) {
			throw new Error('Exceeded limit to wait for confirmations');
		}
		limit -= 1;

		return blocksPromise(1)
			.then(() => {
				return checkConfirmations(transactions);
			})
			.catch(() => {
				return waitUntilLimit(limit);
			});
	}

	// Wait a maximum of limitHeight*25 confirmed transactions
	return waitUntilLimit(limitHeight);
}

var blocksPromise = Promise.promisify(blocks);

module.exports = {
	blockchainReady,
	newRound,
	blocks,
	blocksPromise,
	confirmations,
};
