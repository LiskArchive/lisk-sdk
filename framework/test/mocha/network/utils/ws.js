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

const scClient = require('socketcluster-client');
const WAMPClient = require('wamp-socket-cluster/WAMPClient');
const { generatePeerHeader } = require('../../common/generatePeerHeader');

module.exports = {
	establishWSConnectionsToNodes(configurations, cb) {
		const firstConfig = configurations[0];
		const httpPort = firstConfig.modules.http_api.httpPort;
		const wsPort = firstConfig.modules.network.wsPort;
		const { nodeInfo } = generatePeerHeader({ wsPort, httpPort });

		const wampClient = new WAMPClient();
		const sockets = [];
		const monitorWSClient = {
			hostname: '127.0.0.1',
			port: null,
			autoReconnect: true,
			autoReconnectOptions: {
				initialDelay: 1000,
				randomness: 0,
				maxDelay: 10000,
			},
			// Since we are running a multiple nodes on a single machine, we
			// need to give nodes a lot of time to respond.
			ackTimeout: 2000,
			query: nodeInfo,
		};

		let connectedTo = 0;

		configurations.forEach(configuration => {
			monitorWSClient.port = configuration.modules.network.wsPort;
			const socket = scClient.connect(monitorWSClient);
			wampClient.upgradeToWAMP(socket);
			sockets.push(socket);

			socket.once('connect', async () => {
				connectedTo += 1;
				if (connectedTo === configurations.length) {
					return cb(null, sockets);
				}
				return undefined;
			});
			socket.on('error', async () => {});
			socket.on('connectAbort', (errorCode, reason) => {
				// When a node is restarted manually during
				// peer disconnect, do not call the callback
				// the peers will be connected back after
				// restart, ref: scenarios/network/peer_disconnect
				__testContext.debug(
					`Connection aborted with code: ${errorCode} and reason ${reason}`,
				);
			});
			socket.on('close', (errorCode, reason) => {
				__testContext.debug(
					`Connection closed with code: ${errorCode} and reason ${reason}`,
				);
			});
		});
	},

	killMonitoringSockets(sockets, cb) {
		sockets.forEach(socket => {
			socket.destroy();
		});
		cb(null);
	},
};
