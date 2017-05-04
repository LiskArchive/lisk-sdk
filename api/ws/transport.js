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

		ping: transportModule.internal.ping,
		blocksCommon: transportModule.internal.blocksCommon,
		blocks: transportModule.internal.blocks,
		list: transportModule.internal.list,
		height: transportModule.internal.height,
		getTransactions: transportModule.internal.getTransactions,
		status: transportModule.internal.status,
		postBlock: transportModule.internal.postBlock,
		postSignatures: transportModule.internal.postSignatures,
		postTransactions: transportModule.internal.postTransactions,
		postDappMessage: transportModule.internal.postDappMessage,
		postDappRequest: transportModule.internal.postDappRequest
	};

	this.eventEndpoints = {
		dupaEmit: function (random) {
			console.log('\x1b[31m%s\x1b[0m', 'TRANSPORT API: dupaEmit invoked', 2 * random);
		},

		peerUpdate: transportModule.internal.onPeerUpdate
	};

	console.log('\x1b[36m%s\x1b[0m', 'TransportWSApi ----- invoke registerWorkerReceiver', app.rpc.server.registerRPCEndpoints);

	app.rpc.server.registerRPCEndpoints(this.rpcEndpoints);
	app.rpc.server.registerEventEndpoints(this.eventEndpoints);
}

module.exports = TransportWSApi;
