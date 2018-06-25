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
var utils = require('../utils');
var network = require('./network');
var pm2 = require('./pm2');
var shell = require('./shell');
var sync = require('./sync');

var WAIT_BEFORE_CONNECT_MS = 20000;

module.exports = {
	setupNetwork(configurations, cb) {
		async.series(
			[
				function(cbSeries) {
					utils.logger.info('Generating PM2 configuration');
					pm2.generatePM2Configuration(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.info('Recreating databases');
					shell.recreateDatabases(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.info('Clearing existing logs');
					shell.clearLogs(cbSeries);
				},
				function(cbSeries) {
					utils.logger.info('Launching network');
					shell.launchTestNodes(cbSeries);
				},
				function(cbSeries) {
					utils.logger.info('Waiting for nodes to load the blockchain');
					network.waitForAllNodesToBeReady(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.info('Enabling forging with registered delegates');
					network.enableForgingOnDelegates(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.info(
						`Waiting ${WAIT_BEFORE_CONNECT_MS /
							1000} seconds for nodes to establish connections`
					);
					setTimeout(cbSeries, WAIT_BEFORE_CONNECT_MS);
				},
			],
			(err, res) => {
				return cb(err, res);
			}
		);
	},

	exit(cb) {
		shell.killTestNodes(cb);
	},
	network,
	pm2,
	shell,
	sync,
};
