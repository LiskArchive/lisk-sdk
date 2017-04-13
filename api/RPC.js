'use strict';
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

//ip + port -> socketId
var wsClientsConnectionsMap = {};

var wsRPCServer = function (socketCluster) {
	return new MasterWAMPServer(socketCluster);
};

var wampClient = new WAMPClient();

var wsRPCClient = function (ip, port, cb) {

	var address = ip + ':' + port;

	var options = {
		ip: ip,
		port: port,
		protocol: 'http',
		autoReconnect: true
	};

	//return registered client if established before
	if (wsClientsConnectionsMap[address]) {
		return scClient.connections[wsClientsConnectionsMap[address]];
	}

	var clientSocket = scClient.connect(options);

	wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('error', function (err) {
		return cb('Socket error - ' + err);
	});

	clientSocket.on('connect', function () {
		wsClientsConnectionsMap[address] = clientSocket.id;
		return cb(null, clientSocket);
	}.bind(this));

	return wampClient;
};

var wsRPCBroadcast = function (method, data) {

	scClient.connections.forEach(function (socket) {
		socket.emit(method, data);
	});
};

module.exports = {
	wsRPCClient: wsRPCClient,
	wsRPCServer: wsRPCServer,
	wsRPCBroadcast: wsRPCBroadcast
};
