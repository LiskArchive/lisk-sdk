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

var _ = require('lodash');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var failureCodes = require('../../../api/ws/rpc/failureCodes');
var PeerUpdateError = require('../../../api/ws/rpc/failureCodes').PeerUpdateError;
var PromiseDefer = require('../../../helpers/promiseDefer');
var System = require('../../../modules/system');

var wsServer = null;

var wsRPC = {

	clientsConnectionsMap: {},
	scClient: scClient,
	wampClient: new WAMPClient(),

	/**
	 * @param {MasterWAMPServer} __wsServer
	 */
	setServer: function (__wsServer) {
		wsServer = __wsServer;
	},

	/**
	 * @throws {Error} if WS server has not been initialized yet
	 * @returns {MasterWAMPServer} wsServer
	 */
	getServer: function () {
		if (!wsServer) {
			throw new Error('WS server has not been initialized!');
		}
		return wsServer;
	},
	/**
	 * @param {string} ip
	 * @param {number} port
	 * @returns {ClientRPCStub} {[string]: function} map where keys are all procedures registered
	 */
	getClientRPCStub: function (ip, port) {
		if (!ip || !port) {
			throw new Error(`RPC client needs ip and port to establish WS connection with: ${ip}:${port}`);
		}

		var address = `${ip}:${port}`;
		var connectionState = this.clientsConnectionsMap[address];

		// first time init || previously rejected
		if (!connectionState || connectionState.status === ConnectionState.STATUS.DISCONNECTED) {
			connectionState = new ConnectionState(ip, port);
			this.clientsConnectionsMap[address] = connectionState;
		}
		return connectionState.stub;
	},

	/**
	 * @throws {Error} if WS server has not been initialized yet
	 * @returns {MasterWAMPServer} wsServer
	 */
	getServerAuthKey: function () {
		if (!wsServer) {
			throw new Error('WS server has not been initialized!');
		}
		return wsServer.socketCluster.options.authKey;
	}
};

ConnectionState.STATUS = {
	NEW: 1,
	PENDING: 2,
	ESTABLISHED: 3,
	DISCONNECTED: 4
};

function ConnectionState(ip, port) {
	this.ip = ip;
	this.port = +port;
	this.status = ConnectionState.STATUS.NEW;
	this.socketDefer = PromiseDefer();
	this.stub = new ClientRPCStub(this);
}

ConnectionState.prototype.reconnect = function () {
	this.status = ConnectionState.STATUS.PENDING;
	this.socketDefer = PromiseDefer();
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
	var wsServer;
	try {
		wsServer = wsRPC.getServer();
	} catch (wsServerNotInitializedException) {
		return {};
	}

	return _.reduce(Object.assign({}, wsServer.endpoints.rpc, wsServer.endpoints.event),
		(availableCalls, procedureHandler, procedureName) => {
			availableCalls[procedureName] = this.sendAfterSocketReadyCb(connectionState)(procedureName);
			return availableCalls;
		}, {});
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
		query: System.getHeaders()
	};

	var clientSocket = wsRPC.scClient.connect(options);
	wsRPC.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('accepted', () => connectionState.resolve(clientSocket));

	clientSocket.on('error', () => {
		clientSocket.disconnect();
	});

	clientSocket.on('connectAbort', () => {
		connectionState.reject(new PeerUpdateError(failureCodes.HANDSHAKE_ERROR, failureCodes.errorMessages[failureCodes.HANDSHAKE_ERROR]));
	});

	clientSocket.on('disconnect', (code, description) => {
		connectionState.reject(new PeerUpdateError(code, failureCodes.errorMessages[code], description));
	});
};

/**
 * @param {ConnectionState} connectionState
 * @returns {function} function to be called with procedure, to be then called with optional argument and/or callback
 */
ClientRPCStub.prototype.sendAfterSocketReadyCb = function (connectionState) {
	return function (procedureName) {
		/**
		 * @param {Object} data [data={}] argument passed to procedure
		 */
		return function (data, cb) {
			cb = _.isFunction(cb) ? cb : _.isFunction(data) ? data : function () {};
			data = (data && !_.isFunction(data)) ? data : {};

			if (connectionState.status === ConnectionState.STATUS.NEW || connectionState.status === ConnectionState.STATUS.DISCONNECTED) {
				connectionState.reconnect();
				ClientRPCStub.prototype.initializeNewConnection(connectionState);
			}

			connectionState.socketDefer.promise.timeout(1000).then(socket => socket.wampSend(procedureName, data)
					.then(res => setImmediate(cb, null, res))
					.catch(err => setImmediate(cb, err))).catch(err => {
				if (err && err.name === 'TimeoutError') {
					err = new PeerUpdateError(failureCodes.CONNECTION_TIMEOUT, failureCodes.errorMessages[failureCodes.CONNECTION_TIMEOUT]);
				}
				return setImmediate(cb, err);
			});
		};
	};
};

var remoteAction = function () {
	throw new Error('Function invoked on master instead of slave process');
};

var slaveRPCStub = {
	updateMyself: remoteAction
};

module.exports = {
	wsRPC: wsRPC,
	ConnectionState: ConnectionState,
	ClientRPCStub: ClientRPCStub,
	slaveRPCStub: slaveRPCStub
};
