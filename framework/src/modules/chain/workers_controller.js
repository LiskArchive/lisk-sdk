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

if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('./helpers/newrelic_lisk');
}

const http = require('http');
const async = require('async');
const SCWorker = require('socketcluster/scworker');
const SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');
const Peer = require('./logic/peer');
const { createSystemComponent } = require('../../components/system');
const Handshake = require('./api/ws/workers/middlewares/handshake').middleware
	.Handshake;
const extractHeaders = require('./api/ws/workers/middlewares/handshake')
	.extractHeaders;
const emitMiddleware = require('./api/ws/workers/middlewares/emit');
const PeersUpdateRules = require('./api/ws/workers/peers_update_rules');
const Rules = require('./api/ws/workers/rules');
const failureCodes = require('./api/ws/rpc/failure_codes');
const {
	createLoggerComponent,
} = require('../../../../framework/src/components/logger');
const AppConfig = require('./helpers/config.js');
const config = new AppConfig(require('../../../../package.json'), false);

/**
 * Instantiate the SocketCluster SCWorker instance with custom logic
 * inside the run function. The run function is invoked when the worker process
 * is ready to accept requests/connections.
 */
SCWorker.create({
	// Pass the custom configuration to P2P HTTP Server to mitigate the security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
	createHTTPServer() {
		const httpServer = http.createServer();
		httpServer.headersTimeout = config.api.options.limits.headersTimeout;
		httpServer.setTimeout(config.api.options.limits.serverSetTimeout);
		httpServer.on('timeout', socket => {
			socket.destroy();
		});
		return httpServer;
	},
	run() {
		const self = this;
		const scServer = this.getSCServer();

		async.auto(
			{
				logger(cb) {
					cb(
						null,
						createLoggerComponent({
							echo: config.consoleLogLevel,
							errorLevel: config.fileLogLevel,
							filename: config.logFileName,
						})
					);
				},

				slaveWAMPServer: [
					'logger',
					function(scope, cb) {
						new SlaveWAMPServer(self, 20e3, cb);
					},
				],

				config: [
					'slaveWAMPServer',
					function(scope, cb) {
						cb(null, scope.slaveWAMPServer.config);
					},
				],

				peersUpdateRules: [
					'slaveWAMPServer',
					function(scope, cb) {
						cb(null, new PeersUpdateRules(scope.slaveWAMPServer));
					},
				],

				registerRPCSlaveEndpoints: [
					'peersUpdateRules',
					function(scope, cb) {
						scope.slaveWAMPServer.reassignRPCSlaveEndpoints({
							updateMyself: scope.peersUpdateRules.external.update,
						});
						cb();
					},
				],

				system: [
					'config',
					function(scope, cb) {
						cb(null, createSystemComponent(scope.config, scope.logger));
					},
				],

				handshake: [
					'system',
					function(scope, cb) {
						return cb(null, new Handshake(scope.system, scope.config));
					},
				],
			},
			(asyncAutoErr, scope) => {
				scServer.addMiddleware(
					scServer.MIDDLEWARE_HANDSHAKE_WS,
					(req, next) => {
						scope.handshake(extractHeaders(req), (err, peer) => {
							if (err) {
								// Set a custom property on the HTTP request object; we will check this property and handle
								// this issue later.
								// Because of WebSocket protocol handshake restrictions, we can't call next(err) here because the
								// error will not be passed to the client. So we can attach the error to the request and disconnect later during the SC 'handshake' event.
								req.failedHeadersValidationError = err;
								// When ip is blacklisted, error is thrown as soon as possible.
								if (err.code === failureCodes.BLACKLISTED_PEER) {
									return next(err);
								}
							} else {
								req.peerObject = peer.object();
							}
							// Pass through the WebSocket MIDDLEWARE_HANDSHAKE_WS successfully, but
							// we will handle the req.failedQueryValidation error later inside scServer.on('handshake', handler);
							return next();
						});
					}
				);

				scServer.addMiddleware(scServer.MIDDLEWARE_EMIT, emitMiddleware);

				scServer.on('handshake', socket => {
					socket.on('message', message => {
						scope.logger.trace(
							`[Inbound socket :: message] Received message from ${
								socket.request.remoteAddress
							} - ${message}`
						);
					});
					// We can access the HTTP request (which instantiated the WebSocket connection) using socket.request
					// so we can access our custom socket.request.failedQueryValidation property here.
					// If the property exists then we disconnect the connection.
					if (socket.request.failedHeadersValidationError) {
						const handshakeFailedCode =
							socket.request.failedHeadersValidationError.code;
						const handshakeFailedDesc =
							socket.request.failedHeadersValidationError.description;
						scope.logger.debug(
							`[Inbound socket :: handshake] WebSocket handshake from ${
								socket.request.remoteAddress
							} failed with code ${handshakeFailedCode} - ${handshakeFailedDesc}`
						);
						return socket.disconnect(handshakeFailedCode, handshakeFailedDesc);
					}

					if (!socket.request.peerObject) {
						const handshakeErrorCode =
							failureCodes.ON_MASTER.UPDATE.INVALID_PEER;
						const handshakeErrorDesc =
							'Could not find the peerObject property on the handshake request';
						scope.logger.error(
							`[Inbound socket :: handshake] WebSocket handshake from ${
								socket.request.remoteAddress
							} failed with code ${handshakeErrorCode} - ${handshakeErrorDesc}`
						);
						return socket.disconnect(handshakeErrorCode, handshakeErrorDesc);
					}

					scope.logger.trace(
						`[Inbound socket :: handshake] WebSocket handshake from ${
							socket.request.remoteAddress
						} succeeded`
					);

					return updatePeerConnection(
						Rules.UPDATES.INSERT,
						socket,
						socket.request.peerObject,
						onUpdateError => {
							if (onUpdateError) {
								socket.disconnect(
									onUpdateError.code,
									onUpdateError.description
								);
							}
						}
					);
				});

				scServer.on('connection', socket => {
					scope.slaveWAMPServer.upgradeToWAMP(socket);
					socket.on('disconnect', removePeerConnection.bind(null, socket));
				});

				function removePeerConnection(socket, code) {
					scope.logger.trace(
						`[Inbound socket :: disconnect] Peer socket from ${
							socket.request.remoteAddress
						} disconnected`
					);

					if (failureCodes.errorMessages[code]) {
						return;
					}
					const headers = extractHeaders(socket.request);
					updatePeerConnection(
						Rules.UPDATES.REMOVE,
						socket,
						new Peer(headers).object(),
						() => {}
					);
				}

				function updatePeerConnection(updateType, socket, peer, cb) {
					scope.peersUpdateRules.internal.update(
						updateType,
						peer,
						socket.id,
						onUpdateError => {
							const actionName = Object.keys(Rules.UPDATES)[updateType];
							if (onUpdateError) {
								scope.logger.warn(
									`Peer ${actionName} error: code: ${
										onUpdateError.code
									}, message: ${
										failureCodes.errorMessages[onUpdateError.code]
									}, description: ${onUpdateError.description} on peer ${
										peer.ip
									}:${peer.wsPort}`
								);
							} else {
								scope.logger.info(
									`${actionName} peer - ${peer.ip}:${peer.wsPort} success`
								);
							}
							return setImmediate(cb, onUpdateError);
						}
					);
				}

				scope.logger.debug(`Worker pid ${process.pid} started`);
			}
		);
	},
});
