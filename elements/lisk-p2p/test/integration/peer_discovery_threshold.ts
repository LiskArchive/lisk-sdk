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
import { expect } from 'chai';
import { P2P, EVENT_DISCOVERED_PEER } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

describe('Peer discovery threshold', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const MINIMUM_PEER_DISCOVERY_THRESHOLD = 10;
	const MAX_PEER_DISCOVERY_RESPONSE_LENGTH = 100;
	let listOfPeers: any[] = [];

	beforeEach(async () => {
		const customConfig = () => ({
			minimumPeerDiscoveryThreshold: MINIMUM_PEER_DISCOVERY_THRESHOLD,
			maxPeerDiscoveryResponseLength: MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
			fallbackSeedPeerDiscoveryInterval: 10000,
			populatorInterval: 10000,
		});

		p2pNodeList = await createNetwork({
			networkSize: 2,
			networkDiscoveryWaitTime: 1,
			customConfig,
		});

		[...new Array(1000).keys()].map(() => {
			const generatedIP = `${Math.floor(Math.random() * 254) + 1}.${Math.floor(
				Math.random() * 254,
			) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(
				Math.random() * 254,
			) + 1}`;

			p2pNodeList[0]['_peerBook'].addPeer({
				peerId: `${generatedIP}:5000`,
				ipAddress: generatedIP,
				wsPort: 1000,
				sharedState: {
					height: 0,
					protocolVersion: '1.1',
					version: '1.1',
				},
			});
		});

		p2pNodeList[1].on(EVENT_DISCOVERED_PEER, peer => {
			listOfPeers.push(peer);
		});

		await wait(1000);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should return list of peers with size between ${MINIMUM_PEER_DISCOVERY_THRESHOLD} - ${MAX_PEER_DISCOVERY_RESPONSE_LENGTH}`, async () => {
		expect(
			listOfPeers.length >= MINIMUM_PEER_DISCOVERY_THRESHOLD &&
				listOfPeers.length <= MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
		).to.be.eql(true);
	});
});
