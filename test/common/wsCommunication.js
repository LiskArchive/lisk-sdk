'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var PromiseDefer = require('../../helpers/promiseDefer');
var ClientRPCStub = require('../../api/ws/rpc/wsRPC').ClientRPCStub;
var ConnectionState = require('../../api/ws/rpc/wsRPC').ConnectionState;
var System = require('../../modules/system');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var wampClient = new WAMPClient();

var node = require('../node');

var wsCommunication = {

	defaultConnectionState: null,

	connect: function (ip, port, socketDefer, headers) {

		var wsOptions = {
			protocol: 'http',
			hostname: ip || '127.0.0.1',
			port: +port || 9999,
			autoReconnect: true,
			query: headers !== undefined ? headers : node.generatePeerHeaders(ip, port)
		};

		var socket = scClient.connect(wsOptions);

		wampClient.upgradeToWAMP(socket);

		socket.on('connectAbort', function (err) {
			return socketDefer.reject(err);
		});

		socket.on('connect', function () {
			return socketDefer.resolve(socket);
		});

		socket.on('error', function (err) {
			console.log('Client WS connection error: code - ', err.code, 'message: ', err.message);
		});
	},

	// Get the given path
	call: function (procedure, data, done, includePeer) {
		if (!this.defaultConnectionState) {
			this.defaultConnectionState = new ConnectionState('127.0.0.1', 5000);
			this.defaultSocketPeerHeaders = node.generatePeerHeaders('127.0.0.1', 9999);
			System.setHeaders(this.defaultSocketPeerHeaders);
			this.caller = ClientRPCStub.prototype.sendAfterSocketReadyCb(this.defaultConnectionState);
		}
		if (includePeer && typeof data === 'object') {
			data.peer =  _.assign({
				ip: '127.0.0.1',
				port: 9999
			}, this.defaultSocketPeerHeaders);
		}

		return this.caller(procedure)(data, done);
	},

	// Adds peers to local node
	addPeers: function (numOfPeers, ip, cb) {

		var peersConnectionsDefers = Array.apply(null, new Array(numOfPeers)).map(function () {
			var socketDefer = PromiseDefer();
			this.connect(ip, 5000, socketDefer, node.generatePeerHeaders(ip, node.randomizeSelection(1000) + 4001));
			return socketDefer;
		}.bind(this));

		Promise.all(peersConnectionsDefers.map(function (peerDefer) {	return peerDefer.promise; }))
			.then(function (results) {
				return cb(null, results);
			})
			.catch(function (err) {
				return cb(err);
			});
	},

	// Adds peer to local node
	addPeer: function (ip, port, cb) {

		var socketDefer = PromiseDefer();
		this.connect(ip, port, socketDefer);

		socketDefer.promise.then(function () {
			return cb();
		}).catch(function (err) {
			return cb(err);
		});
	}
};

module.exports = wsCommunication;
