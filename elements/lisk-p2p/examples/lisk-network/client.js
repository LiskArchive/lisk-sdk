/*
 * Copyright © 2020 Lisk Foundation
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

const {
	P2P,
	events: {
		EVENT_REQUEST_RECEIVED,
		EVENT_MESSAGE_RECEIVED,
		EVENT_CONNECT_OUTBOUND,
		EVENT_INBOUND_SOCKET_ERROR,
		EVENT_NEW_INBOUND_PEER,
		EVENT_OUTBOUND_SOCKET_ERROR,
		EVENT_FAILED_TO_ADD_INBOUND_PEER,
	},
} = require('../../dist-node');
const { randomBytes } = require('crypto');

const networks = {
	mainnet: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
	testnet: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
	devnet: 'ccb837b25bc4f1b43fc08c2e80b07c6b46b84bf2264f6a37eaa4416fe478a0c5',
};

const customNodeInfoSchema = {
	$id: '/nodeInfo/custom',
	type: 'object',
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		blockVersion: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		lastBlockID: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
	},
};

let p2p;
// To start a p2p instance and listen to various events
const run = async () => {
	const networkName = process.argv.slice(1)[1];
	const networkIdentifier = networks[networkName] ? networks[networkName] : networks.devnet;
	console.log(
		`Running "${
			networks[networkName] ? networkName : 'devnet'
		}" network based on your input "${networkName}".`,
	);

	const nodeInfo = {
		advertiseAddress: false,
		networkIdentifier,
		networkVersion: '2.0',
		nonce: randomBytes(8).toString('hex'),
		options: {},
	};

	const config = {
		port: 5001,
		customNodeInfoSchema,
		// Add any node's ip and port to which your want to connect first.
		seedPeers: [{ ipAddress: '127.0.0.1', port: 8001 }],
		nodeInfo,
	};

	p2p = new P2P(config);
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
	p2p.on(EVENT_CONNECT_OUTBOUND, async outboundPeer => {
		console.log(EVENT_CONNECT_OUTBOUND, outboundPeer);
		console.log('Total number of connected peers:', p2p.getConnectedPeers());

		try {
			// Request last block
			const { data: lastBlock } = await p2p.requestFromPeer(
				{ procedure: 'getLastBlock' },
				outboundPeer.peerId,
			);
			console.log('Received last block: ', lastBlock);
		} catch (err) {
			console.log('Error occured while requesting');
		}
	});
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
		console.log(`Node is running successfully at port ${p2p.config.port}`);
	})
	.catch(async err => {
		console.log('Something went wrong so shutting down the node...', err);
		await p2p.stop();
		process.exit(1);
	});
