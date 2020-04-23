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
import {
	EVENT_MESSAGE_RECEIVED,
	P2P,
	P2PConfig,
	P2PNodeInfo,
} from '../../dist-node';
import { randomBytes } from 'crypto';
import { platform } from 'os';

// Testnet
const nodeInfo: P2PNodeInfo = {
	os: platform(),
	nonce: randomBytes(8).toString('hex'),
	wsPort: 4001,
	networkId: '123456',
	version: '2.0.0',
	protocolVersion: '1.1',
	advertiseAddress: false,
	module: 'greet',
};

const testnetConfig: P2PConfig = {
	maxOutboundConnections: 5,
	maxInboundConnections: 10,
	whitelistedPeers: [{ ipAddress: '127.0.0.1', wsPort: 6001 }],
	nodeInfo,
};

// Instantiate a P2P instance
export const p2p = new P2P(testnetConfig);
/**
 * @description To start a p2p instance and listen to various events
 * @param {number} runTimeout Optional field to pass the time until the p2p node will run and shuts down automatically in milliseconds
 */
export const run = async (): Promise<void> => {
	// Start the P2P instance
	await p2p.start();
	console.log('P2P node is running successfully');

	// Your custom module
	greetModule(p2p);

	p2p.on('error', console.log);
};

const greetModule = (p2pNode: P2P) => {
	// Listen to message events
	p2pNode.on(EVENT_MESSAGE_RECEIVED, message => {
		if (message.event === 'greet') {
			console.log(`Received "${message.data.greet}" from ${message.peerId}`);
			// Reply to hi message
			p2pNode.sendToPeer(
				{ event: 'greet', data: { greet: 'Hi back' } },
				message.peerId,
			);
		}
	});
};
