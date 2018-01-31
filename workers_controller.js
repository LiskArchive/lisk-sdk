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

var SCWorker = require('socketcluster/scworker');
var async = require('async');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

var Peer = require('./logic/peer');
var System = require('./modules/system');
var Handshake = require('./helpers/ws_api').middleware.Handshake;
var extractHeaders = require('./helpers/ws_api').extractHeaders;
var PeersUpdateRules = require('./api/ws/workers/peers_update_rules');
var Rules = require('./api/ws/workers/rules');
var failureCodes = require('./api/ws/rpc/failure_codes');
var Logger = require('./logger');
var config = require('./config.json');

/**
 * Instantiate the SocketCluster SCWorker instance with custom logic
 * inside the run function. The run function is invoked when the worker process
 * is ready to accept requests/connections.
 */
SCWorker.create({
	run: function() {
		var self = this;
		var scServer = this.getSCServer();

		async.auto(
			{
				logger: function(cb) {
					cb(
						null,
						new Logger({
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
						new System(cb, { config: scope.config });
					},
				],

				handshake: [
					'system',
					function(scope, cb) {
						return cb(null, Handshake(scope.system));
					},
				],
			},
			(err, scope) => {
				scServer.on('connection', socket => {
					scope.slaveWAMPServer.upgradeToWAMP(socket);
					socket.on('disconnect', removePeerConnection.bind(null, socket));
					socket.on('error', err => {
						socket.disconnect(err.code, err.message);
					});

					insertPeerConnection(socket);
				});

				function insertPeerConnection(socket) {
					var headers = extractHeaders(socket.request);
					scope.handshake(headers, (err, peer) => {
						if (err) {
							return socket.disconnect(err.code, err.description);
						}
						updatePeerConnection(
							Rules.UPDATES.INSERT,
							socket,
							peer.object(),
							onUpdateError => {
								if (onUpdateError) {
									socket.disconnect(
										onUpdateError.code,
										onUpdateError.description
									);
								} else {
									socket.emit('accepted');
								}
							}
						);
					});
				}

				function removePeerConnection(socket, code) {
					if (failureCodes.errorMessages[code]) {
						return;
					}
					var headers = extractHeaders(socket.request);
					scope.slaveWAMPServer.onSocketDisconnect(socket);
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
							var actionName = Object.keys(Rules.UPDATES)[updateType];
							if (onUpdateError) {
								scope.logger.warn(
									`Peer ${actionName} error: code: ${
										onUpdateError.code
									}, message: ${
										failureCodes.errorMessages[onUpdateError.code]
									}, description: ${onUpdateError.description}`
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
			}
		);
	},
});
