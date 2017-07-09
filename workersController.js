'use strict';

var async = require('async');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

var Peer = require('./logic/peer');
var System = require('./modules/system');
var Handshake = require('./helpers/wsApi').middleware.Handshake;
var ed = require('./helpers/ed');
var constants = require('./helpers/constants');
var extractHeaders = require('./helpers/wsApi').extractHeaders;

var workerState = {};

module.exports.workerState = workerState;

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

			connectionPrivateKey: ['slaveWAMPServer', function (scope, cb) {
				console.log('connection in woekrs controller', Buffer.from(scope.slaveWAMPServer.config.connectionPrivateKey, 'hex'));
				cb(null, Buffer.from(scope.slaveWAMPServer.config.connectionPrivateKey, 'hex'))
			}],

			config: ['slaveWAMPServer', function (scope, cb) {
				cb(null, scope.slaveWAMPServer.config);
			}],

			system: ['config', function (scope, cb) {
				new System(cb, {config: scope.config});
			}],

			handshake: ['system', function (scope, cb) {
				var handshake = Handshake(scope.system);

				scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {


					console.log('\x1b[35m%s\x1b[0m', "HANDSHAKE START");

					try {
						var headers = extractHeaders(req);
					} catch (invalidHeadersException) {
						return next(invalidHeadersException);
					}

					console.log('\x1b[35m%s\x1b[0m', "HANDSHAKE START with ", headers.port);

					handshake(headers, function (err, peer) {
						var peerBuffer = Buffer.from(JSON.stringify(peer));

						console.log('HANDSHAKE connectionPrivateKey length ', scope.connectionPrivateKey.length, peerBuffer.length);
						if (peerBuffer.length === 0) {
							console.log('HANDSHAKE ---  peerBuffer eq 0 - peeer: ', peer);
						}
						var paylaod = {
							peer: new Peer(peer).object(),
							signature: ed.sign(peerBuffer, scope.connectionPrivateKey).toString('hex'),
							force: true
						};
						scope.slaveWAMPServer.sendToMaster(err ? 'removePeer' : 'acceptPeer', paylaod, req.remoteAddress, function (onMasterError) {
							console.log('\x1b[35m%s\x1b[0m', "HANDSHAKE START with ", headers.port, 'RESULT ERROR   : ', onMasterError);
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
					var peer = new Peer(headers);
					var peerBuffer = Buffer.from(JSON.stringify(peer));

					console.log('CONNECTION DISCONNECTED connectionPrivateKey length', scope.connectionPrivateKey.length, peerBuffer.length);

					if (peerBuffer.length === 0) {
						console.log('CONNECTION DISCONNECTED  ---  peerBuffer eq 0 - peeer: ', peer);
					}

					var paylaod = {
						peer: peer,
						signature: ed.sign(peerBuffer, scope.connectionPrivateKey).toString('hex'),
						force: true
					};

					return scope.slaveWAMPServer.sendToMaster('removePeer', paylaod, socket.request.remoteAddress, function (err, peer) {
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
