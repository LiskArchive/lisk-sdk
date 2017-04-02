'use strict';

var _ = require('lodash');
var memored = require('memored');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var wsApi = require('../../helpers/wsApi');
var config = require('../../config.json');
var masterProcessController = require('./masterProcessController');
var endpoints = require('./endpoints');

/**
 * As workersController is started as separate node processes, global context off application is stored in different (parent) process
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


