'use strict';

var Q = require('q');
var _ = require('lodash');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
var constants = require('../helpers/constants');

var WsRPCServer = {

	wsServer: null,
	wampClient: new WAMPClient(),
	scClient: scClient,
	wsClientsConnectionsMap: {},

	setServer: function (wsServer) {
		this.wsServer = wsServer;
	},

	getServer: function () {
		if (!this.wsServer) {
			throw new Error('WS server haven\'t been initialized!');
		}
		return this.wsServer;
	}

};

function WsRPCClient (ip, port) {
	console.log('new RPC Client created');

	if (!ip || !port) {
		throw new Error('WsRPCClient needs ip and port to establish WS connection.');
	}

	var address = ip + ':' + port;
	var socketDefer = WsRPCServer.wsClientsConnectionsMap[address];

	//first time init || previously rejected
	if (!socketDefer || socketDefer.promise.inspect().state === 'rejected') {
		socketDefer = Q.defer();
		this.initializeNewConnection({
			hostname: ip,
			port: +port + 1000,
			protocol: 'http',
			autoReconnect: true,
			query: constants.getConst('headers')
		}, address, socketDefer);
		console.log('\x1b[32m%s\x1b[0m', 'socket defer promise state promise state', socketDefer.promise.inspect().state);
		WsRPCServer.wsClientsConnectionsMap[address] = socketDefer;
	} else {
		console.log('\x1b[32m%s\x1b[0m', 'WsRPCClient: found existing connection - deffer');
	}

	console.log('\x1b[32m%s\x1b[0m', 'WsRPCClient: return a new stub for  --- port', port);
	return this.clientStub(this.sendAfterSocketReadyCb(socketDefer));
}

WsRPCClient.prototype.initializeNewConnection = function (options, address, socketReady) {

	console.log('\x1b[32m%s\x1b[0m', 'WsRPCClient: initializeNewConnection --- with: ', options);

	var clientSocket = WsRPCServer.scClient.connect(options);

	WsRPCServer.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('connect', function () {
		console.log('\x1b[32m%s\x1b[0m', 'WsRPCClient: HANDSHAKE SUCCEESS --- with: ', options.ip, options.port);
		if (!constants.externalAddress) {
			clientSocket.wampSend('list', {query: {
				nonce: options.query.nonce
			}}).then(function (res) {
				console.log('\x1b[32m%s\x1b[0m', 'this is me: ', res.peers[0]);
				constants.externalAddress = res.peers[0].ip;
				return socketReady.resolve(clientSocket);
			}).catch(function (err) {
				console.log('\x1b[32m%s\x1b[0m', 'get myself error: ', err);
				clientSocket.disconnect();
				return socketReady.reject();
			});
		} else {
			return socketReady.resolve(clientSocket);
		}
	});

	clientSocket.on('error', function () {
		clientSocket.disconnect();
		console.log('RPC CLIENT --- CLIENT SOCKET ON ERROR');
	});

	clientSocket.on('connectAbort', function (err, data) {
		socketReady.reject(err);
		console.log('\x1b[32m%s\x1b[0m', 'WsRPCClient: HANDSHAKE ABORT --- with: ',  options.ip, options.port, data, err);
	});

	clientSocket.on('disconnect', function () {
		socketReady.reject();
		clientSocket.disconnect();
		console.log('CLIENT STARTED HANDSHAKE');
	});
};

WsRPCClient.prototype.sendAfterSocketReadyCb = function (socketReady) {
	return function (procedureName) {
		return function () {
			var cb = _.isFunction(_.last(arguments)) ? _.last(arguments) : _.noop();
			var data = !_.isFunction(arguments[0]) ? arguments[0] : {};
			console.log('\x1b[38m%s\x1b[0m', 'RPC CLIENT --- SOCKET READY - SENDING REQ: ', procedureName, data);
			socketReady.promise.then(function (socket) {
				console.log('\x1b[32m%s\x1b[0m', 'WsRPCClient: sendAfterSocketReadyCb socketDefer resolved with', socket.id);
				return socket.wampSend(procedureName, data)
					.then(function (res) {
						return setImmediate(cb, null, res);
					})
					.catch(function (err) {
						console.log('\x1b[38m%s\x1b[0m', 'BANNING PEER AFTER WRONG RESPONSE', procedureName);
						return setImmediate(cb, err);
					});
			}).catch(function (err) {
				console.log('\x1b[38m%s\x1b[0m', 'RPC CLIENT - Connection rejected by failed handshake', procedureName, data, err);
				// socketReady = Q.defer();
				return setImmediate(cb, 'RPC CLIENT - Connection rejected by failed handshake procedure --- ', procedureName, err);
			});
		};
	};
};

WsRPCClient.prototype.clientStub = function (handler) {
	try {
		var wsServer = WsRPCServer.getServer();
	} catch (wsServerNotInitializedException) {
		return {};
	}

	return _.reduce(Object.assign({}, wsServer.endpoints.rpc, wsServer.endpoints.event),
		function (availableCalls, procedureHandler, procedureName) {
			availableCalls[procedureName] = handler(procedureName);
			return availableCalls;
		}, {});
};

module.exports = {
	WsRPCClient: WsRPCClient,
	WsRPCServer: WsRPCServer
};