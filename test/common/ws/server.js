'use strict';

var randomstring = require('randomstring');
var sinon = require('sinon');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var SocketCluster = require('socketcluster').SocketCluster;

var testConfig = require('../../data/config.json');

var wsServer = {
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
		console.log('run invoked');
		var scServer = worker.scServer;
		this.testWampServer = new WAMPServer();
		this.testWampServer.registerRPCEndpoints(this.necessaryRPCEndpoints);
		scServer.on('connection', function (socket) {
			this.testWampServer.upgradeToWAMP(socket);
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
