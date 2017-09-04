'use strict';

var wsApi = require('../../helpers/wsApi');
var wsRPC = require('./rpc/wsRPC').wsRPC;
var slaveRPCStub = require('./rpc/wsRPC').slaveRPCStub;

function TransportWSApi (transportModule) {

	wsRPC.getServer().registerRPCEndpoints({
		acceptPeer: transportModule.internal.acceptPeer,
		removePeer: transportModule.internal.removePeer,
		blocksCommon: transportModule.shared.blocksCommon,
		blocks: transportModule.shared.blocks,
		list: transportModule.shared.list,
		height: transportModule.shared.height,
		getTransactions: transportModule.shared.getTransactions,
		getSignatures: transportModule.shared.getSignatures,
		status: transportModule.shared.status,
		postBlock: transportModule.shared.postBlock,
		postSignatures: transportModule.shared.postSignatures,
		postTransactions: transportModule.shared.postTransactions
	});

	wsRPC.getServer().registerRPCEndpoints(slaveRPCStub);
}

module.exports = TransportWSApi;
