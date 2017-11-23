'use strict';

var async = require('async');
var network = require('./network');
var pm2 = require('./pm2');
var shell = require('./shell');
var sync = require('./sync');

var WAIT_BEFORE_CONNECT_MS = 20000;

module.exports = {

	setupNetwork: function (configurations, cb) {
		async.series([
			function (cbSeries) {
				pm2.generatePM2Configuration(configurations, cbSeries);
			},
			function (cbSeries) {
				shell.recreateDatabases(configurations, cbSeries);
			},
			function (cbSeries) {
				shell.launchTestNodes(cbSeries);
			},
			function (cbSeries) {
				network.waitForAllNodesToBeReady(configurations, cbSeries);
			},
			function (cbSeries) {
				network.enableForgingOnDelegates(configurations, cbSeries);
			},
			function (cbSeries) {
				setTimeout(cbSeries, WAIT_BEFORE_CONNECT_MS);
			}
		], function (err, res) {
			return cb(err, res);
		});
	},

	exit: function (cb) {
		shell.killTestNodes(cb);
	},
	network: network,
	pm2: pm2,
	shell: shell,
	sync: sync
};
