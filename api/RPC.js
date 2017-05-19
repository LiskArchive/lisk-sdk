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
		WsRPCServer.wsClientsConnectionsMap[address] = socketDefer;
	}

	return this.clientStub(this.sendAfterSocketReadyCb(ip, port, socketDefer));
}

/**
 * @param {object} options
 * @param {Q.defer} socketDefer
 */
WsRPCClient.prototype.initializeNewConnection = function (options, socketDefer) {

	var clientSocket = WsRPCServer.scClient.connect(options);

	WsRPCServer.wampClient.upgradeToWAMP(clientSocket);

	socketDefer.promise.initialized = true;

	clientSocket.on('connect', function () {
		if (!constants.externalAddress) {
			clientSocket.wampSend('list', {query: {
				nonce: options.query.nonce
			}}).then(function (res) {
				constants.setConst('externalAddress', res.peers[0].ip);
				return socketDefer.resolve(clientSocket);
			}).catch(function (err) {
				clientSocket.disconnect();
				return socketDefer.reject(err);
			});
		} else {
			return socketDefer.resolve(clientSocket);
		}
	});

	clientSocket.on('error', function () {
		clientSocket.disconnect();
	});

	clientSocket.on('connectAbort', function (err, data) {
		socketDefer.reject(err);
	});

	clientSocket.on('disconnect', function () {
		socketDefer.reject();
	});
};

/**
 * @param {string} ip
 * @param {number|string} port
 * @param {Q.defer} socketDefer
 * @returns {function} function to be called with procedure, to be then called with optional argument and/or callback
 */
WsRPCClient.prototype.sendAfterSocketReadyCb = function (ip, port, socketDefer) {
	return function (procedureName) {
		/**
		 * @param {object} data [data={}] argument passed to procedure
		 * @param {function} cb [cb=function(){}] cb
		 */
		return function (data, cb) {
			cb = _.isFunction(cb) ? cb : _.isFunction(data) ? data : function () {};
			data = (data && !_.isFunction(data)) ? data : {};
			if (!socketDefer.promise.initialized) {
				WsRPCClient.prototype.initializeNewConnection({
					hostname: ip,
					port: +port + 1000,
					protocol: 'ws',
					autoReconnect: true,
					query: constants.getConst('headers')
				}, socketDefer);
			}

			socketDefer.promise.then(function (socket) {
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
