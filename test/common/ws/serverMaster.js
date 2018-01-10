'use strict';

var ChildProcess = require('child_process');
var path = require('path');
var Promise = require('bluebird');
var randomstring = require('randomstring');
var testConfig = require('../../data/config.json');
var random = require('../../common/utils/random');

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
		self.masterProcess = ChildProcess.fork(path.join(__dirname, 'serverProcess.js'), [JSON.stringify(self.headers)], {
			cwd: __dirname,
			detached: false,
			stdio: 'inherit',
			env: process.env
		});

		self.masterProcess.on('error', function () {
			self.stop();
			reject();
		});

		self.masterProcess.on('close', function () {
			self.masterProcess = null;
			self.stop();
		});

		self.masterProcess.on('message', function (message) {
			if(message === 'ready') {
				resolve();
			} else {
				reject(message);
			}
		});
	});
};

/**
 * Generate peer headers for WS server
 *
 * @param {Object} [headers] - Existing headers to override with random values
 * @return {{broadhash, height: number, nethash, os: string, ip, wsPort: *|number, httpPort: number|*, version: *, nonce: *|number|{}, status: number}}
 */
WSServerMaster.generatePeerHeaders = function (headers) {
	if (!headers) {
		headers = {};
	}

	var operatingSystems = ['win32', 'win64', 'ubuntu', 'debian', 'centos'];
	var httpPort = random.number(1025, 65536);

	var defaults = {
		broadhash: testConfig.nethash,
		nethash: testConfig.nethash,
		state: 2,
		height: 1,
		wsPort: httpPort - 1,
		httpPort: httpPort,
		nonce: randomstring.generate(16),
		os: operatingSystems[random.number(0, operatingSystems.length)],
		version: testConfig.version,
		minVersion: testConfig.minVersion
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
	if (this.masterProcess) {
		this.masterProcess.kill();
	}
};

// module.exports = wsServer;
module.exports = WSServerMaster;
