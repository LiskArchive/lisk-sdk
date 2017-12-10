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

	clearLogs: function (cb) {
		child_process.exec('rm -rf test/integration/logs/*', function (err) {
			return cb(err);
		});
	},

	runMochaTests: function (testsPaths, cb) {
		var child = child_process.spawn('node_modules/.bin/_mocha', ['--timeout', (8 * 60 * 1000).toString(), '--exit'].concat(testsPaths), {
			cwd: __dirname + '/../../..'
		});

		child.stdout.pipe(process.stdout);

		child.on('close', function (code) {
			if (code === 0) {
				return cb();
			} else {
				return cb('Functional tests failed');
			}
		});

		child.on('error', function (err) {
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
			return cb();
		});
	}
};
