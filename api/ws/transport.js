'use strict';

var wsApi = require('../../helpers/wsApi');
var workersController = require('./workersController');
var WsRPCServer = require('../RPC').WsRPCServer;

function TransportWSApi (transportModule, app, logger) {

	WsRPCServer.getServer().registerRPCEndpoints({
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
		postTransactions: transportModule.internal.postTransactions
	});
}

module.exports = TransportWSApi;
