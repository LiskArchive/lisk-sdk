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

	this.sockets = {};

	var scServer = worker.getSCServer();

	this.concurrentWAMPServer = new ConcurrentWAMPServer(worker, this.sockets);
	//ToDo: handshake goes here
	// worker.addMiddleware(masterProcessController.wsHandshake)

	worker.once('masterMessage', function (config) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKERS masterMessage GET THE CONFIG FROM MASTER ----- config', config);
		// ToDo: masterMessageConfig protocol to validate
		// if (v.valid(workerConfig, config))
		if (config.endpoints && config.endpoints.rpc && config.endpoints.event) {
			this.config = config;
			this.concurrentWAMPServer.reassignEndpoints(config.endpoints.rpc.reduce(function (memo, endpoint) {
				memo[endpoint] = true;
				return memo;
			}, {}));
			console.log('\x1b[36m%s\x1b[0m', 'WORKERS masterMessage WILL Setup the sockets: ', this.sockets);

			_.filter(this.sockets, function (socket) {
				return !socket.settedUp;
			}).forEach(function (notSetSocket) {
				this.setupSocket(notSetSocket, worker);
			});

		} else {
			//ToDo: bring logger here and log process exited info
			//logger.trace('Received unvalid config from master');
			process.exit();
		}
	}.bind(this));

	scServer.on('connection', function (socket) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKER CONNECTION');
		this.setupSocket(socket, worker);
	}.bind(this));
};

WorkerController.prototype.setupSocket = function (socket, worker) {

	//ToDo: Extend basic listener- move it somewhere?
	socket.on('error', function (err) {
		//ToDo: Again logger here- log errors somewhere
		console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- ERROR', err);

		//err.message: 'Socket hung up'
	});

	socket.on('disconnect', function () {
		delete this.sockets[socket.id];
		this.concurrentWAMPServer.onSocketDisconnect(socket);
		console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- DISCONNECTED', socket.id);
	}.bind(this));

	this.config.endpoints.event.forEach(function (endpoint) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONNECTION ----- REGISTER EVENT ENDPOINT', endpoint);
		socket.on(endpoint, function (data) {
			console.log('\x1b[36m%s\x1b[0m', 'WORKERS CTRL ----- RECEIVED EVENT CALL FOR', endpoint);
			worker.sendToMaster({
				procedure: endpoint,
				data: data
			});
		});
	});

	//ToDo: possible problems with registering multiple listeners on same events
	socket.settedUp = true;
	this.sockets[socket.id] = socket;
	this.concurrentWAMPServer.upgradeToWAMP(socket);
};

var workerController = new WorkerController();

console.log('\x1b[36m%s\x1b[0m', 'WORKER CONTROLLER ACCESSED:', workerController);
module.exports = workerController;

