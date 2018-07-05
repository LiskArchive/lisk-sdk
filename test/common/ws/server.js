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

require('../../setup'); // Ensure availability of global variables

var randomstring = require('randomstring');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var SocketCluster = require('socketcluster');

var wsServer = {
	validNonce: randomstring.generate(16),
	testSocketCluster: null,
	testWampServer: null,

	start() {
		if (this.socketCluster) {
			throw new Error('SocketCluster instance is already running');
		}
		this.socketCluster = new SocketCluster(this.options);
	},

	stop() {
		if (!this.socketCluster) {
			throw new Error('No SocketCluster instance running');
		}
		this.socketCluster.killWorkers();
		this.socketCluster.killBrokers();
		this.socketCluster = null;
	},

	// Invoked by each worker
	run(worker) {
		console.info('wsServer: run invoked');
		var scServer = worker.scServer;
		this.rpcServer = new WAMPServer();
		this.rpcServer.registerRPCEndpoints(this.necessaryRPCEndpoints);
		scServer.on('connection', socket => {
			this.rpcServer.upgradeToWAMP(socket);
			socket.emit('accepted');
		});
	},

	necessaryRPCEndpoints: {
		status: sinonSandbox.stub().callsArgWith(1, {
			success: true,
			height: 1,
			broadhash: __testContext.config.nethash,
			nonce: __testContext.config.nethash,
		}),
		list: sinonSandbox.stub().callsArgWith(1, { peers: [] }),
		blocks: sinonSandbox.stub().callsArgWith(1, { blocks: [] }),
		getSignatures: sinonSandbox.stub().callsArgWith(1, { signatures: [] }),
		getTransactions: sinonSandbox.stub().callsArgWith(1, { transactions: [] }),
		updateMyself: sinonSandbox.stub().callsArgWith(1, null),
		postTransactions: sinonSandbox.stub().callsArgWith(1, null),
		postSignatures: sinonSandbox.stub().callsArgWith(1, null),
		postBlock: sinonSandbox
			.stub()
			.callsArgWith(1, sinonSandbox.stub().callsArg(1)),
		blocksCommon: sinonSandbox
			.stub()
			.callsArgWith(1, { success: true, common: null }),
	},

	options: {
		workers: 1,
		port: 9999,
		wsEngine: 'uws',
		appName: 'testWSServer',
		secretKey: 'liskSecretKey',
		workerController: `${__dirname}/server.js`,
	},
};

module.exports = wsServer;
