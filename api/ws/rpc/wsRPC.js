'use strict';

var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var Q = require('q');
var _ = require('lodash');
var constants = require('../../../helpers/constants');

var wsRPC = {

	clientsConnectionsMap: {},
	scClient: scClient,
	wampClient: new WAMPClient(),
	wsServer: null,

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
		if (!wsRPC.wsServer) {
			throw new Error('WS server haven\'t been initialized!');
		}
		return wsRPC.wsServer;
	},
	/**
	 * @param {string} ip
	 * @param {number} port
	 * @returns {ClientRPCStub} {[string]: function} map where keys are all procedures registered
	 */
	getClientRPCStub: function (ip, port) {
		if (!ip || !port) {
			throw new Error('RPC client needs ip and port to establish WS connection with: ' + ip + ':' + port);
		}

		var address = ip + ':' + port;
		var connectionState = this.clientsConnectionsMap[address];

		//first time init || previously rejected
		if (!connectionState || connectionState.status === ConnectionState.STATUS.DISCONNECTED) {
			connectionState = new ConnectionState(ip, port);
			this.clientsConnectionsMap[address] = connectionState;
		}
		return connectionState.stub;
	}
};

ConnectionState.STATUS = {
	NEW: 1,
	PENDING: 2,
	ESTABLISHED: 3,
	DISCONNECTED: 4
};

function ConnectionState (ip, port) {
	this.ip = ip;
	this.port = +port;
	this.status = ConnectionState.STATUS.NEW;
	this.socketDefer = Q.defer();
	this.stub = new ClientRPCStub(this);
}

ConnectionState.prototype.reconnect = function () {
	this.status = ConnectionState.STATUS.PENDING;
	this.socketDefer = Q.defer();
};

ConnectionState.prototype.reject = function (reason) {
	this.status = ConnectionState.STATUS.DISCONNECTED;
	this.socketDefer.reject(reason);
};

ConnectionState.prototype.resolve = function (socket) {
	this.status = ConnectionState.STATUS.ESTABLISHED;
	this.socketDefer.resolve(socket);
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
		var wsServer = wsRPC.getServer();
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
		port: connectionState.port,
		protocol: 'http',
		autoReconnect: true,
		query: constants.getConst('headers')
	};

	var clientSocket = wsRPC.scClient.connect(options);
	wsRPC.wampClient.upgradeToWAMP(clientSocket);


	clientSocket.on('connect', function () {
		return connectionState.resolve(clientSocket);
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

			if (connectionState.status === ConnectionState.STATUS.NEW || connectionState.status === ConnectionState.STATUS.DISCONNECTED) {
				connectionState.reconnect();
				ClientRPCStub.prototype.initializeNewConnection(connectionState);
			}

			connectionState.socketDefer.promise.then(function (socket) {
				return socket.wampSend(procedureName, data)
					.then(function (res) {
						return setImmediate(cb, null, res);
					})
					.catch(function (err) {
						return setImmediate(cb, err);
					});
			}).catch(function (err) {
				return setImmediate(cb, err);
			});
		};
	};
};

module.exports = {
	wsRPC: wsRPC,
	ConnectionState: ConnectionState,
	ClientRPCStub: ClientRPCStub
};
