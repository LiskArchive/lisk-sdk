'use strict';

var ChildProcess = require('child_process');
var path = require('path');
var Promise = require('bluebird');

var WSClient = require('./client');

/**
 * WSServerMaster
 * Create a socket server master instance with the support to spawn multiple processes
 *
 * @constructor
 */
function WSServerMaster () {
	this.masterProcess = null;
	this.ip = '127.0.0.1';
	this.version = '0.0.' + (Math.floor(Math.random() * 10) + 1);
	this.client = null;
	this.httpPort = Math.floor(Math.random() * 65535) + 1;
	this.port = Math.floor(Math.random() * 65535) + 1;
}

/**
 * Start the socket server master instance. It will start the server and an instance of the client.
 *
 * @return {Promise}
 */
WSServerMaster.prototype.start = function () {
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
			var headers = WSClient.generatePeerHeaders();
			headers.ip = '127.0.0.1';
			headers.port = self.port;
			headers.httpPort = self.httpPort;
			headers.version = self.version;

			self.client = new WSClient(headers);
			self.client.start().then(function () {
				resolve();
			});
		}, 1000);
	});
};

/**
 * Get headers related to server to be used in client
 *
 * @return {object}
 */
WSServerMaster.prototype.getHeaders  = function () {
	return this.client.headers;
};

/**
 * Stop the server
 */
WSServerMaster.prototype.stop = function () {
	this.client.stop();
	this.masterProcess.kill();
};

//module.exports = wsServer;
module.exports = WSServerMaster;
