'use strict';

var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var WSClient = require('../../common/wsClient');
var scClient = require('socketcluster-client');

module.exports = {

	establishWSConnectionsToNodes: function (configurations, cb) {
		var wampClient = new WAMPClient();
		var sockets = [];
		var monitorWSClient = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: null,
			autoReconnect: true,
			query: WSClient.generatePeerHeaders()
		};
		var connectedTo = 0;
		configurations.forEach(function (configuration) {
			monitorWSClient.port = configuration.port;
			var socket = scClient.connect(monitorWSClient);
			wampClient.upgradeToWAMP(socket);
			socket.on('connect', function () {
				sockets.push(socket);
				connectedTo += 1;
				if (connectedTo === configurations.length) {
					cb(null, sockets);
				}
			});
			socket.on('error', function (err) {});
			socket.on('connectAbort', function () {
				cb('Unable to establish WS connection with ' + configuration.ip + ':' + configuration.port);
			});
		});
	}
};
