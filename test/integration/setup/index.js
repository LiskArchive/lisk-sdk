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
var network = require('./network');
var pm2 = require('./pm2');
var shell = require('./shell');
var sync = require('./sync');
var utils = require('../utils');
var WAIT_BEFORE_CONNECT_MS = 20000;

module.exports = {
	setupNetwork: function(configurations, cb) {
		async.series(
			[
				function(cbSeries) {
					utils.logger.log('Generating PM2 configuration');
					pm2.generatePM2Configuration(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.log('Recreating databases');
					shell.recreateDatabases(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.log('Clearing existing logs');
					shell.clearLogs(cbSeries);
				},
				function(cbSeries) {
					utils.logger.log('Launching network');
					shell.launchTestNodes(cbSeries);
				},
				function(cbSeries) {
					utils.logger.log('Waiting for nodes to load the blockchain');
					network.waitForAllNodesToBeReady(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.log('Enabling forging with registered delegates');
					network.enableForgingOnDelegates(configurations, cbSeries);
				},
				function(cbSeries) {
					utils.logger.log(
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

	exit: function(cb) {
		shell.killTestNodes(cb);
	},
	network: network,
	pm2: pm2,
	shell: shell,
	sync: sync,
};
