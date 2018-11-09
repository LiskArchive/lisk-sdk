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

const async = require('async');
const Promise = require('bluebird');
const waitUntilBlockchainReady = require('../../common/utils/wait_for')
	.blockchainReady;
const utils = require('../utils');

const SYNC_MODES = {
	RANDOM: 0,
	ALL_TO_FIRST: 1,
	ALL_TO_GROUP: 2,
};

const SYNC_MODE_DEFAULT_ARGS = {
	RANDOM: {
		probability: 0.5, // (0 - 1)
	},
	ALL_TO_GROUP: {
		indices: [],
	},
};

module.exports = {
	waitForAllNodesToBeReady(configurations, cb) {
		const retries = 20;
		const timeout = 3000;
		async.forEachOf(
			configurations,
			(configuration, index, eachCb) => {
				waitUntilBlockchainReady(
					eachCb,
					retries,
					timeout,
					`http://${configuration.ip}:${configuration.httpPort}`
				);
			},
			cb
		);
	},

	enableForgingForDelegates(configurations, cb) {
		const enableForgingPromises = [];
		configurations.forEach(configuration => {
			configuration.forging.delegates.map(keys => {
				if (!configuration.forging.force) {
					const enableForgingPromise = utils.http.enableForging(
						keys,
						configuration.httpPort
					);
					enableForgingPromises.push(enableForgingPromise);
				}
			});
		});
		Promise.all(enableForgingPromises)
			.then(forgingResults => {
				return cb(
					forgingResults.some(forgingResult => {
						return !forgingResult.forging;
					})
						? 'Enabling forging failed for some of delegates'
						: null
				);
			})
			.catch(error => {
				return cb(error);
			});
	},

	generatePeers(configurations, syncMode, syncModeArgs, currentPeer) {
		syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS[syncMode];
		let peersList = [];

		const isPickedWithProbability = n => {
			return !!n && Math.random() <= n;
		};

		switch (syncMode) {
			case SYNC_MODES.RANDOM:
				if (typeof syncModeArgs.probability !== 'number') {
					throw new Error(
						'Probability parameter not specified to random sync mode'
					);
				}
				configurations.forEach(configuration => {
					if (isPickedWithProbability(syncModeArgs.probability)) {
						if (!(configuration.wsPort === currentPeer)) {
							peersList.push({
								ip: configuration.ip,
								wsPort: configuration.wsPort,
							});
						}
					}
				});
				break;

			case SYNC_MODES.ALL_TO_FIRST:
				if (configurations.length === 0) {
					throw new Error('No configurations provided');
				}
				peersList = [
					{
						ip: configurations[0].ip,
						wsPort: configurations[0].wsPort,
					},
				];
				break;

			case SYNC_MODES.ALL_TO_GROUP:
				if (!Array.isArray(syncModeArgs.indices)) {
					throw new Error('Provide peers indices to sync with as an array');
				}
				configurations.forEach((configuration, index) => {
					if (syncModeArgs.indices.indexOf(index) !== -1) {
						if (!(configuration.wsPort === currentPeer)) {
							peersList.push({
								ip: configuration.ip,
								wsPort: configuration.wsPort,
							});
						}
					}
				});
			// no default
		}

		return peersList;
	},
	SYNC_MODES,
};
