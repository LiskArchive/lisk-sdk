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

var _ = require('lodash');

var System = require('../../../modules/system');
var WSServer = require('./server_master');
var wsRPC = require('../../../api/ws/rpc/ws_rpc');

var ClientRPCStub = wsRPC.ClientRPCStub;
var ConnectionState = wsRPC.ConnectionState;

var wsCommunication = {
	defaultConnectionState: null,
	defaultSocketPeerHeaders: null,

	// Get the given path
	call: function(procedure, data, done, includePeer) {
		if (!this.defaultConnectionState) {
			this.defaultConnectionState = new ConnectionState('127.0.0.1', 5000);
			this.defaultSocketPeerHeaders = WSServer.generatePeerHeaders({
				ip: '127.0.0.1',
				wsPort: 9999,
			});
			System.setHeaders(this.defaultSocketPeerHeaders);
			this.caller = ClientRPCStub.prototype.sendAfterSocketReadyCb(
				this.defaultConnectionState
			);
		}
		if (includePeer && typeof data === 'object') {
			data.peer = _.assign(
				{
					ip: '127.0.0.1',
					wsPort: 9999,
				},
				this.defaultSocketPeerHeaders
			);
		}
		return this.caller(procedure)(data, done);
	},
};

module.exports = wsCommunication;
