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

var fs = require('fs');

module.exports = {
	generatePM2Configuration: function(configurations, cb) {
		var pm2Config = configurations.reduce(
			(pm2Config, configuration) => {
				var index = pm2Config.apps.length;
				configuration.db.database = `${configuration.db.database}_${index}`;
				try {
					fs.writeFileSync(
						`${__dirname}/../configs/config.node-${index}.json`,
						JSON.stringify(configuration, null, 4)
					);
				} catch (ex) {
					return cb(ex);
				}
				pm2Config.apps.push({
					exec_mode: 'fork',
					script: 'app.js',
					name: `node_${index}`,
					args: ` -c ./test/integration/configs/config.node-${index}.json`,
					env: {
						NODE_ENV: 'test',
					},
					error_file: `./test/integration/logs/lisk-test-node-${index}.err.log`,
					out_file: `./test/integration/logs/lisk-test-node-${index}.out.log`,
				});
				return pm2Config;
			},
			{ apps: [] }
		);
		try {
			fs.writeFileSync(
				`${__dirname}/../pm2.integration.json`,
				JSON.stringify(pm2Config, null, 4)
			);
		} catch (ex) {
			return cb(ex);
		}
		return cb();
	},
};
