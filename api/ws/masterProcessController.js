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

	socketCluster.on('workerMessage', function (msg) {
		// if (v.valid(workerCommand, msg)) {
		if (msg.command && msg.args) {
			if (endpoints.rpcEndpoints[msg.command]) {
				endpoints.rpcEndpoints[msg.command](msg.args, function (response) {
					socketCluster.sendToWorker(msg.workerId, response);
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

