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
const INITIAL_PING_TIMEOUT = 8000;

const wampClient = new WAMPClient(TIMEOUT); // Timeout failed requests after 1 second
const socketConnections = {};

const connect = (peer, logger, onDisconnectCb) => {
	connectSteps.addConnectionOptions(peer);
	connectSteps.addSocket(peer, logger);

	async.parallel([
		() => {
			connectSteps.upgradeSocket(peer);
			connectSteps.registerRPC(peer, logger);
		},
		() => connectSteps.registerSocketListeners(peer, logger, onDisconnectCb),
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
			pingTimeout: INITIAL_PING_TIMEOUT,
			connectAttempts: 1,
			port: peer.wsPort,
			hostname: peer.ip,
			query: System.getHeaders(),
			multiplex: false,
		};
		return peer;
	},

	addSocket: (peer, logger) => {
		if (peer.socket) {
			// If a socket connection exists,
			// before issuing a new connection
			// destroy the exisiting connection
			// to avoid too many socket connections
			peer.socket.destroy();
			delete peer.socket;
		}
		peer.socket = scClient.connect(peer.connectionOptions);

		if (peer.socket && Object.keys(socketConnections).length < 1000) {
			const hostname = peer.socket.options.hostname;
			if (!socketConnections[hostname]) {
				socketConnections[hostname] = { closed: 0, open: 0, disconnect: 0 };
			}

			if (peer.socket.state === 'closed') {
				socketConnections[hostname].closed += 1;
			} else if (peer.socket.state === 'open') {
				socketConnections[hostname].open += 1;
			} else if (peer.socket.state === 'disconnect') {
				socketConnections[hostname].disconnect += 1;
			}

			logger.trace(
				`${socketConnections[hostname].closed}:closed, ${
					socketConnections[hostname].open
				}:open and ${
					socketConnections[hostname].disconnect
				}:disconnect websocket connection to peer ${
					peer.socket.options.hostname
				}.`
			);
		}

		return peer;
	},

	upgradeSocket: peer => {
		wampClient.upgradeToWAMP(peer.socket);
		return peer;
	},

	registerRPC: (peer, logger) => {
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

					logger.trace(
						`[Outbound socket :: call] Peer RPC procedure '${rpcProcedureName}' called with data`,
						data
					);

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
					logger.trace(
						`[Outbound socket :: emit] Peer event '${eventProcedureName}' called with data`,
						data
					);
					peer.socket.emit(eventProcedureName, data);
				};
				return peerExtendedWithPublish;
			},
			peer
		);
	},

	registerSocketListeners: (peer, logger, onDisconnectCb = () => {}) => {
		const socket = peer.socket;

		socket.on('connect', () => {
			logger.trace(
				`[Outbound socket :: connect] Peer connection to ${peer.ip} established`
			);
		});

		socket.on('disconnect', () => {
			logger.trace(
				`[Outbound socket :: disconnect] Peer connection to ${
					peer.ip
				} disconnected`
			);
		});

		// When handshake process will fail - disconnect
		// ToDo: Use parameters code and description returned while handshake fails
		socket.on('connectAbort', () => {
			socket.disconnect(
				failureCodes.HANDSHAKE_ERROR,
				failureCodes.errorMessages[failureCodes.HANDSHAKE_ERROR]
			);
		});

		// When error on transport layer occurs - disconnect
		socket.on('error', err => {
			logger.debug(
				`[Outbound socket :: error] Peer error from ${peer.ip} - ${err.message}`
			);
			socket.disconnect(1000, 'Intentionally disconnected from peer because of error');
		});

		// When WS connection ends - remove peer
		socket.on('close', (code, reason) => {
			logger.debug(
				`[Outbound socket :: close] Peer connection to ${
					peer.ip
				} closed with code ${code} and reason - ${reason}`
			);
			socket.destroy();
			onDisconnectCb();
		});

		// The 'message' event can be used to log all low-level WebSocket messages.
		socket.on('message', message => {
			logger.trace(
				`[Outbound socket :: message] Peer message from ${
					peer.ip
				} received - ${message}`
			);
		});
		return peer;
	},
};

module.exports = connect;
