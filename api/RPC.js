'use strict';

var Q = require('q');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

function WsRPC (socketCluster) {

	//ip + port -> socketId
	this.wsClientsConnectionsMap = {};

	this.wampClient = new WAMPClient();

	this.server = new MasterWAMPServer(socketCluster);

	this.scClient = require('socketcluster-client');

	this.shared = {
		broadcast: function (method, data) {
			this.scClient.connections.forEach(function (socket) {
				socket.emit(method, data);
			});
		}.bind(this),

		sendToPeer: function (peer, procedure, data) {
			var peerSocket = this.scClient.connections[this.wsClientsConnectionsMap[peer.ip + ':' + peer.port]];
			if (!peerSocket) {
				return Q.reject();
			}
			return peerSocket.wampSend(procedure, data);
		}.bind(this)
	};
}

WsRPC.prototype.client = function (ip, port, cb) {

	var address = ip + ':' + port;

	var options = {
		ip: ip,
		port: port,
		protocol: 'http',
		autoReconnect: true
	};

	//return registered client if established before
	if (this.wsClientsConnectionsMap[address]) {
		return this.scClient.connections[this.wsClientsConnectionsMap[address]];
	}

	var clientSocket = this.scClient.connect(options);

	this.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('error', function (err) {
		return cb('Socket error - ' + err);
	});

	clientSocket.on('connect', function () {
		this.wsClientsConnectionsMap[address] = clientSocket.id;
		return cb(null, clientSocket);
	}.bind(this));

	clientSocket.on('connecting', function () {
		console.log('CLIENT STARTED HANDSHAKE');
	});

	clientSocket.on('connectAbort', function (data) {
		return cb('CLIENT HANDSHAKE REJECTED' + JSON.stringify(data));
	});

	return clientSocket;
};

module.exports = WsRPC;