'use strict';

var async = require('async');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

var Peer = require('./logic/peer');
var System = require('./modules/system');
var Handshake = require('./helpers/wsApi').middleware.Handshake;
var extractHeaders = require('./helpers/wsApi').extractHeaders;

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
			var handshake = Handshake(scope.system);

			scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {

				try {
					var headers = extractHeaders(req);
				} catch (invalidHeadersException) {
					return next(invalidHeadersException);
				}
				console.log('\x1b[31m%s\x1b[0m', 'WORKERS CTRL ----- HANDSHAKE STARTED WITH --- ', headers);

				handshake(headers, function (err, peer) {
					console.log('\x1b[31m%s\x1b[0m', 'WORKERS CTRL ----- HANDSHAKE RESULT --- ', err, peer);
					scope.slaveWAMPServer.sendToMaster(err ? 'removePeer' : 'acceptPeer', peer, req.remoteAddress, function (onMasterError) {
						console.log('\x1b[31m%s\x1b[0m', 'WORKERS CTRL ----- ON MASTER MSG --- ', err, peer);
						next(err || onMasterError);
					});
				});
			});
			return cb(null, handshake);
		}]
	},
	function (err, scope) {
		scServer.on('connection', function (socket) {
			scope.slaveWAMPServer.upgradeToWAMP(socket);

			socket.on('disconnect', function () {
				scope.slaveWAMPServer.onSocketDisconnect(socket);
				try {
					var headers = extractHeaders(socket.request);
				} catch (invalidHeadersException) {
					//ToDO: do some unable to disconnect peer logging
					return;
				}
				return scope.slaveWAMPServer.sendToMaster('removePeer',  new Peer(headers), socket.request.remoteAddress, function (err, peer) {
					if (err) {
						//ToDo: Again logging here- unable to remove peer
					}
				});
			}.bind(this));

			socket.on('connect', function (data) {
				//ToDo: integrate this socket connection with future peer client connection - one socket will be sufficient
			});

			socket.on('error', function (err) {
				//ToDo: Again logger here- log errors somewhere like err.message: 'Socket hung up'
			});
		});
	});
};

module.exports.path = __dirname + '/workersController.js';
