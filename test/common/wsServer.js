'use strict';

var scClient = require('socketcluster-client');
var testConfig = require('../config.json');
var node = require('../node.js');
var ChildProcess = require('child_process');
var path = require('path');
var Promise = require('bluebird');

function WSClient (headers) {

	this.headers = headers;

	this.validClientSocketOptions = {
		protocol: 'http',
		hostname: '127.0.0.1',
		port: testConfig.port,
		query: headers
	};
	this.client = null;

	this.callback = function (err, data) {};
}

WSClient.prototype.start = function () {
	return new Promise(function (resolve, reject) {
		this.client = scClient.connect(this.validClientSocketOptions);
		this.client.on('connect', resolve);
		this.client.on('error', reject);
	}.bind(this));
};

WSClient.prototype.stop = function () {
	this.client.disconnect();
};

function WSServer () {
	this.masterProcess = null;
	this.client = null;
	this.port = Math.floor(Math.random() * 9999);
}

WSServer.prototype.start = function () {
	var self = this;

	return new Promise(function (resolve, reject) {
		self.masterProcess = ChildProcess.spawn('node', [path.join(__dirname, 'wsServerProcess.js'), self.port], {
			cwd: __dirname,
			detached: true,
			stdio: 'inherit',
			env: process.env
		});

		self.masterProcess.on('error', function () {
			self.stop();
			reject();
		});

		setTimeout(function () {
			var headers = node.generatePeerHeaders();
			headers.ip = '127.0.0.1';
			headers.port = self.port;
			headers.version = '0.0.' + Math.floor(Math.random() * 10);

			self.client = new WSClient(headers);
			self.client.start().then(function () {
				resolve();
			});
		}, 1000);
	});
};

WSServer.prototype.getHeaders  = function () {
	return this.client.headers;
};

WSServer.prototype.stop = function () {
	this.client.stop();
	this.masterProcess.kill();
};

//module.exports = wsServer;
module.exports = WSServer;
