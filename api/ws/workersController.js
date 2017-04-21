'use strict';

var async = require('async');
var _ = require('lodash');
var memored = require('memored');
var commander = require('commander');
var packageJson = require('../../package.json');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');
var config = require('../../config.json');

var Peer = require('../../logic/peer');
var Config = require('../../helpers/config');
var System = require('../../modules/system');
var Handshake = require('../../helpers/wsApi').middleware.Handshake;

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
	console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER ----- RUN');

	var scServer = worker.getSCServer();

	async.auto({

		slaveWAMPServer: function (cb) {
			new SlaveWAMPServer(worker, cb);
		},

		config: ['slaveWAMPServer', function (scope, cb) {
			console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER: slaveWAMPServer initialized', scope.slaveWAMPServer.config);

			var config = {
				version: scope.slaveWAMPServer.config.version,
				minVersion: scope.slaveWAMPServer.config.minVersion,
				nethash: scope.slaveWAMPServer.config.nethash,
				nonce: scope.slaveWAMPServer.config.nonce
			};

			scope.socketToAddressMap = {};

			cb(null, config);
		}],

		system: ['config', function (scope, cb) {
			console.log('\x1b[36m%s\x1b[0m', 'slaveWAMPServer system -- config', scope.config);
			new System(cb, {config: scope.config});
		}],

		handshake: ['system', function (scope, cb) {
			console.log('\x1b[36m%s\x1b[0m', 'slaveWAMPServer handshake -- system', scope.system);
			var handshake = Handshake(scope.system);

			scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {

				var headers = _.get(url.parse(req.url, true), 'query', {});
				console.log('\x1b[36m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE: headers, host, socket', headers, req.headers.host, req.socket);
				if (!headers.ip || !headers.port) {
					return next('No port or ip specified');
				}

				headers.port = parseInt(headers.port);

				handshake(headers, function (err, peer) {
					console.log('\x1b[36m%s\x1b[0m', 'WORKER handshake res: ', err, 'peer:', peer);
					if (err) {
						return sendActionToMaster('removePeer', {
							peer: peer,
							extraMessage: 'extraMessage'
						});
					}

					return sendActionToMaster('acceptPeer', {peer: peer});

					function sendActionToMaster(procedure, data) {
						return scope.slaveWAMPServer.sendToMaster(procedure, data, req.headers.host, function (err, peer) {
							console.log('\x1b[36m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE FINISH: invoking cb with err: ', err);
							return next(err);
						});
					}
				});
			});
			return cb(null, handshake);
		}]
	},
	function (err, scope) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER: setupSocket ----- handshake', !!scope.handshake);
		scServer.on('connection', function (socket) {
			console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER: NEW SOCKET CONN --- socket.id', socket.id);
			this.slaveWAMPServer.upgradeToWAMP(socket);

			socket.on('error', function (err) {
				//ToDo: Again logger here- log errors somewhere like err.message: 'Socket hung up'
				console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- ERROR', err);
			});

			socket.on('disconnect', function (data) {
				this.slaveWAMPServer.onSocketDisconnect(socket);
				console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- DISCONNECTED', socket.id, data, socket.authToken, socket);
				//ToDo: DO REMOVE PEER HERE (AUTH TOKEN?)
			}.bind(this));

			socket.on('connect', function (data) {
				console.log('\x1b[36m%s\x1b[0m', 'CLIENT CONNECTED AFTER HANDSHAKE', data);
			});

			socket.on('connecting', function () {
				console.log('\x1b[36m%s\x1b[0m', 'CLIENT STARTED HANDSHAKE');
			});

			socket.on('connectAbort', function (data) {
				console.log('\x1b[36m%s\x1b[0m', 'CLIENT HANDSHAKE REJECTED', data);
			});
		});
	});

};

module.exports =  new WorkerController();

