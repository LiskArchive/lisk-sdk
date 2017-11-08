'use strict';

var ChildProcess = require('child_process');
var path = require('path');
var Promise = require('bluebird');
var node = require('../node.js');
var WSClient = require('./wsClient');

function WSServerMaster () {
	this.masterProcess = null;
	this.client = null;
	this.port = Math.floor(Math.random() * 9999);
}

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

WSServerMaster.prototype.getHeaders  = function () {
	return this.client.headers;
};

WSServerMaster.prototype.stop = function () {
	this.client.stop();
	this.masterProcess.kill();
};

//module.exports = wsServer;
module.exports = WSServerMaster;
