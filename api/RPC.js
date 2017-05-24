'use strict';

var Q = require('q');
var _ = require('lodash');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
var constants = require('../helpers/constants');

var CONNECTION_STATUS = {
	NEW: 1,
	PENDING: 2,
	ESTABLISHED: 3,
	DISCONNECTED: 4
};

function ConnectionState (ip, port) {
	console.log('CONNECTION STAATE CONSRTRUCTOR FIRED');
	this.ip = ip;
	this.port = +port;
	this.status = CONNECTION_STATUS.NEW;
	this.socketDefer = Q.defer();
	this.stub = new ClientRPCStub(this);
}

ConnectionState.prototype.reconnect = function () {
	this.status = CONNECTION_STATUS.PENDING;
	this.socketDefer = Q.defer();
};

ConnectionState.prototype.reject = function (reason) {
	this.status = CONNECTION_STATUS.DISCONNECTED;
	this.socketDefer.reject(reason);
};

ConnectionState.prototype.resolve = function (socket) {
	this.status = CONNECTION_STATUS.ESTABLISHED;
	this.socketDefer.resolve(socket);
};

var WsRPCServer = {

	wsServer: null,
	wampClient: new WAMPClient(),
	scClient: scClient,
	clientsConnectionsMap: {},

	/**
	 * @param {MasterWAMPServer} wsServer
	 */
	setServer: function (wsServer) {
		this.wsServer = wsServer;
	},

	/**
	 * @throws {Error} thrown if wsServer haven't been initialized before
	 * @returns {MasterWAMPServer} wsServer
	 */
	getServer: function () {
		if (!this.wsServer) {
			throw new Error('WS server haven\'t been initialized!');
		}
		return this.wsServer;
	},
	/**
	 * @param {string} ip
	 * @param {number} port
	 * @returns {ClientRPCStub} {[string]: function} map where keys are all procedures registered
	 */
	getClientRPCStub: function (ip, port) {
		console.trace('New client RPC created: ', ip, port);
		if (!ip || !port) {
			throw new Error('WsRPCClient needs ip and port to establish WS connection.');
		}

		var address = ip + ':' + port;
		var connectionState = WsRPCServer.clientsConnectionsMap[address];

		//first time init || previously rejected
		if (!connectionState || connectionState.status === CONNECTION_STATUS.DISCONNECTED) {
			connectionState = new ConnectionState(ip, port);
			WsRPCServer.clientsConnectionsMap[address] = connectionState;
		}

		return connectionState.stub;
	}

};

/**
 * The stub of all RPC methods registered on WS server
 * Example:
 * methodA registered on WS server can be called by a client by simply:
 * sampleClientStub.methodA(exampleArg, cb);
 *
 * @typedef {Object} clientStub
 * @property {function} procedure - procedure that will be called with argument and callback
 */


/**
 * @param {ConnectionState} connectionState
 * @returns {clientStub}
 */
var ClientRPCStub = function (connectionState) {
	try {
		var wsServer = WsRPCServer.getServer();
	} catch (wsServerNotInitializedException) {
		return {};
	}

	return _.reduce(Object.assign({}, wsServer.endpoints.rpc, wsServer.endpoints.event),
		function (availableCalls, procedureHandler, procedureName) {
			availableCalls[procedureName] = this.sendAfterSocketReadyCb(connectionState)(procedureName);
			return availableCalls;
		}.bind(this), {});
};


/**
 * @param {ConnectionState} connectionState
 */
ClientRPCStub.prototype.initializeNewConnection = function (connectionState) {

	var options = {
		hostname: connectionState.ip,
		port: connectionState.port + 1000,
		protocol: 'http',
		autoReconnect: true,
		query: constants.getConst('headers')
	};

	console.trace('\x1b[33m%s\x1b[0m', 'RPC CLIENT -- CONNECT ATTEMPT TO', options.hostname, options.port);
	var clientSocket = WsRPCServer.scClient.connect(options);
	WsRPCServer.wampClient.upgradeToWAMP(clientSocket);


	clientSocket.on('connect', function () {
		if (!constants.externalAddress) {
			clientSocket.wampSend('list', {query: {
				nonce: options.query.nonce
			}}).then(function (res) {
				console.trace('\x1b[33m%s\x1b[0m', 'RPC CLIENT -- ME AS PEER: ', res.peers[0]);
				constants.setConst('externalAddress', res.peers[0].ip);
				connectionState.resolve(clientSocket);
			}).catch(function (err) {
				clientSocket.disconnect();
				connectionState.reject('Connection rejected when asking of peers list');
			});
		} else {
			return connectionState.resolve(clientSocket);
		}
	});

	clientSocket.on('error', function () {
		clientSocket.disconnect();
	});

	clientSocket.on('connectAbort', function (err, data) {
		connectionState.reject('Connection rejected by failed handshake procedure');
	});

	clientSocket.on('disconnect', function () {
		connectionState.reject('Connection disconnected');
	});
};

/**
 * @param {ConnectionState} connectionState
 * @returns {function} function to be called with procedure, to be then called with optional argument and/or callback
 */
ClientRPCStub.prototype.sendAfterSocketReadyCb = function (connectionState) {
	return function (procedureName) {
		/**
		 * @param {object} data [data={}] argument passed to procedure
		 * @param {function} cb [cb=function(){}] cb
		 */
		return function (data, cb) {
			cb = _.isFunction(cb) ? cb : _.isFunction(data) ? data : function () {};
			data = (data && !_.isFunction(data)) ? data : {};
			console.log('\x1b[33m%s\x1b[0m', 'RPC CLIENT -- ASK ABOUT PROCEDURE: ', procedureName, connectionState);

			if (connectionState.status === CONNECTION_STATUS.NEW || connectionState.status === CONNECTION_STATUS.DISCONNECTED) {
				connectionState.reconnect();
				ClientRPCStub.prototype.initializeNewConnection(connectionState);
			}

			connectionState.socketDefer.promise.then(function (socket) {
				console.log('\x1b[33m%s\x1b[0m', 'CONNECTION STATE RESOLVED FOR PEER: ASKING FOR PROCEDURE ', procedureName, connectionState.ip + ':' + connectionState.port);
				return socket.wampSend(procedureName, data)
					.then(function (res) {
						return setImmediate(cb, null, res);
					})
					.catch(function (err) {
						return setImmediate(cb, err);
					});
			}).catch(function (err) {
				console.log('\x1b[33m%s\x1b[0m', 'CONNECTION STATE RESOLVED REJECTED', err);
				return setImmediate(cb, err);
			});
		};
	};
};

module.exports = {
	WsRPCServer: WsRPCServer
};
