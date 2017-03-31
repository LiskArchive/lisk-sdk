'use strict';

var _ = require('lodash');
var memored = require('memored');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var wsApi = require('../../helpers/wsApi');
var config = require('../../config.json');


/**
 * As workersController is started as separate node processes, common variables may be stored in local machine memory
 */
//ToDo: Move it into WAMPServer!!!!
function ConcurrentWAMP(worker, rpcProcedures, sockets) {

	this.wampServer = new WAMPServer();

	this.worker = worker;
	this.RPCCalls = {};

	setInterval(function() {
		console.log("\x1b[33m%s\x1b[0m", 'ConcurrentWAMP: state check ----- RPCCalls', this.RPCCalls);
		console.log("\x1b[33m%s\x1b[0m", 'ConcurrentWAMP: state check ----- sockets (keys)', Object.keys(sockets));
	}.bind(this), 5000);


	WAMPServer.prototype.processWAMPRequest = function (request, socket) {
		request.socketId = socket.id;
		request.workerId = worker.id;
		console.log('\x1b[36m%s\x1b[0m', 'WORKER CTRL: SEND TO MASTER WAMP REQUEST', request);
		this.worker.sendToMaster(request);
		this.saveCall(socket, request);
	}.bind(this);


	this.wampServer.reassignEndpoints(rpcProcedures);

	this.worker.on('masterMessage', function (response) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKER CTRL:ConcurrentWAMP RECEIVED RESPONSE FROM MASTER', response, typeof response, response.workerId && response.socketId);
		//ToDo: add schema validation for response
		// if (v.validate(masterMsg, masterMsg)) {
		if ((response.workerId || response.workerId === 0) && response.socketId) {
			console.log('\x1b[36m%s\x1b[0m', 'WORKER CTRL:ConcurrentWAMP ------ !!this.sockets', !!sockets);
			var socket = sockets[response.socketId];
			console.log('\x1b[36m%s\x1b[0m', 'WORKER CTRL:ConcurrentWAMP checking existing calls', response);
			if (this.checkCall(socket, response)) {
				console.log('\x1b[36m%s\x1b[0m', 'WORKER CTRL:ConcurrentWAMP Replying to client', response);
				this.wampServer.reply(socket, response, response.err, response.data);
				this.deleteCall(socket, response);
			}
		}
	}.bind(this));
}

ConcurrentWAMP.prototype.onSocketDisconnect = function (socket) {
	delete this.RPCCalls[socket.id];
};


ConcurrentWAMP.prototype.checkCall = function (socket, request) {
	return _.get(this.RPCCalls, socket.id + '.' + request.procedure + '.' + request.signature, false);
};

ConcurrentWAMP.prototype.saveCall = function (socket, request) {
	_.setWith(this.RPCCalls, socket.id + '.' + request.procedure + '.' + request.signature, true, Object);
};

ConcurrentWAMP.prototype.deleteCall = function (socket, request) {
	return delete this.RPCCalls[socket.id][request.procedure][request.signature];
};



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
function WorkerController () {
	this.config = null;
}

/**
 * Function is invoked by SocketCluster
 * @param {Worker} worker
 */

	this.sockets = {};

	var scServer = worker.getSCServer();

	this.concurrentWAMP = new ConcurrentWAMP(worker, endpoints.rpcEndpoints, this.sockets);

	//ToDo: handshake goes here
	// worker.addMiddleware(masterProcessController.wsHandshake)

	worker.once('masterMessage', function (config) {
		console.log('\x1b[36m%s\x1b[0m', 'WORKERS masterMessage GET THE CONFIG FROM MASTER ----- config', config);
		// ToDo: masterMessageConfig protocol to validate
		// if (v.valid(workerConfig, config))
		if (config.endpoints && config.endpoints.rpc && config.endpoints.event) {
			this.config = config;
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
	});

	socket.on('disconnect', function () {
		delete this.sockets[socket.id];
		this.concurrentWAMP.onSocketDisconnect(socket);
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
	this.concurrentWAMP.wampServer.upgradeToWAMP(socket);
	socket.settedUp = true;
	this.sockets[socket.id] = socket;
};

var workerController = new WorkerController();

console.log('\x1b[36m%s\x1b[0m', 'WORKER CONTROLLER ACCESSED:', workerController);
module.exports = workerController;


