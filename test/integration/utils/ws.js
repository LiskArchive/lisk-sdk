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

var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var WSServerMaster = require('../../common/ws/server_master');
var scClient = require('socketcluster-client');

module.exports = {
	establishWSConnectionsToNodes: function(configurations, cb) {
		var wampClient = new WAMPClient();
		var sockets = [];
		var monitorWSClient = {
			protocol: 'http',
			hostname: '127.0.0.1',
			wsPort: null,
			autoReconnect: true,
			query: WSServerMaster.generatePeerHeaders(),
		};
		var connectedTo = 0;
		configurations.forEach(configuration => {
			monitorWSClient.port = configuration.wsPort;
			var socket = scClient.connect(monitorWSClient);
			wampClient.upgradeToWAMP(socket);
			socket.on('connect', () => {
				sockets.push(socket);
				connectedTo += 1;
				if (connectedTo === configurations.length) {
					cb(null, sockets);
				}
			});
			socket.on('error', () => {});
			socket.on('connectAbort', () => {
				cb(
					`Unable to establish WS connection with ${configuration.ip}:${
						configuration.wsPort
					}`
				);
			});
		});
	},
};
