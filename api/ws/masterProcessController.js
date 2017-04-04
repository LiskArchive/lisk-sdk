'use strict';

var endpoints = require('./endpoints');

var _ = require('lodash');

function MasterProcessController() {}

MasterProcessController.prototype.setupWorkersCommunication = function (socketCluster) {
	console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: setupWorkersCommunication');
	socketCluster.on('workerStart', function (worker) {
		console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: workerStart ----- workerID:', worker.id, {
			endpoints: {
				rpc: Object.keys(endpoints.rpcEndpoints),
				event: Object.keys(endpoints.eventEndpoints)
			}
		});

		socketCluster.sendToWorker(worker.id, {
			endpoints: {
				rpc: Object.keys(endpoints.rpcEndpoints),
				event: Object.keys(endpoints.eventEndpoints)
			}
		});
	});

	socketCluster.on('workerMessage', function (worker, request) {
		console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- request:', request);

				// if (v.valid(workerprocedure, request)) {
		//ToDo: different validation for WAMP and EVENT
		if (request.procedure) {
			if (endpoints.rpcEndpoints[request.procedure]) {
				console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- invoking RPC procedure:', endpoints.rpcEndpoints[request.procedure]);
				endpoints.rpcEndpoints[request.procedure](request.data, function (err, response) {
					console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- invoking RPC callback ---- response', response, 'err', err);
					response = _.extend(request, {data: response, err: err});
					socketCluster.sendToWorker(response.workerId, response);
				});
			} else if (endpoints.eventEndpoints[request.procedure]) {
				console.log('\x1b[36m%s\x1b[0m', 'MASTER CTRL: ON workerMessage ----- invoking EVENT procedure:', endpoints.eventEndpoints[request.procedure]);
				endpoints.eventEndpoints[request.procedure](request.data, function (err, message) {
					//ToDo: typical error message handler

				});
			}
		}
	});

};

module.exports = MasterProcessController;

