/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
const { P2P } = require('../../dist-node');
const { randomBytes } = require('crypto');

const customNodeInfoSchema = {
	$id: '/nodeInfo/custom',
	type: 'object',
	properties: {
		module: {
			dataType: 'string',
			fieldNumber: 1,
		},
		count: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};
// Testnet
const nodeInfo = {
	nonce: randomBytes(8).toString('hex'),
	networkIdentifier: '123456',
	networkVersion: '1.1',
	advertiseAddress: false,
	options: {
		module: 'greet',
		count: 0,
	},
};

// Instantiate a P2P instance
/**
 * @description To start a p2p instance and listen to various events
 * @param {number} runTimeout Optional field to pass the time until the p2p node will run and shuts down automatically in milliseconds
 */
const run = async (port, peers) => {
	const p2pConfig = {
		port,
		maxOutboundConnections: 5,
		maxInboundConnections: 10,
		customNodeInfoSchema,
		previousPeers: peers,
		nodeInfo,
	};

	const p2p = new P2P(p2pConfig);
	// Start the P2P instance
	await p2p.start();
	console.log(
		`P2P node with nonce "${nodeInfo.nonce}" is running successfully at port ${p2pConfig.port}`,
	);

	p2p.on('error', console.log);

	return new Promise(resolve => {
		resolve(p2p);
	});
};

module.exports = {
	run,
};
