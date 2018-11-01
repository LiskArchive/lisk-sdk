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

const scClient = require('socketcluster-client');
const WAMPClient = require('wamp-socket-cluster/WAMPClient');
const WSServerMaster = require('../../common/ws/server_master');

module.exports = {
	establishWSConnectionsToNodes(configurations, cb) {
		const firstConfiguration = configurations[0];

		const wampClient = new WAMPClient();
		const sockets = [];
		const monitorWSClient = {
			hostname: '127.0.0.1',
			port: null,
			autoReconnect: true,
			// Since we are running a multiple nodes on a single machine, we
			// need to give nodes a lot of time to respond.
			ackTimeout: 15000,
			query: WSServerMaster.generatePeerHeaders({
				wsPort: firstConfiguration.wsPort,
				httpPort: firstConfiguration.httpPort,
			}),
		};

		let connectedTo = 0;

		configurations.forEach(configuration => {
			monitorWSClient.port = configuration.wsPort;
			const socket = scClient.connect(monitorWSClient);
			wampClient.upgradeToWAMP(socket);
			sockets.push(socket);

			socket.once('connect', () => {
				connectedTo += 1;
				if (connectedTo === configurations.length) {
					cb(null, sockets);
				}
			});
			socket.on('error', () => {});
			socket.on('connectAbort', (errorCode, reason) => {
				// When a node is restarted manually during
				// peer disconnect, do not call the callback
				// the peers will be connected back after
				// restart, ref: scenarios/network/peer_disconnect
				__testContext.debug(
					`Connection aborted with code: ${errorCode} and reason ${reason}`
				);
			});
			socket.on('close', (errorCode, reason) => {
				__testContext.debug(
					`Connection closed with code: ${errorCode} and reason ${reason}`
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
