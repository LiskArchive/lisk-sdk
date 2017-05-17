'use strict';

var async = require('async');
var _ = require('lodash');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

var Peer = require('../../logic/peer');
var System = require('../../modules/system');
var Handshake = require('../../helpers/wsApi').middleware.Handshake;
var extractHeaders = require('../../helpers/wsApi').extractHeaders;

/**
 * Function is invoked by SocketCluster
 * @param {Worker} worker
 */
module.exports.run = function (worker) {

	var scServer = worker.getSCServer();

	async.auto({
		slaveWAMPServer: function (cb) {
			new SlaveWAMPServer(worker, cb);
		},
		config: ['slaveWAMPServer', function (scope, cb) {
			scope.socketToAddressMap = {};
			cb(null, scope.slaveWAMPServer.config);
		}],

		system: ['config', function (scope, cb) {
			new System(cb, {config: scope.config});
		}],

		handshake: ['system', function (scope, cb) {
			return cb(null, Handshake(scope.system));
		}]
	},
		function (err, scope) {
			scServer.on('connection', function (socket) {

				socket.on('handshake', function () {
					console.log('\x1b[32m%s\x1b[0m', 'WorkerController:HANDSHAKE RECEIVED: ', socket.request.url);
					try {
						var senderHeaders = extractHeaders(socket.request);
					} catch (invalidHeadersException) {
						console.log('\x1b[32m%s\x1b[0m', 'WorkerController: WRONG HEADERS - DISCONNECTING ', invalidHeadersException);
						return socket.disconnect(1005, invalidHeadersException);
					}

					scope.handshake(senderHeaders, function (err, peer) {
						console.log('\x1b[32m%s\x1b[0m', 'WorkerController:HANDSHAKE RESULT ', err, peer);
						return scope.slaveWAMPServer.sendToMaster(err ? 'removePeer' : 'acceptPeer', peer, socket.request.remoteAddress, function (onMasterError) {
							console.log('\x1b[32m%s\x1b[0m', 'WorkerController: SENT ACTION TO MASTER RESULT: ', onMasterError, peer);

							if (err || onMasterError) {
								console.log('\x1b[32m%s\x1b[0m', 'WorkerController: ON MASTER / HANDSHAKE ERROR - DISCONNECTING', onMasterError, err);
								return socket.disconnect(1004, err || onMasterError);
							}
							console.log('\x1b[32m%s\x1b[0m', 'WorkerController:HANDSHAKE SUCCESS - SENDING EMIT EVENT ', peer);

							return socket.emit('handshakeSuccess', peer);
						});
					});
				});

				socket.on('disconnect', function () {
					scope.slaveWAMPServer.onSocketDisconnect(socket);
					try {
						var headers = extractHeaders(socket.request);
					} catch (invalidHeadersException) {
						//ToDO: do some unable to disconnect peer logging
						return;
					}
					console.log('\x1b[32m%s\x1b[0m', 'WorkerController: ON SOCKET DISCONNECTED - REMOVING PEER with headers', headers);
					return scope.slaveWAMPServer.sendToMaster('removePeer', new Peer(headers), socket.request.headers.host, function (err, peer) {
						if (err) {
							//ToDo: Again logging here- unable to remove peer
						}
					});
				});

				socket.on('connect', function (data) {
					scope.slaveWAMPServer.upgradeToWAMP(socket);
					//ToDo: integrate this socket connection with future peer client connection - one socket will be sufficient
				});

				socket.on('error', function (err) {
					//ToDo: Again logger here- log errors somewhere like err.message: 'Socket hung up'
				});
			});
		});
};
