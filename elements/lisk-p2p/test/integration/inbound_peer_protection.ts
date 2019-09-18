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
import { P2P } from '../../src/index';
import { InboundPeer } from '../../src/peer';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

describe('Peer inbound eviction for connection time', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		const customSeedPeers = (
			index: number,
			networkStartPort: number,
			networkSize: number,
		) => [
			{
				ipAddress: '127.0.0.1',
				wsPort: networkStartPort + ((index - 1 + networkSize) % networkSize),
			},
		];

		const customConfig = (
			index: number,
			networkStartPort: number,
			networkSize: number,
		) => ({
			latencyProtectionRatio: 0,
			productivityProtectionRatio: 0,
			longevityProtectionRatio: 0.5,
			maxInboundConnections: 3,
			populatorInterval: 100,
			seedPeers: customSeedPeers(index, networkStartPort, networkSize),
		});

		p2pNodeList = await createNetwork({ customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	// Due to randomization from shuffling and timing of the nodes
	// This test may experience some instability and not always evict.
	it('should not evict earliest connected peers', async () => {
		const firstNode = p2pNodeList[0];
		const inboundPeers = firstNode['_peerPool']
			.getPeers(InboundPeer)
			.map(peer => peer.wsPort);
		expect(inboundPeers).to.satisfy(
			(n: Number[]) => n.includes(5001) || n.includes(5002),
		);
	});
});
