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
import { randomBytes } from 'crypto';
import { platform } from 'os';

import {
	EVENT_CONNECT_OUTBOUND,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_NEW_INBOUND_PEER,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REQUEST_RECEIVED,
	P2P,
	P2PConfig,
	P2PNodeInfo,
} from '../../src';
// Node info for mainnet
const nodeInfo: P2PNodeInfo = {
	os: platform(),
	nonce: randomBytes(8).toString('hex'),
	port: 5001,
	networkId: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
	version: '2.0.0',
	httpPort: 5000,
	protocolVersion: '1.1',
	advertiseAddress: false,
};

const testnetConfig: P2PConfig = {
	maxOutboundConnections: 20,
	maxInboundConnections: 100,
	// Please make sure if there is a node running at below address and port.
	seedPeers: [{ ipAddress: '104.237.2.182', port: 8001 }],
	nodeInfo,
};

// Instantiate a P2P instance
const p2p = new P2P(testnetConfig);

// To start a p2p instance and listen to various events
const run = async () => {
	// Start the P2P instance
	await p2p.start();
	console.log('P2P node is running successfully');
	// Listen to request events
	p2p.on(EVENT_REQUEST_RECEIVED, request => {
		console.log(EVENT_REQUEST_RECEIVED, request);
	});
	// Listen to message events
	p2p.on(EVENT_MESSAGE_RECEIVED, message => {
		console.log(EVENT_MESSAGE_RECEIVED, message);
	});
	// Listen to connect outgoing connections events
	p2p.on(
		EVENT_CONNECT_OUTBOUND,
		async (outboundPeer): Promise<void> => {
			console.log(EVENT_CONNECT_OUTBOUND, outboundPeer);
			console.log('Total number of connected peers:', p2p.getConnectedPeers());

			const { data: peerData } = await p2p.request({ procedure: 'list' });
			console.log(
				'Received ',
				(peerData as any).peers.length,
				' number of peers.',
			);
		},
	);
	// Listen to connect incoming connections error events
	p2p.on(EVENT_INBOUND_SOCKET_ERROR, inboundError => {
		console.log(EVENT_INBOUND_SOCKET_ERROR, inboundError);
	});
	// Listen to connect outgoing connections error events
	p2p.on(EVENT_OUTBOUND_SOCKET_ERROR, outboundError => {
		console.log(EVENT_OUTBOUND_SOCKET_ERROR, outboundError);
	});
	// Listen to connect incoming connections events
	p2p.on(EVENT_NEW_INBOUND_PEER, inboundPeer => {
		console.log(EVENT_NEW_INBOUND_PEER, inboundPeer);
	});
	// Listen to connect outgoing connections failure events due to duplicate connections, handshake, etc.
	p2p.on(EVENT_FAILED_TO_ADD_INBOUND_PEER, inboundFailedError => {
		console.log(EVENT_FAILED_TO_ADD_INBOUND_PEER, inboundFailedError);
	});

	p2p.on('error', error => {
		console.log(error);
	});
};

run()
	.then(() => {
		console.log('Starting a P2P node...');
	})
	.catch(async err => {
		console.log('Something went wrong so shutting down the node...', err);
		await p2p.stop();
		process.exit(1);
	});
