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
import { wait } from '../utils/helpers';
import { platform } from 'os';
import { InboundPeer } from '../../src/peer';

describe('Network with peer inbound eviction protection for connection time enabled', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT_WITH_LIMIT = 10;
	const MAX_INBOUND_CONNECTIONS = 3;
	const POPULATOR_INTERVAL_WITH_LIMIT = 100;

	before(async () => {
		// Make sure that integration tests use real timers.
		sandbox.restore();
	});

	beforeEach(async () => {
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT_WITH_LIMIT).keys()].map(
			index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort:
							NETWORK_START_PORT +
							((index - 1 + NETWORK_PEER_COUNT_WITH_LIMIT) %
								NETWORK_PEER_COUNT_WITH_LIMIT),
					},
				];

				const nodePort = NETWORK_START_PORT + index;
				return new P2P({
					connectTimeout: 100,
					ackTimeout: 200,
					seedPeers,
					wsEngine: 'ws',
					populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
					maxOutboundConnections: MAX_INBOUND_CONNECTIONS,
					maxInboundConnections: MAX_INBOUND_CONNECTIONS,
					latencyProtectionRatio: 0,
					productivityProtectionRatio: 0,
					longevityProtectionRatio: 0.5,
					nodeInfo: {
						wsPort: nodePort,
						nethash:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.1',
						protocolVersion: '1.1',
						minVersion: '1.0.0',
						os: platform(),
						height: 0,
						broadhash:
							'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
						nonce: `O2wTkjqplHII${nodePort}`,
					},
				});
			},
		);

		// Start nodes incrementally to make inbound eviction behavior predictable
		for (const p2p of p2pNodeList) {
			await wait(100);
			await p2p.start();
		}
		await wait(500);
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(100);
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
