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

			console.log('scServer: ', scope.scServer);

			scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {

				try {
					var headers = extractHeaders(req);
				} catch (invalidHeadersException) {
					return next(invalidHeadersException);
				}

				scope.slaveWAMPServer.sendToMaster('list', {query: {nonce: headers.nonce}}, headers.nonce, function (err, result) {

					//peer is already on list - no need to insert
					if (!err && result.peers.length) {
						return next();
					}
					//insert
					handshake(headers, function (err, peer) {

						var peerObject = peer.object();
						var paylaod = {
							peer: peerObject,
							signature: ed.sign(Buffer.from(JSON.stringify(peerObject)), scope.connectionPrivateKey).toString('hex')
						};
						scope.slaveWAMPServer.sendToMaster(err ? 'removePeer' : 'insertPeer', paylaod, req.remoteAddress, function (onMasterError) {
							next(err || onMasterError);
						});
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
				var peerObject = new Peer(headers).object();

				var paylaod = {
					peer: peerObject,
					signature: ed.sign(Buffer.from(JSON.stringify(peerObject)), scope.connectionPrivateKey).toString('hex')
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
