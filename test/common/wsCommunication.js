'use strict';

var _ = require('lodash');
var Q = require('q');
var constants = require('../../helpers/constants');
var ClientRPCStub = require('../../api/ws/rpc/clientRPCStub');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var wampClient = new WAMPClient();

var node = require('../node');

var wsCommunication = {

	defaultSocketDefer: null,

	connect: function (ip, port, socketDefer, headers) {

		var wsOptions = {
			protocol: 'http',
			hostname: ip || '127.0.0.1',
			port: +port + 1000 || 5000,
			autoReconnect: true,
			query: headers !== undefined ? headers : node.generatePeerHeaders(ip, port)
		};

		console.log(wsOptions);

		var socket = scClient.connect(wsOptions);

		wampClient.upgradeToWAMP(socket);

		socket.on('connectAbort', function (err) {
			return socketDefer.reject(err);
		});

		socket.on('connect', function () {
			return socketDefer.resolve(socket);
		});

		socket.on('error', function (err) {
			console.log(err);
		});

		constants.setConst('headers', wsOptions.query);
	},

	// Get the given path
	call: function (procedure, data, done, includePeer) {
		if (!this.defaultSocketDefer) {
			this.defaultSocketDefer = Q.defer();
			this.defaultSocketPeerHeaders = node.generatePeerHeaders('127.0.0.1', 4000);
			this.connect('127.0.0.1', 4000, this.defaultSocketDefer);
			this.caller = ClientRPCStub.prototype.sendAfterSocketReadyCb('127.0.0.1', 4000, this.defaultSocketDefer);
		}
		if (includePeer && typeof data == 'object') {
			data.peer =  _.assign({
				ip: '127.0.0.1',
				port: 4000
			}, this.defaultSocketPeerHeaders);
		}

		return this.caller(procedure)(data, done);
	},

	// Adds peers to local node
	addPeers: function (numOfPeers, ip, cb) {

		var peersConnectionsDefers = Array.apply(null, new Array(numOfPeers)).map(function () {
			var socketDefer = Q.defer();
			this.connect(ip, node.randomizeSelection(1000) + 4001, socketDefer, this.defaultSocketPeerHeaders);
			return socketDefer;
		}.bind(this));

		Q.all(peersConnectionsDefers.map(function (peerDefer) {	return peerDefer.promise; }))
			.then(function (results) {
				return cb(null, results);
			})
			.catch(function (err) {
				return cb(err);
			});
	},

	// Adds peer to local node
	addPeer: function (ip, port, cb) {

		var socketDefer = Q.defer();
		this.connect(ip, port, socketDefer);

		socketDefer.promise.then(function () {
			return cb();
		}).catch(function (err) {
			return cb(err);
		});
	}
};

module.exports = wsCommunication;
