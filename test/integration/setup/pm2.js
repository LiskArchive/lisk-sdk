'use strict';

var fs = require('fs');

module.exports = {

	generatePM2Configuration: function (configurations, cb) {
		var pm2Config = configurations.reduce(function (pm2Config, configuration) {
			var index = pm2Config.apps.length;
			configuration.db.database = configuration.db.database + '_' + index;
			try {
				fs.writeFileSync(__dirname + '/../configs/config.node-' + index + '.json', JSON.stringify(configuration, null, 4));
			} catch (ex) {
				return cb(ex);
			}
			pm2Config.apps.push({
				'exec_mode': 'fork',
				'script': 'app.js',
				'name': 'node_' + index,
				'args': ' -c ./test/integration/configs/config.node-' + index + '.json',
				'env': {
					'NODE_ENV': 'test'
				},
				'error_file': './test/integration/logs/lisk-test-node-' + index + '.err.log',
				'out_file': './test/integration/logs/lisk-test-node-' + index + '.out.log'
			});
			return pm2Config;
		}, {apps: []});
		try {
			fs.writeFileSync(__dirname + '/../pm2.integration.json', JSON.stringify(pm2Config, null, 4));
		} catch (ex) {
			return cb(ex);
		}
		return cb();
	}
};
