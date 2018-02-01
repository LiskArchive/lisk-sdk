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

var async = require('async');
var Promise = require('bluebird');
var waitUntilBlockchainReady = require('../../common/utils/wait_for')
	.blockchainReady;
var utils = require('../utils');

module.exports = {
	waitForAllNodesToBeReady: function(configurations, cb) {
		async.forEachOf(
			configurations,
			(configuration, index, eachCb) => {
				waitUntilBlockchainReady(
					eachCb,
					20,
					2000,
					`http://${configuration.ip}:${configuration.httpPort}`
				);
			},
			cb
		);
	},

	enableForgingOnDelegates: function(configurations, cb) {
		var enableForgingPromises = [];
		configurations.forEach(configuration => {
			configuration.forging.secret.map(keys => {
				var enableForgingPromise = utils.http.enableForging(
					keys,
					configuration.httpPort
				);
				enableForgingPromises.push(enableForgingPromise);
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
};
