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
var utils = require('../utils');
var devConfig = require('../../../config/devnet/config.json');
var network = require('./network');

module.exports = {
	generateLiskConfigs(broadcasting = true, syncing = true, totalPeers = 10) {
		utils.http.setVersion('1.0.0');

		// Generate config objects
		var configurations = _.range(totalPeers).map(index => {
			var devConfigCopy = _.cloneDeep(devConfig);
			devConfigCopy.ip = '127.0.0.1';
			devConfigCopy.wsPort = 5000 + index;
			devConfigCopy.httpPort = 4000 + index;
			devConfigCopy.logFileName = `../logs/lisk_node_${index}.log`;
			if (!devConfigCopy.broadcasts) {
				devConfigCopy.broadcasts = {};
			}
			devConfigCopy.broadcasts.active = broadcasting;
			if (!syncing && broadcasting) {
				// When all the nodes in network is broadcast enabled
				// and syncing disabled then all the nodes in the network
				// doesn't receive the block/transactions with 2 relays
				// So we need to increase the relay limit to ensure all
				// the peers in network receives block/transactions
				devConfigCopy.broadcasts.relayLimit = 4;
			}
			if (!devConfigCopy.syncing) {
				devConfigCopy.syncing = {};
			}
			devConfigCopy.syncing.active = syncing;
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
		var delegatesMaxLength = Math.ceil(
			devConfig.forging.delegates.length / configurations.length
		);
		var delegates = _.clone(devConfig.forging.delegates);

		if (!broadcasting) {
			configurations.forEach(configuration => {
				if (configuration.httpPort === 4000) {
					// Set forging force to true
					// When sync only enabled to forge a block
					configuration.forging.force = true;
					configuration.forging.delegates = delegates;
				} else {
					configuration.forging.force = false;
					configuration.forging.delegates = [];
				}
			});
		} else {
			configurations.forEach((configuration, index) => {
				configuration.forging.force = false;
				configuration.forging.delegates = delegates.slice(
					index * delegatesMaxLength,
					(index + 1) * delegatesMaxLength
				);
			});
		}
		return configurations;
	},
	generatePM2json(configurations, cb) {
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
