'use strict';

var wsApi = require('../../helpers/wsApi');
var workersController = require('./workersController');

function TransportWSApi (transportModule, app, logger) {

	console.log('\x1b[36m%s\x1b[0m', 'TransportWSApi ----- invoke registerWorkerReceiver');

	var transportEndpoints = {
		rpc: {
			dupaRpc: function (random, cb) {
				console.log('\x1b[36m%s\x1b[0m', 'TRANSPORT API: dupaRPC invoked', 2 * random);
				return cb(null, 'dupa rpc ' + 2 * random);
			}
		},

		event: {
			dupaEmit: function (random, cb) {
				console.log('\x1b[36m%s\x1b[0m', 'TRANSPORT API: dupaEmit invoked', 2 * random);
				return cb(null, 'dupa emit ' + 2 * random);
			}
		}
	};

	endpoints.registerRPCEndpoints(transportEndpoints.rpc);
	endpoints.registerEventEndpoints(transportEndpoints.event);
}

module.exports = TransportWSApi;

