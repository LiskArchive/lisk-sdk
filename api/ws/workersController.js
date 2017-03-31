'use strict';

var _ = require('lodash');
var memored = require('memored');
var WAMPServer = require('wamp-socket-cluster').WAMPServer;
var wsApi = require('../../helpers/wsApi');
var config = require('../../config.json');


/**
 * As workersController is started as separate node processes, common variables may be stored in local machine memory
 */

/**
 * @class WorkerReceiver
 * @param {string} id
 * @param {function} cb
 * @returns {{id: string, worker: Worker, invoked: boolean, cb: function}} workerReceiver
 */
function WorkerReceiver(id, cb) {
		this.id = id;
		this.cb = cb;
		this.worker = null;
		this.invoked = false;
}
/**
 * @class WorkerController
 */
function WorkerController () {}

/**
 * @type {Array<WorkerReceiver>}
 */

WorkerController.prototype.registeredReceivers = {};

/**
 * @type {Array<Worker>}
 */
WorkerController.prototype.unemployedWorkers = [];

/**
 * @param {Worker} worker
 */
WorkerController.prototype.addWorker = function (worker, scServer) {
	console.log('\x1b[36m%s\x1b[0m', 'WOKRERS CONTROLLER ----- ADD WORKER', worker.id);

	var receiverToHandle = _.find(this.registeredReceivers, function (receiver) {
		return !receiver.invoked;
	});
	console.log('\x1b[36m%s\x1b[0m', 'WOKRERS CONTROLLER ----- ADD WORKER, FREE RECEIVER', receiverToHandle);

	if (!receiverToHandle) {
		this.unemployedWorkers.push(worker);
	} else {
		console.log("ADD WORKER -- SENDING RECEIVER TO HANDLE", receiverToHandle);
		scServer.sendToWorker(worker.id, {receiver: receiverToHandle});
	}
};

/**
 * @param {Worker} toRemoveWorker
 */
WorkerController.prototype.removeWorker = function (toRemoveWorker) {
	console.log('\x1b[36m%s\x1b[0m', 'WOKRERS CONTROLLER ----- REMOVE WORKER', worker.id);

	this.unemployedWorkers = this.unemployedWorkers.map(function (worker) {
		return worker.id !== toRemoveWorker.id;
	});
};

WorkerController.path = __dirname + 'workersController.js';

/**
 * @param {string} id
 * @param {object} scServer
 * @param {function} cb
 * @throws {Error} thrown when already registered
 */
WorkerController.prototype.registerWorkerReceiver = function (id, scServer, cb) {
	console.log('\x1b[36m%s\x1b[0m', 'WOKRERS CONTROLLER ----- registerWorkerReceiver; WORKERS: ', this.unemployedWorkers);

	if (this.registeredReceivers[id]) {
		throw new Error('Worker receiver is already registered with id: ', id);
	}
	var newReceiver = new WorkerReceiver(id, cb);
	this.registeredReceivers[id] = newReceiver;

	var freeWorker = this.unemployedWorkers.shift();

	if (freeWorker) {
		scServer.sendToWorker(freeWorker.id, {receiver: newReceiver});
	}
};


/**
 * Function is invoked by SocketCluster 
 * @param {Worker} worker
 */
WorkerController.prototype.run = function (worker) {
	console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER ----- RUN', this.registeredReceivers);

	worker.on('masterMessage', function (message) {
		console.log('\x1b[36m%s\x1b[0m', 'ON MASTER MESSAGE: ', worker.id);
		if (message.receiver) {
			this.handleReceiver(message.receiver, worker);
		}
	}.bind(this));

	// var scServer = worker.getSCServer();
	//
	// scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, wsApi.middleware.handshakeMiddleware);

	// var receiverToHandle = _.find(this.registeredReceivers, function (receiver) {
	// 	return !receiver.invoked;
	// });
	//
	// if (!receiverToHandle) {
	// 	this.unemployedWorkers[worker.id] = worker;
	// } else {
	// 	this.handleReceiver(receiverToHandle, worker);
	// }
};

/**
 * @param {WorkerReceiver} receiverToHandle
 * @param {Worker} worker
 */
WorkerController.prototype.handleReceiver = function (receiverToHandle, worker) {
	console.log('\x1b[36m%s\x1b[0m', 'WOKRERS CONTROLLER ----- handleReceiver', receiverToHandle);

	var scServer = worker.getSCServer();

	scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, wsApi.middleware.handshakeMiddleware);

	receiverToHandle.cb(worker);

	this.registeredReceivers[receiverToHandle.id].invoked = true;
	this.registeredReceivers[receiverToHandle.id].worker = worker;
};

var workerController = new WorkerController();

console.log('\x1b[36m%s\x1b[0m', 'WORKER CONTROLLER ACCESSED:', workerController);
module.exports = workerController;


