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

const _ = require('lodash');
const async = require('async');
const scClient = require('socketcluster-client');
const WAMPClient = require('wamp-socket-cluster/WAMPClient');
const failureCodes = require('../../../api/ws/rpc/failure_codes');
const System = require('../../../modules/system');
const wsRPC = require('../../../api/ws/rpc/ws_rpc').wsRPC;

const TIMEOUT = 2000;
const wampClient = new WAMPClient(TIMEOUT); // Timeout failed requests after 1 second

const connect = (peer, onDisconnectCb) => {
	connectSteps.addConnectionOptions(peer);
	connectSteps.addSocket(peer);

	async.parallel([
		() => {
			connectSteps.upgradeSocket(peer);
			connectSteps.registerRPC(peer);
		},
		() => connectSteps.registerSocketListeners(peer, onDisconnectCb),
	]);
	return peer;
};

const connectSteps = {
	addConnectionOptions: peer => {
		peer.connectionOptions = {
			autoConnect: false, // Lazy connection establishment
			autoReconnect: false,
			connectTimeout: TIMEOUT,
			ackTimeout: TIMEOUT,
			pingTimeout: TIMEOUT,
			connectAttempts: 1,
			port: peer.wsPort,
			hostname: peer.ip,
			query: System.getHeaders(),
		};
		return peer;
	},

	addSocket: peer => {
		peer.socket = scClient.connect(peer.connectionOptions);
		return peer;
	},

	upgradeSocket: peer => {
		wampClient.upgradeToWAMP(peer.socket);
		return peer;
	},

	registerRPC: peer => {
		// Assemble empty RPC entry
		peer.rpc = {};
		let wsServer;
		try {
			wsServer = wsRPC.getServer();
		} catch (wsServerNotInitializedException) {
			return peer;
		}
		// Register RPC methods on peer
		peer = _.reduce(
			wsServer.endpoints.rpc,
			(peerExtendedWithRPC, localHandler, rpcProcedureName) => {
				peerExtendedWithRPC.rpc[rpcProcedureName] = (data, rpcCallback) => {
					// Provide default parameters if called with non standard parameter, callback
					rpcCallback =
						typeof rpcCallback === 'function'
							? rpcCallback
							: typeof data === 'function' ? data : () => {};
					data = data && typeof data !== 'function' ? data : {};
					peer.socket
						.call(rpcProcedureName, data)
						.then(res => {
							setImmediate(rpcCallback, null, res);
						})
						.catch(err => {
							setImmediate(rpcCallback, err);
						});
				};
				return peerExtendedWithRPC;
			},
			peer
		);

		// Register Publish methods on peer
		return _.reduce(
			wsServer.endpoints.event,
			(peerExtendedWithPublish, localHandler, eventProcedureName) => {
				peerExtendedWithPublish.rpc[eventProcedureName] = data => {
					peer.socket.emit(eventProcedureName, data);
				};
				return peerExtendedWithPublish;
			},
			peer
		);
	},

	registerSocketListeners: (peer, onDisconnectCb = () => {}) => {
		// Unregister all the events just in case
		peer.socket.off('connectAbort');
		peer.socket.off('error');
		peer.socket.off('close');
		// When handshake process will fail - disconnect
		// ToDo: Use parameters code and description returned while handshake fails
		peer.socket.on('connectAbort', () => {
			peer.socket.disconnect(
				failureCodes.HANDSHAKE_ERROR,
				failureCodes.errorMessages[failureCodes.HANDSHAKE_ERROR]
			);
		});
		// When error on transport layer occurs - disconnect
		peer.socket.on('error', () => {
			peer.socket.disconnect();
		});

		// When WS connection ends - remove peer
		peer.socket.on('close', () => {
			onDisconnectCb();
		});
		return peer;
	},
};

module.exports = connect;
