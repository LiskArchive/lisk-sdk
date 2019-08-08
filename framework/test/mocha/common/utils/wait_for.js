/*
 * Copyright © 2019 Lisk Foundation
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

const popsicle = require('popsicle');
const async = require('async');
const Promise = require('bluebird');
const apiHelpers = require('../helpers/api');
const { BlockSlots } = require('../../../../src/modules/chain/dpos');

const { ACTIVE_DELEGATES } = global.constants;

const slots = new BlockSlots({
	epochTime: __testContext.config.constants.EPOCH_TIME,
	interval: __testContext.config.constants.BLOCK_TIME,
	blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
});

/**
 * @param {number} [retries=10] retries
 * @param {number} [timeout=200] timeout
 * @param {string} [baseUrl='http://localhost:5000'] timeout
 * @param {function} cb
 */
function blockchainReady(retries, timeout, baseUrl, doNotLogRetries, cb) {
	if (!retries) {
		retries = 10;
	}
	if (!timeout) {
		timeout = 1000;
	}

	process.on('SIGINT', () => {
		console.info('SIGINT received, pid: ', process.pid);
		process.exit(1);
	});

	const totalRetries = retries;

	baseUrl = baseUrl || __testContext.baseUrl;

	// eslint-disable-next-line wrap-iife
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
								1000.0} seconds...`,
						);
					}
					return setTimeout(() => {
						fetchBlockchainStatus();
					}, timeout);
				}
				if (res.data.loaded) {
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
								1000.0} seconds...`,
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

function newBlock(height, blocksToWait, baseUrl, cb) {
	if (blocksToWait === 0) {
		return setImmediate(cb, null, height);
	}

	let counter = 1;
	const target = height + blocksToWait;

	return async.doWhilst(
		doWhilstCb => {
			const request = popsicle.get(
				`${baseUrl || __testContext.baseUrl}/api/node/status`,
			);

			request.use(popsicle.plugins.parse(['json']));

			request.then(res => {
				if (res.status !== 200) {
					return doWhilstCb(
						['Received bad response code', res.status, res.url].join(' '),
					);
				}
				__testContext.debug(
					'Waiting for block:'.grey,
					'Height:'.grey,
					res.body.data.height,
					'Target:'.grey,
					target,
					'Second:'.grey,
					counter++,
				);
				height = res.body.data.height;
				return setTimeout(doWhilstCb, 1000);
			});

			request.catch(err => doWhilstCb(err));
		},
		() => height < target,
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, height);
		},
	);
}

function nodeStatus(baseUrl, cb) {
	const request = popsicle.get(
		`${baseUrl || __testContext.baseUrl}/api/node/status`,
	);

	request.use(popsicle.plugins.parse(['json']));

	request.then(res => {
		if (res.status !== 200) {
			return setImmediate(
				cb,
				['Received bad response code', res.status, res.url].join(' '),
			);
		}
		return setImmediate(cb, null, res.body.data);
	});

	request.catch(err => setImmediate(cb, err));
}
// Returns current block height
function getHeight(baseUrl, cb) {
	nodeStatus(baseUrl, (err, res) => {
		if (err) {
			return setImmediate(cb, err);
		}
		return setImmediate(cb, null, res.height);
	});
}

// Run callback on new round
function newRound(baseUrl, cb) {
	getHeight(baseUrl, (err, height) => {
		if (err) {
			return cb(err);
		}
		const nextRound = slots.calcRound(height);
		const blocksToWait = nextRound * ACTIVE_DELEGATES - height;
		__testContext.debug('blocks to wait: '.grey, blocksToWait);
		return newBlock(height, blocksToWait, null, cb);
	});
}
// Waits for (n) blocks to be created
function blocks(blocksToWait, baseUrl, cb) {
	getHeight(baseUrl, (err, height) => {
		if (err) {
			return cb(err);
		}
		return newBlock(height, blocksToWait, baseUrl, cb);
	});
}

const blocksPromise = Promise.promisify(blocks);

function confirmations(transactions, limitHeight) {
	limitHeight = limitHeight || 15;

	function checkConfirmations(transactionsToCheck) {
		return Promise.all(
			transactionsToCheck.map(transactionId =>
				apiHelpers.getTransactionByIdPromise(transactionId),
			),
		).then(res =>
			Promise.each(res, result => {
				if (result.body.data.length === 0) {
					throw Error('Transaction not confirmed');
				}
			}),
		);
	}

	function waitUntilLimit(limit) {
		if (limit === 0) {
			throw new Error('Exceeded limit to wait for confirmations');
		}
		limit -= 1;

		return blocksPromise(1, null)
			.then(() => checkConfirmations(transactions))
			.catch(() => waitUntilLimit(limit));
	}

	// Wait a maximum of limitHeight*25 confirmed transactions
	return waitUntilLimit(limitHeight);
}

module.exports = {
	blockchainReady,
	newRound,
	blocks,
	blocksPromise,
	confirmations,
};
