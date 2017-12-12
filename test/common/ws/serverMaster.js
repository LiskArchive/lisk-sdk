'use strict';

var ChildProcess = require('child_process');
var path = require('path');
var Promise = require('bluebird');
var randomstring = require('randomstring');
var testConfig = require('../../data/config.json');

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

	this.headers = WSServerMaster.generatePeerHeaders({
		ip: this.ip,
		version: '0.0.' + (Math.floor(Math.random() * 10) + 1)
	});

	this.client = null;
	this.wsPort = this.headers.wsPort;
	this.httpPort = this.headers.httpPort;
}

/**
 * Start the socket server master instance. It will start the server and an instance of the client.
 *
 * @return {Promise}
 */
WSServerMaster.prototype.start = function () {
	var self = this;

	return new Promise(function (resolve, reject) {
		self.masterProcess = ChildProcess.spawn('node', [path.join(__dirname, 'serverProcess.js'), JSON.stringify(self.headers)], {
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
			self.client = new WSClient(self.headers);
			self.client.start().then(function () {
				resolve();
			});
		}, 1000);
	});
};

/**
 * Generate headers for WS Server
 *
 * @param {Object} [headers] - Existing headers to override on random values
 *
 * @return {{broadhash, height: number, nethash, os: string, ip, wsPort: *|number, httpPort: number|*, version: *, nonce: *|number|{}, status: number}}
 *
 */
WSServerMaster.generatePeerHeaders = function (headers) {

	if(!headers) {
		headers = {};
	}

	var operatingSystems = ['win32','win64','ubuntu','debian', 'centos'];

	var defaults = {
		broadhash: testConfig.nethash,
		nethash: testConfig.nethash,
		status: 2,
		height: 1,
		ip: '127.0.0.1',
		port: (Math.floor(Math.random() * 65535) + 1),
		httpPort: (Math.floor(Math.random() * 65535) + 1),
		nonce: randomstring.generate(16),
		os: operatingSystems[((Math.floor(Math.random() * operatingSystems.length)))],
		version: testConfig.version
	};

	return Object.assign({}, defaults, headers);
};

/**
 * Get headers related to server to be used in client
 *
 * @return {object}
 */
WSServerMaster.prototype.getHeaders  = function () {
	return this.headers;
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
