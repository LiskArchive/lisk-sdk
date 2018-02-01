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

var failureCodes = require('./failure_codes');
var PeerUpdateError = require('./failure_codes').PeerUpdateError;
var PromiseDefer = require('../../../helpers/promise_defer');
var System = require('../../../modules/system');

var wsServer = null;

/**
 * Description of the module.
 *
 * @module
 * @see Parent: {@link api.ws.rpc}
 * @requires lodash
 * @requires socketcluster-client
 * @requires wamp-socket-cluster/WAMPClient
 * @requires wamp-socket-cluster/MasterWAMPServe
 * @requires api/ws/rpc/failureCodes
 * @requires helpers/promiseDefer
 * @requires modules/system
 * @todo: Add description of the module
 */

/**
 * @alias module:api/ws/rpc/wsRPC
 */
var wsRPC = {
	clientsConnectionsMap: {},
	scClient: scClient,
	wampClient: new WAMPClient(),

	/**
	 * Description of the function.
	 *
	 * @param {Object} __wsServer - Description of the param
	 * @todo: Add description of the function and its parameters
	 */
	setServer: function(__wsServer) {
		wsServer = __wsServer;
	},

	/**
	 * Description of the function.
	 *
	 * @throws {Error} if WS server has not been initialized yet
	 * @returns {MasterWAMPServer} wsServer
	 * @todo: Add description of the function
	 */
	getServer: function() {
		if (!wsServer) {
			throw new Error('WS server has not been initialized!');
		}
		return wsServer;
	},
	/**
	 * Description of the function.
	 *
	 * @param {string} ip - Description of the param
	 * @param {number} port - Description of the param
	 * @returns {Object} Map where keys are all procedures registered
	 * @todo: Add description of the function and its parameters
	 */
	getClientRPCStub: function(ip, port) {
		if (!ip || !port) {
			throw new Error(
				`RPC client needs ip and port to establish WS connection with: ${ip}:${port}`
			);
		}

		var address = `${ip}:${port}`;
		var connectionState = this.clientsConnectionsMap[address];

		// first time init || previously rejected
		if (
			!connectionState ||
			connectionState.status === ConnectionState.STATUS.DISCONNECTED
		) {
			connectionState = new ConnectionState(ip, port);
			this.clientsConnectionsMap[address] = connectionState;
		}
		return connectionState.stub;
	},

	/**
	 * Description of the function.
	 *
	 * @throws {Error} if WS server has not been initialized yet
	 * @returns {Object} wsServer
	 * @todo: Add description of the function
	 */
	getServerAuthKey: function() {
		if (!wsServer) {
			throw new Error('WS server has not been initialized!');
		}
		return wsServer.socketCluster.options.authKey;
	},
};

ConnectionState.STATUS = {
	NEW: 1,
	PENDING: 2,
	ESTABLISHED: 3,
	DISCONNECTED: 4,
};

/**
 * Description of the function.
 *
 * @class
 * @memberof module:api/ws/rpc/wsRPC
 * @param {string} ip - Description of the param
 * @param {number} port - Description of the param
 * @todo: Add description of the function and its parameters
 */
function ConnectionState(ip, port) {
	this.ip = ip;
	this.port = +port;
	this.status = ConnectionState.STATUS.NEW;
	this.socketDefer = PromiseDefer();
	this.stub = new ClientRPCStub(this);
}

/**
 * Description of the function.
 *
 * @memberof module:api/ws/rpc/wsRPC.ConnectionState
 * @param {string} ip - Description of the param
 * @param {number} port - Description of the param
 * @todo: Add description of the function and its parameters
 */
ConnectionState.prototype.reconnect = function() {
	this.status = ConnectionState.STATUS.PENDING;
	this.socketDefer = PromiseDefer();
};

/**
 * Description of the function.
 *
 * @memberof module:api/ws/rpc/wsRPC.ConnectionState
 * @param {string} ip - Description of the param
 * @param {number} port - Description of the param
 * @todo: Add description of the function and its parameters
 */
ConnectionState.prototype.reject = function(reason) {
	this.status = ConnectionState.STATUS.DISCONNECTED;
	this.socketDefer.reject(reason);
};

/**
 * Description of the function.
 *
 * @memberof module:api/ws/rpc/wsRPC.ConnectionState
 * @param {string} ip - Description of the param
 * @param {number} port - Description of the param
 * @todo: Add description of the function and its parameters
 */
