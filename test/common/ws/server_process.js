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

var randomstring = require('randomstring');
var SocketCluster = require('socketcluster');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
var WSClient = require('./client');
var Promise = require('bluebird');
var sinon = require('sinon');
var sandbox = sinon.createSandbox();

function WSServer(headers) {
	this.headers = headers;

	this.validNonce = randomstring.generate(16);
	this.socketCluster = null;
	this.rpcServer = null;
	this.socketClient = null;

	this.options = {
		workers: 1,
		port: this.headers.wsPort,
		wsEngine: 'uws',
		appName: `LiskTestServer-${randomstring.generate(8)}`,
		secretKey: 'liskSecretKey',
		headers: headers,
		perMessageDeflate: false,
		pingInterval: 5000,
		pingTimeout: 60000,
		processTermTimeout: 10000,
		workerController: `${__dirname}/server_worker.js`,
	};
}

WSServer.prototype.start = function() {
	var self = this;

	var childProcessOptions = {
		version: self.headers.version,
		nethash: self.headers.nethash,
		port: self.headers.wsPort,
		nonce: self.headers.nonce,
	};

	return new Promise(function(resolve, reject) {
		if (self.socketCluster) {
			reject(new Error('SocketCluster instance is already running'));
		}

		self.socketCluster = new SocketCluster(self.options);

		self.socketCluster.on('ready', function() {
			self.socketClient = new WSClient(self.options.headers);
			self.rpcServer = new MasterWAMPServer(
				self.socketCluster,
				childProcessOptions
			);

			self.rpcServer.registerRPCEndpoints({
				updatePeer: sandbox.stub().callsArgWith(1, null),
				height: sandbox.stub().callsArgWith(1, null, {
					success: true,
					height: self.options.headers,
				}),
				status: sandbox.stub().callsArgWith(1, null, self.options.headers),
				list: sandbox.stub().callsArgWith(1, null, { peers: [] }),
				blocks: sandbox.stub().callsArgWith(1, null, { blocks: [] }),
				getSignatures: sandbox.stub().callsArgWith(1, null, { signatures: [] }),
				getTransactions: sandbox
					.stub()
					.callsArgWith(1, null, { transactions: [] }),
				postTransactions: sandbox.stub().callsArgWith(1, null),
				postSignatures: sandbox.stub().callsArgWith(1, null),
				postBlock: sandbox
					.stub()
					.callsArgWith(1, null, { success: true, blockId: null }),
				blocksCommon: sandbox
					.stub()
					.callsArgWith(1, null, { success: true, common: null }),
			});

			self.socketClient.start().then(resolve);
		});

		self.socketCluster.on('fail', function() {
			self.stop();
			reject();
		});

		self.socketCluster.on('error', function() {
			self.stop();
		});
	});
};

WSServer.prototype.stop = function() {
	if (!this.socketCluster) {
		throw new Error('No SocketCluster instance running');
	}
	this.socketClient.stop();
	this.socketCluster.killWorkers();
	this.socketCluster = null;
};

var server = new WSServer(JSON.parse(process.argv[2]));

server
	.start()
	.then(function() {
		if (process.send) {
			process.send('ready');
		}
	})
	.catch(function(err) {
		console.log('Error starting WS server', err);
		server.stop();
	});

process.on('close', function() {
	server.stop();
});

process.on('exit', function() {
	server.stop();
});
