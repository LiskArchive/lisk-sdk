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

const childProcess = require('child_process');
const waitFor = require('../common/utils/wait_for');
const utils = require('./utils');
const shell = require('./setup/shell');
const config = require('./setup/config');

const WAIT_BEFORE_CONNECT_MS = 20000;

const getPeersStatus = peers => {
	return Promise.all(
		peers.map(peer => {
			return utils.http.getNodeStatus(peer.httpPort, peer.ip);
		})
	);
};

const getMaxAndAvgHeight = peerStatusList => {
	let maxHeight = 1;
	let heightSum = 0;
	const totalPeers = peerStatusList.length;
	peerStatusList.forEach(peerStatus => {
		if (peerStatus.height > maxHeight) {
			maxHeight = peerStatus.height;
		}
		heightSum += peerStatus.height;
	});

	return {
		maxHeight,
		averageHeight: heightSum / totalPeers,
	};
};

class Network {
	constructor(configurations) {
		this.configurations = configurations;
		this.sockets = [];
		this.pm2ConfigMap = {};
		this.logger = utils.logger;
	}

	establishMonitoringSocketsConnections() {
		return new Promise((resolve, reject) => {
			utils.ws.establishWSConnectionsToNodes(
				this.configurations,
				(err, socketsResult) => {
					if (err) {
						return reject(
							new Error(
								`Failed to establish monitoring connections due to error: ${
									err.message || err
								}`
							)
						);
					}
					this.sockets = socketsResult;
					resolve(socketsResult);
				}
			);
		});
	}

	killMonitoringSocketsConnections() {
		return new Promise((resolve, reject) => {
			utils.ws.killMonitoringSockets(this.sockets, err => {
				if (err) {
					return reject(err);
				}
				this.sockets = [];
				resolve();
			});
		});
	}

	/**
	 * Launch the network based on the current network configuration.
	 *
	 * @param {Object} options
	 * @param {Boolean} options.enableForging Whether or not to enable forging on
	 * delegates immediately after launching the network.
	 */
	launchNetwork(options) {
		options = options || {};
		return Promise.resolve()
			.then(() => {
				return this.generatePM2Configs()
				.then(pm2Configs => {
					this.pm2ConfigMap = {};
					pm2Configs.apps.forEach(pm2Config => {
						this.pm2ConfigMap[pm2Config.name] = pm2Config;
					});
				});
			})
			.then(() => {
				return this.recreateDatabases();
			})
			.then(() => {
				return this.clearAllLogs();
			})
			.then(() => {
				return this.launchTestNodes();
			})
			.then(() => {
				return this.waitForAllNodesToBeReady(true);
			})
			.then(() => {
				if (options.enableForging) {
					return this.enableForgingForDelegates()
						.then(() => {
							return this.waitForBlocksOnAllNodes(1);
						});
				}
			})
			.then(() => {
				return this.establishMonitoringSocketsConnections();
			})
			.then(() => {
				// TODO: Check all the client socket 'connect' events instead.
				return new Promise((resolve, reject) => {
					this.logger.log(
						`Waiting ${WAIT_BEFORE_CONNECT_MS /
							1000} seconds for nodes to establish connections`
					);
					setTimeout(err => {
						if (err) {
							return reject(err);
						}
						resolve();
					}, WAIT_BEFORE_CONNECT_MS);
				});
			});
	}

	generatePM2Configs() {
		return new Promise((resolve, reject) => {
			this.logger.log('Generating PM2 configuration');
			config.generatePM2Configs(this.configurations, (err, pm2Configs) => {
				if (err) {
					return reject(
						new Error(`Failed to generate PM2 configs due to error: ${
							err.message || err
						}`)
					);
				}
				resolve(pm2Configs);
			});
		});
	}

	recreateDatabases() {
		return new Promise((resolve, reject) => {
			this.logger.log('Recreating databases');
			shell.recreateDatabases(this.configurations, err => {
				if (err) {
					return reject(
						new Error(`Failed to recreate databases due to error: ${
							err.message || err
						}`)
					);
				}
				resolve();
			});
		});
	}

