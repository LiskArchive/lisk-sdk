'use strict';

var wsApi = require('../../helpers/wsApi');
var workersController = require('./workersController');

function TransportWSApi (transportModule, app, logger) {

	this.rpcEndpoints = {
		dupaRpc: function (random, cb) {
			console.log('\x1b[31m%s\x1b[0m', 'TRANSPORT API: dupaRPC invoked', 2 * random);
			return cb(null, 'dupa rpc ' + 2 * random);
		},
		acceptPeer: transportModule.internal.acceptPeer,
		removePeer: transportModule.internal.removePeer,
		ping: transportModule.internal.ping
	};

	this.eventEndpoints = {
		dupaEmit: function (random) {
			console.log('\x1b[31m%s\x1b[0m', 'TRANSPORT API: dupaEmit invoked', 2 * random);
		}
	};

	console.log('\x1b[36m%s\x1b[0m', 'TransportWSApi ----- invoke registerWorkerReceiver', app.rpc.server.registerRPCEndpoints);

	app.rpc.server.registerRPCEndpoints(this.rpcEndpoints);
	app.rpc.server.registerEventEndpoints(this.eventEndpoints);
}

module.exports = TransportWSApi;
