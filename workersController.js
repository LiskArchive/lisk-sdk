'use strict';

var async = require('async');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

var Peer = require('./logic/peer');
var System = require('./modules/system');
var Handshake = require('./helpers/wsApi').middleware.Handshake;
var extractHeaders = require('./helpers/wsApi').extractHeaders;
var PeersUpdateRules = require('./api/ws/workers/peersUpdateRules');
var Rules = require('./api/ws/workers/rules');
var failureCodes = require('./api/ws/rpc/failureCodes');
var Logger = require('./logger');
var config = require('./config.json');

/**
 * Function is invoked by SocketCluster
 * @param {Worker} worker
 */
module.exports.run = function (worker) {

	var scServer = worker.getSCServer();

	async.auto({

		logger: function (cb) {
			cb(null, new Logger({echo: config.consoleLogLevel, errorLevel: config.fileLogLevel, filename: config.logFileName}));
		},

		slaveWAMPServer: ['logger', function (scope, cb) {
			new SlaveWAMPServer(worker, undefined, undefined, cb);
		}],

		config: ['slaveWAMPServer', function (scope, cb) {
			cb(null, scope.slaveWAMPServer.config);
		}],

		peersUpdateRules: ['slaveWAMPServer', function (scope, cb) {
			cb(null, new PeersUpdateRules(scope.slaveWAMPServer));
		}],

		registerRPCSlaveEndpoints: ['peersUpdateRules', function (scope, cb) {
			scope.slaveWAMPServer.reassignRPCSlaveEndpoints({
				updateMyself: scope.peersUpdateRules.external.update
			});
			cb();
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
			scope.slaveWAMPServer.upgradeToWAMP(socket);
			socket.on('disconnect', removePeerConnection.bind(null, socket));
			socket.on('error', function (err) {
				socket.disconnect(err.code, err.message);
			});

			insertPeerConnection(socket);
		});

		function insertPeerConnection (socket) {
			var headers = extractHeaders(socket.request);
			scope.handshake(headers, function (err, peer) {
				if (err) {
					return socket.disconnect(err.code, err.description);
				}
				updatePeerConnection(Rules.UPDATES.INSERT, socket, peer.object(), function (onUpdateError) {
					if (onUpdateError) {
						socket.disconnect(onUpdateError.code, onUpdateError.description);
					}
				});
			});
		}

		function removePeerConnection (socket, code) {
			if (failureCodes.errorMessages[code]) {
				return;
			}
			var headers = extractHeaders(socket.request);
			scope.slaveWAMPServer.onSocketDisconnect(socket);
			updatePeerConnection(Rules.UPDATES.REMOVE, socket, new Peer(headers).object(), function () {});
		}

		function updatePeerConnection (updateType, socket, peer, cb) {
			scope.peersUpdateRules.internal.update(updateType, peer, socket.id, function (onUpdateError) {
				var actionName = Object.keys(Rules.UPDATES)[updateType];
				if (onUpdateError) {
					scope.logger.warn(
						'Peer ' + actionName + ' error: code: ' + onUpdateError.code +
						', message: ' + failureCodes.errorMessages[onUpdateError.code] +
						', description: ' + onUpdateError.description);
				} else {
					scope.logger.info(actionName + ' peer: ' + peer.string + ' success');
				}
				return setImmediate(cb, onUpdateError);
			});
		}
	});
};

module.exports.path = __dirname + '/workersController.js';
