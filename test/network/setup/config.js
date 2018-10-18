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

/**
 * SYNC_MODES allow us to choose the network topology to use when
 * executing network tests.
 * Nodes in the network can form a sparse graph, a dense graph or
 * a complete graph.
 *
 * The supported SYNC_MODES are:
 * - RANDOM: Each node will connect to random peers in the group.
 * - ALL_TO_FIRST: Each node will connect to the first peer in the group.
 * - ALL_TO_GROUP: Each node will connect to every other node in the group.
 */
const SYNC_MODES = {
	RANDOM: 0,
	ALL_TO_FIRST: 1,
	ALL_TO_GROUP: 2,
};

const SYNC_MODE_DEFAULT_ARGS = {
	RANDOM: {
		probability: 0.5, // (0 - 1)
	},
	ALL_TO_GROUP: {
		indices: [],
	},
};

const devConfig = __testContext.config;

const config = {
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
			configuration.peers.list = config.generatePeers(
				configurations,
				config.SYNC_MODES.ALL_TO_GROUP,
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
	generatePM2Configs(configurations, callback) {
		const configReducer = (pm2Config, configuration) => {
			const index = pm2Config.apps.length;
			configuration.db.database = `${configuration.db.database}_${index}`;
			try {
				fs.writeFileSync(
					`${__dirname}/../configs/config.node-${index}.json`,
					JSON.stringify(configuration, null, 4)
				);
			} catch (ex) {
				throw new Error(
					`Failed to write PM2 config for node ${index} to file system because of exception: ${
						ex.message
					}`
				);
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
				configuration,
			});
			return pm2Config;
		};

		let combinedPM2Config = null;
		try {
			combinedPM2Config = configurations.reduce(configReducer, { apps: [] });
		} catch (ex) {
			return callback(ex);
		}
		try {
			fs.writeFileSync(
				`${__dirname}/../pm2.network.json`,
				JSON.stringify(combinedPM2Config, null, 4)
			);
		} catch (ex) {
			return callback(
				new Error(`Failed to write pm2.network.json to file system
					because of exception: ${ex.message}`)
			);
		}
		return callback(null, combinedPM2Config);
	},
	generatePeers(configurations, syncMode, syncModeArgs, currentPeer) {
		syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS[syncMode];
		let peersList = [];

		const isPickedWithProbability = n => {
			return !!n && Math.random() <= n;
		};

		switch (syncMode) {
			case SYNC_MODES.RANDOM:
				if (typeof syncModeArgs.probability !== 'number') {
					throw new Error(
						'Probability parameter not specified to random sync mode'
					);
				}
				configurations.forEach(configuration => {
					if (isPickedWithProbability(syncModeArgs.probability)) {
						if (!(configuration.wsPort === currentPeer)) {
							peersList.push({
								ip: configuration.ip,
								wsPort: configuration.wsPort,
							});
						}
					}
				});
				break;

			case SYNC_MODES.ALL_TO_FIRST:
				if (configurations.length === 0) {
					throw new Error('No configurations provided');
				}
				peersList = [
					{
						ip: configurations[0].ip,
						wsPort: configurations[0].wsPort,
					},
				];
				break;

			case SYNC_MODES.ALL_TO_GROUP:
				if (!Array.isArray(syncModeArgs.indices)) {
					throw new Error('Provide peers indices to sync with as an array');
				}
				configurations.forEach((configuration, index) => {
					if (syncModeArgs.indices.indexOf(index) !== -1) {
						if (!(configuration.wsPort === currentPeer)) {
							peersList.push({
								ip: configuration.ip,
								wsPort: configuration.wsPort,
							});
						}
					}
				});
			// no default
		}

		return peersList;
	},
	SYNC_MODES,
};

module.exports = config;
