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
const utils = require('../utils');

const NODE_FINISHED_SYNC_REGEX = /Finished sync/;
const NODE_FINISHED_SYNC_TIMEOUT = 40000;

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

const getAllPeers = sockets => {
	return Promise.all(
		sockets.map(socket => {
			if (socket.state === 'open') {
				return socket.call('list', {});
			}
		})
	);
};

const common = {
	setMonitoringSocketsConnections: (params, configurations) => {
		// eslint-disable-next-line mocha/no-top-level-hooks
		before(done => {
			utils.ws.establishWSConnectionsToNodes(
				configurations,
				(err, socketsResult) => {
					if (err) {
						return done(err);
					}
					params.sockets = socketsResult;
					params.configurations = configurations;
					done();
				}
			);
		});

		// eslint-disable-next-line mocha/no-top-level-hooks
		after(done => {
			utils.ws.killMonitoringSockets(params.sockets, done);
		});
	},

	getAllPeers,

	stopNode: nodeName => {
		return new Promise((resolve, reject) => {
			childProcess.exec(`node_modules/.bin/pm2 stop ${nodeName}`, err => {
				if (err) {
					return reject(
						new Error(`Failed to stop node ${nodeName}: ${err.message}`)
					);
				}
				resolve();
			});
		});
	},

	startNode: nodeName => {
		return new Promise((resolve, reject) => {
			childProcess.exec(`node_modules/.bin/pm2 start ${nodeName}`, err => {
				if (err) {
					return reject(
						new Error(`Failed to start node ${nodeName}: ${err.message}`)
					);
				}

				const pm2LogProcess = childProcess.spawn('node_modules/.bin/pm2', [
					'logs',
					nodeName,
				]);

				const nodeReadyTimeout = setTimeout(() => {
					pm2LogProcess.stdout.removeAllListeners('data');
					pm2LogProcess.removeAllListeners('error');
					reject(new Error(`Failed to start node ${nodeName} before timeout`));
				}, NODE_FINISHED_SYNC_TIMEOUT);

				pm2LogProcess.once('error', err => {
					clearTimeout(nodeReadyTimeout);
					pm2LogProcess.stdout.removeAllListeners('data');
					reject(new Error(`Failed to start node ${nodeName}: ${err.message}`));
				});
				pm2LogProcess.stdout.on('data', data => {
					const dataString = data.toString();
					// Make sure that all nodes have fully synced before we
					// run the test cases.
					if (NODE_FINISHED_SYNC_REGEX.test(dataString)) {
						clearTimeout(nodeReadyTimeout);
						pm2LogProcess.stdout.removeAllListeners('error');
						pm2LogProcess.stdout.removeAllListeners('data');
						resolve();
					}
				});
			});
		});
	},

	restartNode: nodeName => {
		return common.stopNode(nodeName).then(() => {
			return common.startNode(nodeName);
		});
	},

	getNodesStatus: (sockets, cb) => {
		getAllPeers(sockets)
			.then(peers => {
				const peersCount = peers.length;
				getPeersStatus(peers)
					.then(peerStatusList => {
						const networkMaxAvgHeight = getMaxAndAvgHeight(peerStatusList);
						const status = {
							peersCount,
							peerStatusList,
							networkMaxAvgHeight,
						};
						cb(null, status);
					})
					.catch(err => {
						cb(err, null);
					});
			})
			.catch(err => {
				cb(err, null);
			});
	},
};

module.exports = common;
