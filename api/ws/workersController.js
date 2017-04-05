'use strict';

var _ = require('lodash');
var memored = require('memored');
var ConcurrentWAMPServer = require('wamp-socket-cluster/ConcurrentWAMPServer');
var wsApi = require('../../helpers/wsApi');
var config = require('../../config.json');
var masterProcessController = require('./masterProcessController');
var endpoints = require('./endpoints');

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

	//ToDo: handshake goes here
	// worker.addMiddleware(masterProcessController.wsHandshake)

	worker.once('masterMessage', function (config) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKERS masterMessage GET THE CONFIG FROM MASTER ----- config', config);
		// ToDo: masterMessageConfig protocol to validate
		// if (v.valid(workerConfig, config))
		if (config.endpoints && config.endpoints.rpc && config.endpoints.event) {
			this.concurrentWAMPServer = new ConcurrentWAMPServer(worker, this.sockets, config.endpoints.rpc);
			this.config = config;
			console.log('\x1b[36m%s\x1b[0m', 'WORKERS masterMessage WILL Setup the sockets: ', this.sockets);

			_.filter(this.sockets, function (socket) {
				return !socket.settedUp;
			}).forEach(function (notSetSocket) {
				this.setupSocket(notSetSocket, worker);
			});

	var sockets = {};

	scServer.on('connection', function (socket) {

		sockets[socket.id] = socket;
		// socket.id

		// socket.remoteAddress

	socket.on('disconnect', function () {
		delete this.sockets[socket.id];
		//ToDo: add reassign endpoints to ConcurrentWAMPServer to avoid instant init
		if (this.concurrentWAMPServer) {
			this.concurrentWAMPServer.onSocketDisconnect(socket);
		}
		console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- DISCONNECTED', socket.id);
	}.bind(this));

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

	//ToDo: possible problems with registering multiple listeners on same events
	socket.settedUp = true;
	this.sockets[socket.id] = socket;
	if (this.concurrentWAMPServer) {
		this.concurrentWAMPServer.upgradeToWAMP(socket);
	}
};


var workerController = new WorkerController();

console.log('\x1b[36m%s\x1b[0m', 'WORKER CONTROLLER ACCESSED:', workerController);
module.exports = workerController;

