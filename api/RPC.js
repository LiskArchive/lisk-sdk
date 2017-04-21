'use strict';

var Q = require('q');
var _ = require('lodash');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');


function WsRPCServer (socketCluster, childProcessConfig) {

	WsRPCServer.prototype.server = new MasterWAMPServer(socketCluster, childProcessConfig);
	console.log('\x1b[31m%s\x1b[0m', 'WsRPCServer: server --- ');

	this.sharedClient = {
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

//ip + port -> socketId
WsRPCServer.prototype.wsClientsConnectionsMap = {};
WsRPCServer.prototype.wampClient = new WAMPClient();
WsRPCServer.prototype.scClient = scClient;

function WsRPCClient (ip, port) {

	if (!ip || !port) {
		throw new Error('WsRPCClient needs ip and port to establish WS connection.');
	}

	var address = ip + ':' + port;

	var options = {
		ip: ip,
		port: port,
		protocol: 'http',
		autoReconnect: true
	};

	this.socketReady = Q.defer();

	//return registered client if established before
	if (WsRPCServer.prototype.wsClientsConnectionsMap[address]) {
		var clientSocket = WsRPCServer.prototype.connections[WsRPCServer.prototype.wsClientsConnectionsMap[address]];
		this.socketReady.resolve(clientSocket);
	} else {
		this.initializeNewConnection(options, address, this.socketReady);
	}

	this.sendAfterSocketReady = function (procedureName) {
		return function (data) {
			return this.socketReady.promise.then(function (socket) {
				return socket.wampSend(procedureName, data);
			});
		}.bind(this);
	}.bind(this);

	console.log('\x1b[31m%s\x1b[0m', 'WsRPCClient: server ---');
	return this.clientStub(this.sendAfterSocketReady);
}

WsRPCClient.prototype.initializeNewConnection = function (options, address, socketReady) {

	var clientSocket = WsRPCServer.prototype.scClient.connect(options);

	WsRPCServer.prototype.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('error', function (err) {
		return socketReady.reject('Socket error - ' + err);
	});

	clientSocket.on('connect', function () {
		WsRPCServer.prototype.wsClientsConnectionsMap[address] = clientSocket.id;
		return socketReady.resolve(clientSocket);
	});

	clientSocket.on('connecting', function () {
		console.log('CLIENT STARTED HANDSHAKE');
	});

	clientSocket.on('connectAbort', function (data) {
		return socketReady.reject('CLIENT HANDSHAKE REJECTED' + JSON.stringify(data));
	});
};

WsRPCClient.prototype.clientStub = function (handler) {
	if (!WsRPCServer.prototype.server) {
		return {};
	}
	return _.reduce(Object.assign({}, WsRPCServer.prototype.server.endpoints.rpc, WsRPCServer.prototype.server.endpoints.event),
		function (availableCalls, procedureHandler, procedureName) {
			availableCalls[procedureName] = handler(procedureName);
			return availableCalls;
		}, {});
};

module.exports = {
	WsRPCClient: WsRPCClient,
	WsRPCServer: WsRPCServer
};