	clearAllLogs() {
		return new Promise((resolve, reject) => {
			this.logger.log('Clearing existing logs');
			shell.clearLogs(err => {
				if (err) {
					return reject(
						new Error(`Failed to clear all logs due to error: ${
							err.message || err
						}`)
					);
				}
				resolve();
			});
		});
	}

	launchTestNodes() {
		return new Promise((resolve, reject) => {
			this.logger.log('Launching network');
			shell.launchTestNodes(err => {
				if (err) {
					return reject(
						new Error(`Failed to launch nest nodes due to error: ${
							err.message || err
						}`)
					);
				}
				resolve();
			});
		});
	}

	killNetwork() {
		return Promise.resolve()
			.then(() => {
				return new Promise((resolve, reject) => {
					this.logger.log('Shutting down network');
					shell.killTestNodes(err => {
						if (err) {
							return reject(err);
						}
						resolve();
					});
				});
			})
			.then(() => {
				return this.killMonitoringSocketsConnections();
			});
	}

	waitForNodeToBeReady(nodeName, logRetries) {
		const retries = 20;
		const timeout = 3000;
		const pm2Config = this.pm2ConfigMap[nodeName];
		if (!pm2Config) {
			return Promise.reject(
				new Error(`Could not find pm2Config for ${nodeName}`)
			);
		}
		const { configuration } = pm2Config;

		return new Promise((resolve, reject) => {
			waitFor.blockchainReady(
				err => {
					if (err) {
						return reject(
							new Error(`Failed to wait for node ${
								nodeName
							} to be ready due to error: ${
								err.message || err
							}`)
						);
					}
					resolve();
				},
				retries,
				timeout,
				`http://${configuration.ip}:${configuration.httpPort}`,
				!logRetries
			);
		});
	}

	waitForNodesToBeReady(nodeNames, logRetries) {
		this.logger.log(`Waiting for nodes ${
			nodeNames.join(', ')
		} to load the blockchain`);

		const nodeReadyPromises = nodeNames.map(nodeName => {
			return this.waitForNodeToBeReady(nodeName, logRetries);
		});

		return Promise.all(nodeReadyPromises);
	}

	waitForAllNodesToBeReady(logRetries) {
		this.logger.log('Waiting for all nodes to load the blockchain');

		const nodeNames = Object.keys(this.pm2ConfigMap);

		return this.waitForNodesToBeReady(nodeNames, logRetries);
	}

	waitForBlocksOnNode(nodeName, blocksToWait) {
		const pm2Config = this.pm2ConfigMap[nodeName];
		if (!pm2Config) {
			return Promise.reject(
				new Error(`Could not find pm2Config for ${nodeName}`)
			);
		}
		const { configuration } = pm2Config;

		return new Promise((resolve, reject) => {
			waitFor.blocks(
				blocksToWait,
				err => {
					if (err) {
						return reject(
							new Error(`Failed to wait for blocks on node ${
								nodeName
							} due to error: ${
								err.message || err
							}`)
						);
					}
					resolve();
				},
				`http://${configuration.ip}:${configuration.httpPort}`
			);
		});
	}

	waitForBlocksOnNodes(nodeNames, blocksToWait) {
		this.logger.log(`Waiting for blocks on nodes ${
			nodeNames.join(', ')
		}`);

		const nodeBlocksPromises = nodeNames.map(nodeName => {
			return this.waitForBlocksOnNode(nodeName, blocksToWait);
		});

		return Promise.all(nodeBlocksPromises);
	}

	waitForBlocksOnAllNodes(blocksToWait) {
		this.logger.log('Waiting for blocks on all nodes');

		const nodeNames = Object.keys(this.pm2ConfigMap);
		return this.waitForBlocksOnNodes(nodeNames, blocksToWait);
	}

