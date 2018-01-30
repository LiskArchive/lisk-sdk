/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var wsApi = require('../../helpers/ws_api');
var wsRPC = require('./rpc/ws_rpc').wsRPC;
var slaveRPCStub = require('./rpc/ws_rpc').slaveRPCStub;

function TransportWSApi (transportModule) {

	wsRPC.getServer().registerRPCEndpoints({
		updatePeer: transportModule.internal.updatePeer,
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
