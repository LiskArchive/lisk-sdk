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
	EVENT_CONNECT_OUTBOUND,
	EVENT_MESSAGE_RECEIVED,
	P2P,
	P2PConfig,
	P2PNodeInfo,
} from '../../dist-node';
import { randomBytes } from 'crypto';
import { platform } from 'os';

const cityRandom = () => {
	const CITIES = [
		'Aberdeen',
		'Abilene',
		'Akron',
		'Albany',
		'Albuquerque',
		'Alexandria',
		'Jefferson',
		'Jersey City',
		'Manchester',
		'Marina',
		'Marysville',
		'McAllen',
		'McHenry',
		'Medford',
		'Melbourne',
		'Murfreesboro',
		'Murrieta',
		'Muskegon',
		'Myrtle Beach',
		'Naperville',
		'Naples',
		'Nashua',
		'Nashville',
		'New Bedford',
		'New Haven',
		'New London',
		'New Orleans',
		'New York',
		'New York City',
		'Victorville',
		'Virginia Beach',
		'Visalia',
		'Waco',
		'Warren',
		'Washington',
		'West Valley City',
		'Wilmington',
		'Winston',
		'Winter Haven',
		'Worcester',
		'York',
		'Youngstown',
	];

	return CITIES[Math.floor(Math.random() * CITIES.length)];
};
// Testnet
const nodeInfo: P2PNodeInfo = {
	os: platform(),
	nonce: randomBytes(8).toString('hex'),
	port: 4001,
	networkId: '123456',
	version: '2.0.0',
	protocolVersion: '1.1',
	advertiseAddress: false,
	city: cityRandom(),
	module: 'city',
};

const testnetConfig: P2PConfig = {
	maxOutboundConnections: 5,
	maxInboundConnections: 10,
	whitelistedPeers: [{ ipAddress: '127.0.0.1', port: 6001 }],
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
	cityModule(p2p);

	p2p.on('error', console.log);
};
const cityModule = (p2pNode: P2P) => {
	let found = false;
	// Listen to message events
	p2pNode.on(EVENT_MESSAGE_RECEIVED, message => {
		if (message.event === 'randomWorld') {
			if (found) {
				return;
			}
			// The moment you receive this event try to change your city to find the same city
			if (message.data.city === p2pNode.nodeInfo.city) {
				console.log('%%%%% Found a common city %%%%%');
				console.log(message, p2pNode.nodeInfo.port);
				found = true;
			} else {
				p2pNode.applyNodeInfo({ ...p2pNode.nodeInfo, city: cityRandom() });
			}
		}
	});
	// Listen to connect outgoing connections events
	p2pNode.on(EVENT_CONNECT_OUTBOUND, async outboundPeer => {
		// When you make a successful connection, send your location to that peer.
		p2pNode.sendToPeer(
			{ event: 'randomWorld', data: { city: p2pNode.nodeInfo.city } },
			outboundPeer.peerId,
		);
	});

	setInterval(() => {
		p2pNode.send({
			event: 'randomWorld',
			data: { city: p2pNode.nodeInfo.city },
		});
	}, 3000);
};
