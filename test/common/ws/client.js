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

const System = require('../../../modules/system');
const connect = require('../../../api/ws/rpc/connect');
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
	System.setHeaders(this.headers);
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
