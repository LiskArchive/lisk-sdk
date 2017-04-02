'use strict';

var wsApi = require('../../helpers/wsApi');
var workersController = require('./workersController');
var endpoints = require('./endpoints');

function TransportWSApi (transportModule, app, logger) {

	console.log('\x1b[36m%s\x1b[0m', 'TransportWSApi ----- invoke registerWorkerReceiver');

	var endpoints = {
		rpc: {
			dupaRpc: function (random) {
				return 'dupa rpc ' + random;
			}
		},

		event: {
			dupaEmit: function (random) {
				return 'dupa emit ' + random;
			}
		}
	};

	endpoints.registerRPCEndpoints(endpoints.rpc);
	endpoints.registerEventEndpoints(endpoints.event);
}

module.exports = TransportWSApi;

