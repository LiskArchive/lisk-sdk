'use strict';

var scClient = require('socketcluster-client');
var Promise = require('bluebird');
var randomString = require('randomstring');
var testConfig = require('../data/config.json');

/**
 * WSClient
 * Create a web socket client to be connected to server
 *
 * @param {object} headers - headers object to be passed a query param to client
 * @param {object} handlers - object containing callback handlers for native socket client
 * @constructor
 */
function WSClient (headers, handlers) {

	var handlers = handlers || {};

	this.id = null;
	this.headers = headers;

	this.socketOptions = {
		protocol: 'http',
		hostname: '127.0.0.1',
		port: testConfig.port,
		query: headers,
		autoConnect: false,
		connectTimeout: 1000,
		ackTimeout: 1000,
		pingTimeout: 1000,
		connectAttempts: 1,
		autoReconnect: false
	};
	this.client = null;

	this.getHandlers = function () { return handlers; };
}

/**
 * Start the client and register the handlers
 *
 * @return {Promise}
 */
WSClient.prototype.start = function () {
	var self = this;

	return new Promise(function (resolve, reject) {
		self.client = scClient.connect(self.socketOptions);

		self.client.on('connecting', function () {
			console.log('Client Socket: Connecting...');
		});

		self.client.on('connect', function (data) {
			self.id = data.id;
			resolve(data);
		});

		self.client.on('close', reject);
		self.client.on('error', reject);

		Object.keys(self.getHandlers()).forEach(function (k) {
			self.client.on(k, self.getHandlers()[k]);
		});

		self.client.connect();
	}).timeout(2000, 'Timeout: Can\'t connect.');
};

/**
 * Stop the web socket client
 */
WSClient.prototype.stop = function () {
	this.client.disconnect();
};

/**
 * Generate random header values for a peer socket connection
 *
 * @param {string} [ip]
 * @param {int} [port]
 * @param {string} [nonce]
 * @return {Object}
 */
WSClient.generatePeerHeaders = function (ip, port, nonce) {
	port = port || (Math.floor(Math.random() * 65535) + 1);
	ip = ip || '127.0.0.1';
	nonce = nonce || randomString.generate(16);
	var httpPort = (Math.floor(Math.random() * 65535) + 1);
	var operatingSystems = ['win32','win64','ubuntu','debian', 'centos'];
	var os = operatingSystems[((Math.floor(Math.random() * operatingSystems.length)))];
	var version =  testConfig.version;

	return {
		broadhash: testConfig.nethash,
		height: 1,
		nethash: testConfig.nethash,
		os: os,
		ip: ip,
		port: port,
		httpPort: httpPort,
		version: version,
		nonce: nonce,
		status: 2
	};
};

module.exports = WSClient;
