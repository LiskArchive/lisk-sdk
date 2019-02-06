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

const connect = require('../../../src/modules/chain/api/ws/rpc/connect');
const WSServerMaster = require('./server_master');

/**
 * WSClient
 * Create a web socket client to be connected to server
 *
 *
 * @param {object} headers - headers object to be passed a query param to client
 * @constructor
 */
function WSClient(headers = WSServerMaster.generatePeerHeaders()) {
	this.headers = headers;
}

/**
 * Start the client and register the handlers
 */
WSClient.prototype.start = function() {
	const peersHeaders = {
		version: __testContext.config.version,
		minVersion: __testContext.config.minVersion,
		protocolVersion: __testContext.config.protocolVersion,
		nethash: __testContext.config.nethash,
		nonce: __testContext.config.nonce,
		wsPort: __testContext.config.wsPort,
		httpPort: __testContext.config.httpPort,
	};
	this.client = connect(
		{
			ip: __testContext.config.address,
			wsPort: __testContext.config.wsPort,
		},
		{
			trace() {},
			log() {},
			debug() {},
			error() {},
		},
		peersHeaders,
		this.stop.bind(this)
	);
	// Call updateMyself RPC on the peer to:
	// 1. Initialize the connection.
	// 2. Send our headers to the peer.
	this.client.rpc.updateMyself(this.headers, () => {});
};

/**
 * Stop the web socket client
 */
WSClient.prototype.stop = function() {
	this.client.socket.disconnect();
};

module.exports = WSClient;
