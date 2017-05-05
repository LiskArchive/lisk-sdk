'use strict';

var async = require('async');
var _ = require('lodash');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');
var config = require('../../config.json');

var Peer = require('../../logic/peer');
var System = require('../../modules/system');
var Handshake = require('../../helpers/wsApi').middleware.Handshake;
var extractHeaders = require('../../helpers/wsApi').extractHeaders;

/**
 * @class WorkerController
 */
function WorkerController () {
	this.config = null;
}

WorkerController.path = __dirname + 'workersController.js';

/**
 * Function is invoked by SocketCluster
 * @param {Worker} worker
 */
WorkerController.prototype.run = function (worker) {
	console.log('\x1b[32m%s\x1b[0m', 'WORKERS CONTROLLER ----- RUN');

	var scServer = worker.getSCServer();

	async.auto({
		slaveWAMPServer: function (cb) {
			new SlaveWAMPServer(worker, cb);
		},
		config: ['slaveWAMPServer', function (scope, cb) {
			console.log('\x1b[32m%s\x1b[0m', 'WORKERS CONTROLLER: slaveWAMPServer initialized');

			scope.socketToAddressMap = {};

			cb(null, scope.slaveWAMPServer.config);
		}],

		system: ['config', function (scope, cb) {
			console.log('\x1b[32m%s\x1b[0m', 'slaveWAMPServer system -- config', scope.config);
			new System(cb, {config: scope.config});
		}],

		handshake: ['system', function (scope, cb) {
			var handshake = Handshake(scope.system);
			console.log('\x1b[32m%s\x1b[0m', 'slaveWAMPServer handshake -- system', scope.system.getNonce(), scope.system.getNethash());

			scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {
				console.log('\x1b[32m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE: headers, host, socket', req.headers.host, extractHeaders(req));

				try {
					var headers = extractHeaders(req);
				} catch (invalidHeadersException) {
					return next(invalidHeadersException);
				}

				handshake(headers, function (err, peer) {
					if (err) {
						console.log('\x1b[32m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE ERROR:  ---- ', err);
						return sendActionToMaster('removePeer', {
							peer: peer,
							extraMessage: 'extraMessage'
						}, err);
					}
					console.log('\x1b[32m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE SUCCESS: ---- PEER: ', peer);
					return sendActionToMaster('acceptPeer', {peer: peer});

				});

				function sendActionToMaster (procedure, data, error) {
					return scope.slaveWAMPServer.sendToMaster(procedure, data, req.headers.host, function (err, peer) {
						console.log('\x1b[32m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE FINISH: invoking cb with err: ');
						return next(error);
					});
				}

			});
			return cb(null, handshake);
		}]
	},
		function (err, scope) {
			console.log('\x1b[32m%s\x1b[0m', 'WORKERS CONTROLLER: setupSocket ----- handshake');
			scServer.on('connection', function (socket) {
				console.log('\x1b[32m%s\x1b[0m', 'WORKERS CONTROLLER: NEW SOCKET CONN --- socket.id');
				scope.slaveWAMPServer.upgradeToWAMP(socket);

				socket.on('error', function (err) {
					//ToDo: Again logger here- log errors somewhere like err.message: 'Socket hung up'
					console.log('\x1b[32m%s\x1b[0m', 'WorkerController:SOCKET-ON --- ERROR' + err.toString());
				});

				socket.on('disconnect', function (data) {
					scope.slaveWAMPServer.onSocketDisconnect(socket);
					console.log('\x1b[32m%s\x1b[0m', 'WorkerController:SOCKET-ON --- DISCONNECTED');
					try {
						var headers = extractHeaders(socket.request);
					} catch (invalidHeadersException) {
						console.log('\x1b[32m%s\x1b[0m', 'WorkerController:SOCKET-ON --- UNABLE TO REMOVE PEERS - HEADERS ERROR ', invalidHeadersException);
					}
					console.log('\x1b[32m%s\x1b[0m', 'WorkerController:SOCKET-ON --- ATTEMPT TO REMOVE PEER', new Peer(headers));
					var payload = {
						peer: new Peer(headers),
						extraMessage: 'extraMessage'
					};
					return scope.slaveWAMPServer.sendToMaster('removePeer', payload, socket.request.headers.host, function (err, peer) {
						console.log('\x1b[32m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE FINISH: invoking cb with err: ', err);
						if (err) {
							//ToDo: Again logger here- log errors somewhere like err.message: 'Socket hung up'
							console.log('\x1b[32m%s\x1b[0m', 'WorkerController:UNABLE TO REMOVE PEER AFTER ITS DISCONNECTED --- ERROR' + err.toString());
						}
					});

					//ToDo: DO REMOVE PEER HERE (AUTH TOKEN?)
				}.bind(this));

				socket.on('connect', function (data) {
					console.log('\x1b[32m%s\x1b[0m', 'CLIENT CONNECTED AFTER HANDSHAKE');
				});

				socket.on('connecting', function () {
					console.log('\x1b[32m%s\x1b[0m', 'CLIENT STARTED HANDSHAKE ---- args', JSON.stringify(arguments));
				});

				socket.on('connectAbort', function (data) {
					console.log('\x1b[32m%s\x1b[0m', 'CLIENT HANDSHAKE REJECTED');
				});
			});
		});

};

module.exports = new WorkerController();

