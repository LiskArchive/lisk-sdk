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
	}

};

/**
 * @param {string} ip
 * @param {number} port
 * @returns {clientStub} {[string]: function} map where keys are all procedures registered
 * @constructor
 */
function WsRPCClient (ip, port) {

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
		WsRPCServer.wsClientsConnectionsMap[address] = socketDefer;
	}

	return this.clientStub(this.sendAfterSocketReadyCb(socketDefer));
}

/**
 * @param {object} options
 * @param {string} address
 * @param {Q.defer} socketReady
 */
WsRPCClient.prototype.initializeNewConnection = function (options, address, socketReady) {

	var clientSocket = WsRPCServer.scClient.connect(options);

	WsRPCServer.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('connect', function () {
		if (!constants.externalAddress) {
			clientSocket.wampSend('list', {query: {
				nonce: options.query.nonce
			}}).then(function (res) {
				constants.setConst('externalAddress', res.peers[0].ip);
				return socketReady.resolve(clientSocket);
			}).catch(function (err) {
				clientSocket.disconnect();
				return socketReady.reject(err);
			});
		} else {
			return socketReady.resolve(clientSocket);
		}
	});

	clientSocket.on('error', function () {
		clientSocket.disconnect();
	});

	clientSocket.on('connectAbort', function (err, data) {
		socketReady.reject(err);
	});

	clientSocket.on('disconnect', function () {
		socketReady.reject();
	});
};

/**
 * @param {Q.defer} socketReady
 * @returns {function} function to be called with procedure, to be then called with optional argument and/or callback
 */
WsRPCClient.prototype.sendAfterSocketReadyCb = function (socketReady) {
	return function (procedureName) {
		/**
		 * @param {object} data [data={}] argument passed to procedure
		 * @param {function} cb [cb=function(){}] cb
		 */
		return function (data, cb) {
			cb = _.isFunction(cb) ? cb : _.isFunction(data) ? data : function () {};
			data = (data && !_.isFunction(data)) ? data : {};
			socketReady.promise.then(function (socket) {
				return socket.wampSend(procedureName, data)
					.then(function (res) {
						return setImmediate(cb, null, res);
					})
					.catch(function (err) {
						return setImmediate(cb, err);
					});
			}).catch(function (err) {
				return setImmediate(cb, 'RPC CLIENT - Connection rejected by failed handshake procedure');
			});
		};
	};
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
 * @param {function} handler
 * @returns {clientStub}
 */
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
