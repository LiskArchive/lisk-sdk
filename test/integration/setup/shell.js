'use strict';

var async = require('async');
var child_process = require('child_process');

module.exports = {

	recreateDatabases: function (configurations, cb) {
		async.forEachOf(configurations, function (configuration, index, eachCb) {
			child_process.exec('dropdb ' + configuration.db.database + '; createdb ' + configuration.db.database, eachCb);
		}, cb);
	},

	launchTestNodes: function (cb) {
		child_process.exec('node_modules/.bin/pm2 start test/integration/pm2.integration.json', function (err) {
			return cb(err);
		});
	},

	killTestNodes: function (cb) {
		child_process.exec('node_modules/.bin/pm2 kill', function (err) {
			if (err) {
				console.warn('Failed to killed PM2 process. Please execute command "pm2 kill" manually');
			} else {
				console.info('PM2 process killed gracefully');
			}
			return cb(err);
		});
	}
};