ConnectionState.prototype.resolve = function(socket) {
	this.status = ConnectionState.STATUS.ESTABLISHED;
	this.socketDefer.resolve(socket);
};

/**
 * The stub of all RPC methods registered on WS server.
 *
 * @class ClientRPCStub
 * @memberof module:api/ws/rpc/wsRPC
 * @param {Object} connectionState - Description of the param
 * @example
 * // methodA registered on WS server can be called by a client by simply:
 * sampleClientStub.methodA(exampleArg, cb);
 * @returns {Object} clientStub
 * @todo: Add descriptions of its parameters
 */
var ClientRPCStub = function(connectionState) {
	var wsServer;
	try {
		wsServer = wsRPC.getServer();
	} catch (wsServerNotInitializedException) {
		return {};
	}

	return _.reduce(
		Object.assign({}, wsServer.endpoints.rpc, wsServer.endpoints.event),
		(availableCalls, procedureHandler, procedureName) => {
			availableCalls[procedureName] = this.sendAfterSocketReadyCb(
				connectionState
			)(procedureName);
			return availableCalls;
		},
		{}
	);
};

/**
 * Description of the function.
 *
 * @memberof module:api/ws/rpc/wsRPC.ClientRPCStub
 * @param {Object} connectionState - Description of the param
 * @todo: Add description of the function and its parameters
 * @todo: Document this as an instance method (not static)
 */
ClientRPCStub.prototype.initializeNewConnection = function(connectionState) {
	var options = {
		hostname: connectionState.ip,
		port: connectionState.port,
		protocol: 'http',
		autoReconnect: true,
		query: System.getHeaders(),
	};

	var clientSocket = wsRPC.scClient.connect(options);
	wsRPC.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('accepted', () => connectionState.resolve(clientSocket));

	clientSocket.on('error', () => {
		clientSocket.disconnect();
	});

	clientSocket.on('connectAbort', () => {
		connectionState.reject(
			new PeerUpdateError(
				failureCodes.HANDSHAKE_ERROR,
				failureCodes.errorMessages[failureCodes.HANDSHAKE_ERROR]
			)
		);
	});

	clientSocket.on('disconnect', (code, description) => {
		connectionState.reject(
			new PeerUpdateError(code, failureCodes.errorMessages[code], description)
		);
	});
};

/**
 * Description of the function.
 *
 * @memberof module:api/ws/rpc/wsRPC.ClientRPCStub
 * @param {Object} connectionState
 * @returns {function} function to be called with procedure, to be then called with optional argument and/or callback
 * @todo: Add description of the function and its parameters
 * @todo: Document this as an instance method (not static)
 */
ClientRPCStub.prototype.sendAfterSocketReadyCb = function(connectionState) {
	return function(procedureName) {
		/**
		 * @param {Object} data [data={}] argument passed to procedure
		 */
		return function(data, cb) {
			cb = _.isFunction(cb) ? cb : _.isFunction(data) ? data : function() {};
			data = data && !_.isFunction(data) ? data : {};

			if (
				connectionState.status === ConnectionState.STATUS.NEW ||
				connectionState.status === ConnectionState.STATUS.DISCONNECTED
			) {
				connectionState.reconnect();
				ClientRPCStub.prototype.initializeNewConnection(connectionState);
			}

			connectionState.socketDefer.promise
				.timeout(1000)
				.then(socket =>
					socket
						.wampSend(procedureName, data)
						.then(res => setImmediate(cb, null, res))
						.catch(err => setImmediate(cb, err))
				)
				.catch(err => {
					if (err && err.name === 'TimeoutError') {
						err = new PeerUpdateError(
							failureCodes.CONNECTION_TIMEOUT,
							failureCodes.errorMessages[failureCodes.CONNECTION_TIMEOUT]
						);
					}
					return setImmediate(cb, err);
				});
		};
	};
};

var remoteAction = function() {
	throw new Error('Function invoked on master instead of slave process');
};

var slaveRPCStub = {
	updateMyself: remoteAction,
};

module.exports = {
	wsRPC: wsRPC,
	ConnectionState: ConnectionState,
	ClientRPCStub: ClientRPCStub,
	slaveRPCStub: slaveRPCStub,
};
