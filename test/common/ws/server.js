'use strict';

var randomstring = require('randomstring');
var sinon = require('sinon');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var SocketCluster = require('socketcluster');

var testConfig = require('../../data/config.json');

var wsServer = {
	validNonce: randomstring.generate(16),
	testSocketCluster: null,
	testWampServer: null,

	start: function () {
		if (this.socketCluster) {
			throw new Error('SocketCluster instance is already running');
		}
		this.socketCluster = new SocketCluster(this.options);
	},

	stop: function () {
		if (!this.socketCluster) {
			throw new Error('No SocketCluster instance running');
		}
		this.socketCluster.killWorkers();
		this.socketCluster.killBrokers();
		this.socketCluster = null;
	},

	// Invoked by each worker
	run: function (worker) {
		console.log('run invoked');
		var scServer = worker.scServer;
		this.rpcServer = new WAMPServer();
		this.rpcServer.registerRPCEndpoints(this.necessaryRPCEndpoints);
		scServer.on('connection', function (socket) {
			this.rpcServer.upgradeToWAMP(socket);
			socket.emit('accepted');
		}.bind(this));
	},

	necessaryRPCEndpoints: {
		status: sinon.stub().callsArgWith(1, {success: true, height: 1, broadhash: testConfig.nethash, nonce: testConfig.nethash}),
		list: sinon.stub().callsArgWith(1, {peers: []}),
		blocks:  sinon.stub().callsArgWith(1, {blocks: []}),
		getSignatures:  sinon.stub().callsArgWith(1, {signatures: []}),
		getTransactions:  sinon.stub().callsArgWith(1, {transactions: []}),
		updateMyself:  sinon.stub().callsArgWith(1, null),
		postTransactions: sinon.stub().callsArgWith(1, null),
		postSignatures: sinon.stub().callsArgWith(1, null),
		postBlock: sinon.stub().callsArgWith(1, sinon.stub().callsArg(1)),
		blocksCommon: sinon.stub().callsArgWith(1, {success: true, common: null})
	},

	options: {
		workers: 1,
		port: 9999,
		wsEngine: 'uws',
		appName: 'testWSServer',
		secretKey: 'liskSecretKey',
		workerController: __dirname + '/server.js'
	}
};

module.exports = wsServer;
