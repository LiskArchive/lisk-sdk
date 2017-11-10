'use strict';

var scClient = require('socketcluster-client');
var testConfig = require('../config.json');
var Promise = require('bluebird');

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

module.exports = WSClient;