	enableForgingForDelegates() {
		this.logger.log('Enabling forging with registered delegates');

		const enableForgingPromises = [];
		this.configurations.forEach(configuration => {
			configuration.forging.delegates.map(keys => {
				if (!configuration.forging.force) {
					const enableForgingPromise = utils.http.enableForging(
						keys,
						configuration.httpPort
					);
					enableForgingPromises.push(enableForgingPromise);
				}
			});
		});
		return Promise.all(enableForgingPromises)
			.then(forgingResults => {
				const someFailures = forgingResults.some(forgingResult => {
					return !forgingResult.forging;
				});
				if (someFailures) {
					throw new Error('Enabling forging failed for some of delegates');
				}
			})
			.catch(err => {
				// Catch and rethrow promise error as higher level error.
				throw new Error(`Failed to enable forging for delegates due to error: ${
					err.message || err
				}`);
			});
	}

  getAllPeersLists() {
    return Promise.all(
      this.sockets.map(socket => {
        if (socket.state === 'open') {
          return socket.call('list', {});
        }
        return null;
      })
      .filter(result => {
        return result !== null;
      })
    ).then(result => {
			return result;
		});
	}

	getAllPeers() {
		return this.getAllPeersLists()
		.then(peerListResults => {
			const peersMap = {};
			peerListResults.forEach(result => {
				if (result.peers) {
					result.peers.forEach(peer => {
						peersMap[`${peer.ip}:${peer.wsPort}`] = peer;
					});
				}
			});
			return Object.keys(peersMap).map(peerString => {
				return peersMap[peerString];
			});
		});
	}

	// eslint-disable-next-line class-methods-use-this
	clearLogs(nodeName) {
		return new Promise((resolve, reject) => {
			// TODO: Once we upgrade pm2 to a version which supports passing a nodeName
			// to the pm2 flush command, we should use that instead of removing the
			// log files manually. Currently pm2 flush clears the logs for all nodes.
			const sanitizedNodeName = nodeName.replace(/_/g, '-');
			childProcess.exec(`rm -rf test/network/logs/lisk-test-${sanitizedNodeName}.*`, err => {
				if (err) {
					return reject(
						new Error(`Failed to clear logs for node ${nodeName}: ${
							err.message || err
						}`)
					);
				}
				resolve();
			});
		});
	}

	// eslint-disable-next-line class-methods-use-this
	stopNode(nodeName) {
		return new Promise((resolve, reject) => {
			childProcess.exec(`node_modules/.bin/pm2 stop ${nodeName}`, err => {
				if (err) {
					return reject(
						new Error(`Failed to stop node ${nodeName}: ${
							err.message || err
						}`)
					);
				}
				resolve();
			});
		});
	}

	startNode(nodeName, waitForSync) {
		let startPromise = new Promise((resolve, reject) => {
			childProcess.exec(`node_modules/.bin/pm2 start ${nodeName}`, err => {
				if (err) {
					return reject(
						new Error(`Failed to start node ${nodeName}: ${
							err.message || err
						}`)
					);
				}
				resolve();
			});
		});
		if (waitForSync) {
			startPromise = startPromise.then(() => {
				return this.waitForNodeToBeReady(nodeName).catch(() => {
					throw new Error(`Failed to start node ${nodeName} because it did not sync before timeout`);
				});
			});
		}
		return startPromise;
	}

	restartNode(nodeName, waitForSync) {
		return this.stopNode(nodeName)
			.then(() => {
				return this.startNode(nodeName, waitForSync);
			});
	}

	restartAllNodes(nodeNamesList, waitForSync) {
		const waitForRestartPromises = nodeNamesList.map(nodeName => {
			return this.restartNode(nodeName, waitForSync);
		});
		return Promise.all(waitForRestartPromises);
	}

	getAllNodesStatus() {
		return this.getAllPeers()
			.then(peers => {
				return getPeersStatus(peers);
			})
			.then(peerStatusList => {
				const peersCount = peerStatusList.length;
				const networkMaxAvgHeight = getMaxAndAvgHeight(peerStatusList);
				const status = {
					peersCount,
					peerStatusList,
					networkMaxAvgHeight,
				};
				return status;
			});
	}
}

module.exports = Network;
