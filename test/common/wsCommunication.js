'use strict';

var _ = require('lodash');
var Q = require('q');
var WsRPCClient = require('../../api/RPC').WsRPCClient;
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
	},

	// Get the given path
	call: function (procedure, data, done) {
		done = _.isFunction(_.last(arguments)) ? _.last(arguments) : _.noop();
		data = !_.isFunction(arguments[1]) ? arguments[1] : {};

		if (!this.defaultSocketDefer) {
			this.defaultSocketDefer = Q.defer();
			this.connect('127.0.0.1', 4000, this.defaultSocketDefer);
			this.caller = WsRPCClient.prototype.sendAfterSocketReadyCb(this.defaultSocketDefer);
		}

		return this.caller(procedure)(data, done);

	},

	// Adds peers to local node
	addPeers: function (numOfPeers, ip, cb) {

		var peersConnectionsDefers = Array.apply(null, new Array(numOfPeers)).map(function () {
			var socketDefer = Q.defer();
			this.connect(ip, node.randomizeSelection(1000) + 4001, socketDefer);
			return socketDefer;
		}.bind(this));

		Q.all(peersConnectionsDefers.map(function (peerDefer) {	return peerDefer.promise; }))
			.then(function (results) {
				return cb(null, results);
			})
			.catch(function (err) {
				return cb(err);
			});
	}
};

module.exports = wsCommunication;
