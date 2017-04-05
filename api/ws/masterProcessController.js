'use strict';

var endpoints = require('./endpoints');

var _ = require('lodash');

function MasterProcessController(handshake) {
	this.handshake = handshake;
}

MasterProcessController.prototype.wsHandshake = function (data, next) {

	this.handshake(data.ip, data.port, function () {
		if (err) {
			next(err);
		} else {
			next();
		}
	});
};

MasterProcessController.prototype.setupInterWorkersCommunication = function (socketCluster) {

	socketCluster.on('workerMessage', function (worker, request) {
		console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- request:', request);

				// if (v.valid(workerprocedure, request)) {
		//ToDo: different validation for WAMP and EVENT
		if (request.procedure) {
			if (endpoints.rpcEndpoints[request.procedure]) {
				console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- invoking RPC procedure:', endpoints.rpcEndpoints[request.procedure]);
				endpoints.rpcEndpoints[request.procedure](request.data, function (err, response) {
					console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- invoking RPC callback ---- response', response, 'err', err);
					response = _.extend(request, {data: response, err: err, success: !err});
					socketCluster.sendToWorker(response.workerId, response);
				});
			} else if (endpoints.eventEndpoints[msg.command]) {
				endpoints.eventEndpoints[msg.command](msg.args, function (err, message) {
					//ToDo: typical error message handler

				});
			}
		}
	});

};

module.exports = MasterProcessController;

