/*
 * Copyright © 2019 Lisk Foundation
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

const DEFAULT_PEER_IP = '127.0.0.1';

const devConfig = __testContext.config;

const config = {
	generateLiskConfigs(TOTAL_PEERS = 10) {
		utils.http.setVersion('1.0.0');

		// Generate config objects
		const configurations = _.range(TOTAL_PEERS).map(index => {
			const devConfigCopy = _.cloneDeep(devConfig);

			// Remove dynamic added items in the configuration for tests
			delete devConfigCopy.nethash;
			delete devConfigCopy.genesisBlock;
			delete devConfigCopy.constants;
			delete devConfigCopy.modules.chain.genesisBlock;
			delete devConfigCopy.modules.chain.constants;
			delete devConfigCopy.modules.http_api.genesisBlock;
			delete devConfigCopy.modules.http_api.constants;
			delete devConfigCopy.initialState;
			delete devConfigCopy.modules.network.loadAsChildProcess;
			delete devConfigCopy.modules.network.version;
			delete devConfigCopy.modules.network.minVersion;
			delete devConfigCopy.modules.network.protocolVersion;
			delete devConfigCopy.modules.network.nethash;
			delete devConfigCopy.modules.network.genesisBlock;
			delete devConfigCopy.modules.network.constants;
			delete devConfigCopy.modules.network.lastCommitId;
			delete devConfigCopy.modules.network.buildVersion;
			delete devConfigCopy.modules.network.access;
			delete devConfigCopy.modules.network.list;
			delete devConfigCopy.NORMALIZER;
			delete devConfigCopy.ADDITIONAL_DATA;
			delete devConfigCopy.MAX_VOTES_PER_TRANSACTION;
			delete devConfigCopy.MULTISIG_CONSTRAINTS;

			const wsPort = 5000 + index;
			// TODO: Remove when p2p library automatically removes itself
			devConfigCopy.modules.network.wsPort = wsPort;

			devConfigCopy.modules.http_api.httpPort = 4000 + index;
			devConfigCopy.app.label = `lisk-devnet-${4000 + index}`;
			devConfigCopy.components.logger.logFileName = `../logs/lisk_node_${index}.log`;
			return devConfigCopy;
		});

		// Generate peers for each node
		configurations.forEach(configuration => {
			// eslint-disable-next-line no-param-reassign
			configuration.modules.network.seedPeers = config.generatePeers(
				configurations,
				config.SYNC_MODES.ALL_TO_GROUP,
				{
					indices: _.range(10),
				},
				configuration.modules.network.wsPort,
			);
		});

		// Configuring nodes to forge with force or without
		const delegatesMaxLength = Math.ceil(
			devConfig.modules.chain.forging.delegates.length /
				(configurations.length - 1),
		);
		const delegates = _.clone(devConfig.modules.chain.forging.delegates);

		return configurations.forEach((configuration, index) => {
			// eslint-disable-next-line no-param-reassign
			configuration.modules.chain.forging.force = false;
			// eslint-disable-next-line no-param-reassign
			configuration.modules.chain.forging.delegates = delegates.slice(
				index * delegatesMaxLength,
				(index + 1) * delegatesMaxLength,
			);
		});
	},
	generatePM2Configs(configurations, callback) {
		const configReducer = (pm2Config, configuration) => {
			const index = pm2Config.apps.length;
			// eslint-disable-next-line no-param-reassign
			configuration.components.storage.database = `${configuration.components.storage.database}_${index}`;
			try {
				if (!fs.existsSync(`${__dirname}/../configs/`)) {
					fs.mkdirSync(`${__dirname}/../configs/`);
				}
				fs.writeFileSync(
					`${__dirname}/../configs/config.node-${index}.json`,
					JSON.stringify(configuration, null, 4),
				);
			} catch (ex) {
				throw new Error(
					`Failed to write PM2 config for node ${index} to file system because of exception: ${ex.message}`,
				);
			}

			pm2Config.apps.push({
				exec_mode: 'fork',
				script: 'test/test_app/index.js',
				name: `node_${index}`,
				args: ` -c test/mocha/network/configs/config.node-${index}.json`,
				env: {
					NODE_ENV: 'test',
					CUSTOM_CONFIG_FILE: `test/mocha/network/configs/config.node-${index}.json`,
				},
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
				JSON.stringify(combinedPM2Config, null, 4),
			);
		} catch (ex) {
			return callback(
				new Error(`Failed to write pm2.network.json to file system
					because of exception: ${ex.message}`),
			);
		}
		return callback(null, combinedPM2Config);
	},
	generatePeers(configurations, syncMode, syncModeArgs, currentPeer) {
		const localSyncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS[syncMode];
		let peersList = [];

		const isPickedWithProbability = n => {
			return !!n && Math.random() <= n;
		};

		switch (syncMode) {
			case SYNC_MODES.RANDOM:
				if (typeof localSyncModeArgs.probability !== 'number') {
					throw new Error(
						'Probability parameter not specified to random sync mode',
					);
				}
				configurations.forEach(configuration => {
					if (isPickedWithProbability(localSyncModeArgs.probability)) {
						if (!(configuration.modules.network.wsPort === currentPeer)) {
							peersList.push({
								ip: DEFAULT_PEER_IP,
								wsPort: configuration.modules.network.wsPort,
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
						ip: DEFAULT_PEER_IP,
						wsPort: configurations[0].modules.network.wsPort,
					},
				];
				break;

			case SYNC_MODES.ALL_TO_GROUP:
				if (!Array.isArray(localSyncModeArgs.indices)) {
					throw new Error('Provide peers indices to sync with as an array');
				}
				configurations.forEach((configuration, index) => {
					if (localSyncModeArgs.indices.indexOf(index) !== -1) {
						peersList.push({
							ip: DEFAULT_PEER_IP,
							wsPort: configuration.modules.network.wsPort,
						});
					}
				});
			// no default
		}

		return peersList;
	},
	SYNC_MODES,
};

module.exports = config;
