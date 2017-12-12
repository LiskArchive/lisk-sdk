'use strict';

var randomstring = require('randomstring');
var SocketCluster = require('socketcluster');

function WSServer (headers) {
	this.headers = headers;

	this.validNonce = randomstring.generate(16);
	this.testSocketCluster = null;
	this.testWampServer =  null;

	this.options = {
		workers: 1,
		port: this.headers.port,
		wsEngine: 'uws',
		appName: 'LiskTestServer-' + randomstring.generate(8),
		secretKey: 'liskSecret',
		headers: headers,
		workerController: __dirname + '/serverWorker.js'
	};
}

WSServer.prototype.start = function () {
	var self = this;

	if (self.testSocketCluster) {
		throw new Error('SocketCluster instance is already running');
	}
	self.testSocketCluster = new SocketCluster(self.options);

	self.testSocketCluster.on('fail', function () {
		self.stop();
	});

	self.testSocketCluster.on('error', function () {
		self.stop();
	});
};

WSServer.prototype.stop = function () {
	if (!this.testSocketCluster) {
		throw new Error('No SocketCluster instance running');
	}
	this.testSocketCluster.killWorkers();
	this.testSocketCluster = null;
};

var server = new WSServer(JSON.parse(process.argv[2]));
server.start();

process.on('close', function () {
	server.stop();
});
