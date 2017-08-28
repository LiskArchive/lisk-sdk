'use strict';

var randomstring = require('randomstring');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var SocketCluster = require('socketcluster').SocketCluster;
var testConfig = require('../config.json');

var wsServer = {
	port: 9999,
	validNonce: randomstring.generate(16),
	testSocketCluster: null,
	testWampServer: null,

	start: function () {
		if (this.testSocketCluster) {
			throw new Error('SocketCluster instance is already running');
		}
		this.testSocketCluster = new SocketCluster(this.options);
	},

	stop: function () {
		if (!this.testSocketCluster) {
			throw new Error('No SocketCluster instance running');
		}
		this.testSocketCluster.killWorkers();
		this.testSocketCluster.killBrokers();
		this.testSocketCluster = null;
	},

	// Invoked by each worker
	run: function (worker) {
		var scServer = worker.scServer;
		this.testWampServer = new WAMPServer();
		scServer.on('connection', function () {
			this.testWampServer.registerRPCEndpoints(this.necessaryRPCEndpoints);
		}.bind(this));
	},

	necessaryRPCEndpoints: {
		status: function (query, cb) {
			return cb(null, {success: true, height: 1, broadhash: testConfig.nethash, nonce: testConfig.nethash});
		},

		list: function (query, cb) {
			return cb(null, {success: true, peers: []});
		},
		updateMyself: function (query, cb) {
			return cb(null);
		}
	},

	options: {
		workers: 1,
		port: this.port,
		wsEngine: 'uws',
		appName: 'testWSServer',
		workerController: __dirname + '/wsServer.js'
	}
};

module.exports = wsServer;
