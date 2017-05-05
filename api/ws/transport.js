'use strict';

var wsApi = require('../../helpers/wsApi');
var workersController = require('./workersController');
var WsRPCServer = require('../RPC').WsRPCServer;

function TransportWSApi (transportModule, app, logger) {

	this.rpcEndpoints = {
		acceptPeer: transportModule.internal.acceptPeer,
		removePeer: transportModule.internal.removePeer,
		ping: transportModule.internal.ping,
		blocksCommon: transportModule.internal.blocksCommon,
		blocks: transportModule.internal.blocks,
		list: transportModule.internal.list,
		height: transportModule.internal.height,
		getTransactions: transportModule.internal.getTransactions,
		getSignatures: transportModule.internal.getSignatures,
		status: transportModule.internal.status,
		postBlock: transportModule.internal.postBlock,
		postSignatures: transportModule.internal.postSignatures,
		postTransactions: transportModule.internal.postTransactions,
		postDappMessage: transportModule.internal.postDappMessage,
		postDappRequest: transportModule.internal.postDappRequest
	};

	this.eventEndpoints = {
		peerUpdate: transportModule.internal.onPeerUpdate
	};


	var wsServer = WsRPCServer.getServer();
	console.log('\x1b[36m%s\x1b[0m', 'TransportWSApi ----- invoke registerWorkerReceiver', wsServer.registerRPCEndpoints);
	wsServer.registerRPCEndpoints(this.rpcEndpoints);
	wsServer.registerEventEndpoints(this.eventEndpoints);
}

module.exports = TransportWSApi;
