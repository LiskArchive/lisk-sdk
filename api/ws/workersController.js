'use strict';

var _ = require('lodash');
var memored = require('memored');
var WAMPServer = require('wamp-socket-cluster').WAMPServer;
var wsApi = require('../../helpers/wsApi');
var config = require('../../config.json');
var masterProcessController = require('./masterProcessController');
var endpoints = require('./endpoints');

/**
 * As workersController is started as separate node processes, global context off application is stored in different (parent) process
 */

/**
 * @class WorkerController
 */
function WorkerController () {}

WorkerController.path = __dirname + 'workersController.js';

/**
 * Function is invoked by SocketCluster 
 * @param {Worker} worker
 */
WorkerController.prototype.run = function (worker) {
	console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER ----- RUN');

	var scServer = worker.getScServer();

	// worker.addMiddleware(masterProcessController.wsHandshake)

	var wampServer = new WAMPServer();


	//{[socket.id] = callSignature?
	var registeredSocketCalls = {};

	var sockets = {};

	scServer.on('connection', function (socket) {

		sockets[socket.id] = socket;
		// socket.id

		// socket.remoteAddress

		worker.on('masterMessage', function (msg) {
			// if (v.validate(masterMsg, masterMsg)) {
			if (msg.procedure && msg.socketId && msg.callSignature) {
				// wampServer.processWAMPRequest(msg, sockets[msg.socketId]);
				// sockets[msg.socketId]
				// sockets[msg.socketId].emit(msg.response);
				registeredSocketCalls[msg.socketId][msg.procedure][msg.signature](msg.args);
			}
		});

		_.each(endpoints.eventEndpoints, function (endpoint) {
			socket.on('endpoint', function (data) {
				worker.sendToMaster({
					command: endpoint,
					args: data
				});
			});
		});

		function passFromSocketToMaster(data, cb) {
			registeredSocketCalls[socket.id][data.procedure][data.signature] = cb;
			worker.sendToMaster(data);
		}

		var middlewareRpcEndpoints = _.reduce(endpoint.rpcEndpoints, function (memo, procedure, rpcEndpoint) {
			return memo[rpcEndpoint] = passFromSocketToMaster;
		}, {});

		wampServer.reassignEndpoints(middlewareRpcEndpoints);

		var wampSocket = wampServer.upgradeToWAMP(socket);

		wampServer.reassignEndpoints(endpoints.rpcEndpoints);

	});


};


var workerController = new WorkerController();

console.log('\x1b[36m%s\x1b[0m', 'WORKER CONTROLLER ACCESSED:', workerController);
module.exports = workerController;


