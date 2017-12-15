'use strict';

var randomstring = require('randomstring');
var SocketCluster = require('socketcluster');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
var sinon = require('sinon');

function WSServer (headers) {
	this.headers = headers;

	this.validNonce = randomstring.generate(16);
	this.socketCluster = null;
	this.rpcServer =  null;

	this.options = {
		workers: 0,
		port: this.headers.wsPort,
		wsEngine: 'uws',
		appName: 'LiskTestServer-' + randomstring.generate(8),
		secretKey: 'liskSecretKey',
		headers: headers,
		perMessageDeflate: false,
		pingInterval: 5000,
		pingTimeout: 60000,
		processTermTimeout: 10000,
		workerController: __dirname + '/serverWorker.js'
	};
}

WSServer.prototype.start = function () {
	var self = this;

	var childProcessOptions = {
		version: self.headers.version,
		nethash: self.headers.nethash,
		port: self.headers.wsPort,
		nonce: self.headers.nonce
	};

	if (self.socketCluster) {
		throw new Error('SocketCluster instance is already running');
	}
	self.socketCluster = new SocketCluster(self.options);
	self.rpcServer = new MasterWAMPServer(self.socketCluster, childProcessOptions);

	self.rpcServer.registerRPCEndpoints({
		updatePeer: sinon.stub().callsArgWith(1, null),
		height:  sinon.stub().callsArgWith(1, null, {success: true, height: self.options.headers}),
		status: sinon.stub().callsArgWith(1, null, self.options.headers),
		list: sinon.stub().callsArgWith(1, null, {peers: []}),
		blocks:  sinon.stub().callsArgWith(1, null, {blocks: []}),
		getSignatures:  sinon.stub().callsArgWith(1, null, {signatures: []}),
		getTransactions:  sinon.stub().callsArgWith(1, null, {transactions: []}),
		postTransactions: sinon.stub().callsArgWith(1, null),
		postSignatures: sinon.stub().callsArgWith(1, null),
		postBlock: sinon.stub().callsArgWith(1, null, {success: true, blockId: null}),
		blocksCommon: sinon.stub().callsArgWith(1, null, {success: true, common: null})
	});

	self.socketCluster.on('fail', function () {
		self.stop();
	});

	self.socketCluster.on('error', function () {
		self.stop();
	});
};

WSServer.prototype.stop = function () {
	if (!this.socketCluster) {
		throw new Error('No SocketCluster instance running');
	}
	this.socketCluster.killWorkers();
	this.socketCluster = null;
};

var server = new WSServer(JSON.parse(process.argv[2]));
server.start();

process.on('close', function () {
	server.stop();
});
