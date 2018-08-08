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

const fs = require('fs');
const utils = require('../utils');
const network = require('./network');

const devConfig = __testContext.config;

module.exports = {
	generateLiskConfigs(TOTAL_PEERS = 10) {
		utils.http.setVersion('1.0.0');

		// Generate config objects
		const configurations = _.range(TOTAL_PEERS).map(index => {
			const devConfigCopy = _.cloneDeep(devConfig);
			devConfigCopy.ip = '127.0.0.1';
			devConfigCopy.wsPort = 5000 + index;
			devConfigCopy.httpPort = 4000 + index;
			devConfigCopy.logFileName = `../logs/lisk_node_${index}.log`;
			return devConfigCopy;
		});

		// Generate peers for each node
		configurations.forEach(configuration => {
			configuration.peers.list = network.generatePeers(
				configurations,
				network.SYNC_MODES.ALL_TO_GROUP,
				{
					indices: _.range(10),
				},
				configuration.wsPort
			);
		});

		// Configuring nodes to forge with force or without
		const delegatesMaxLength = Math.ceil(
			devConfig.forging.delegates.length / configurations.length
		);
		const delegates = _.clone(devConfig.forging.delegates);

		configurations.forEach((configuration, index) => {
			configuration.forging.force = false;
			configuration.forging.delegates = delegates.slice(
				index * delegatesMaxLength,
				(index + 1) * delegatesMaxLength
			);
		});

		return configurations;
	},
	generatePM2json(configurations, cb) {
		const pm2Config = configurations.reduce(
			(pm2Config, configuration) => {
				const index = pm2Config.apps.length;
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
					args: ` -c ./test/network/configs/config.node-${index}.json`,
					env: {
						NODE_ENV: 'test',
					},
					error_file: `./test/network/logs/lisk-test-node-${index}.err.log`,
					out_file: `./test/network/logs/lisk-test-node-${index}.out.log`,
				});
				return pm2Config;
			},
			{ apps: [] }
		);
		try {
			fs.writeFileSync(
				`${__dirname}/../pm2.network.json`,
				JSON.stringify(pm2Config, null, 4)
			);
		} catch (ex) {
			return cb(ex);
		}
		return cb();
	},
};
