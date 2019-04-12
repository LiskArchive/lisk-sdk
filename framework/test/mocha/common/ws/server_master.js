/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

// Initialize global variables
require('../../setup');

const ChildProcess = require('child_process');
const path = require('path');
const Promise = require('bluebird');
const randomstring = require('randomstring');
const random = require('../../common/utils/random');

const testConfig = __testContext.config;

/**
 * WSServerMaster
 * Create a socket server master instance with the support to spawn multiple processes
 *
 * @constructor
 */
function WSServerMaster() {
	this.masterProcess = null;
	this.ip = '127.0.0.1';

	this.headers = WSServerMaster.generatePeerHeaders({
		ip: this.ip,
		version: '9.8.7',
	});

	this.wsPort = this.headers.wsPort;
	this.httpPort = this.headers.httpPort;
}

/**
 * Start the socket server master instance. It will start the server and an instance of the client.
 *
 * @return {Promise}
 */
WSServerMaster.prototype.start = function() {
	const self = this;

	return new Promise((resolve, reject) => {
		self.masterProcess = ChildProcess.fork(
			path.join(__dirname, 'server_process.js'),
			[JSON.stringify(self.headers)],
			{
				cwd: __dirname,
				detached: false,
				stdio: 'inherit',
				env: process.env,
			}
		);

		self.masterProcess.on('error', error => {
			self.stop();
			reject(error);
		});

		self.masterProcess.on('close', () => {
			self.masterProcess = null;
			self.stop();
		});

		self.masterProcess.on('message', message => {
			if (message === 'ready') {
				resolve();
			} else {
				reject(new Error(message));
			}
		});
	}).catch(err => {
		console.error(`Server master error: ${err}`);
	});
};

/**
 * Generate peer headers for WS server
 *
 * @param {Object} [headers] - Existing headers to override with random values
 * @return {{broadhash, height: number, nethash, os: string, ip, wsPort: *|number, httpPort: number|*, version: *, nonce: *|number|{}, status: number}}
 */
WSServerMaster.generatePeerHeaders = function(headers) {
	if (!headers) {
		headers = {};
	}

	const operatingSystems = ['win32', 'win64', 'ubuntu', 'debian', 'centos'];
	const httpPort = headers.httpPort || random.number(1025, 65536);

	const defaults = {
		broadhash: testConfig.nethash,
		nethash: testConfig.nethash,
		state: 2,
		height: 1,
		wsPort: headers.wsPort || httpPort - 1,
		httpPort,
		nonce: randomstring.generate(16),
		os: operatingSystems[random.number(0, operatingSystems.length)],
		version: testConfig.app.version,
		minVersion: testConfig.app.minVersion,
		protocolVersion: testConfig.app.protocolVersion,
	};

	return Object.assign({}, defaults, headers);
};

/**
 * Get headers related to server to be used in client
 *
 * @return {object}
 */
WSServerMaster.prototype.getHeaders = function() {
	return this.headers;
};

/**
 * Stop the server
 */
WSServerMaster.prototype.stop = function() {
	if (this.masterProcess) {
		this.masterProcess.kill();
	}
};

// module.exports = wsServer;
module.exports = WSServerMaster;
