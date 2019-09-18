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

describe('Peer discovery threshold', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
	const MINIMUM_PEER_DISCOVERY_THRESHOLD = 1;
	const MAX_PEER_DISCOVERY_RESPONSE_LENGTH = 3;

	describe(`When minimum peer discovery threshold is set to ${MINIMUM_PEER_DISCOVERY_THRESHOLD}`, () => {
		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers =
					index === 0
						? []
						: [
								{
									ipAddress: '127.0.0.1',
									wsPort: NETWORK_START_PORT + index - 1,
								},
						  ];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					connectTimeout: 10000,
					ackTimeout: 200,
					seedPeers,
					wsEngine: 'ws',
					populatorInterval: 10000,
					maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
					maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
					minimumPeerDiscoveryThreshold: MINIMUM_PEER_DISCOVERY_THRESHOLD,
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
			});
			// Launch nodes one at a time with a delay between each launch.
			for (const p2p of p2pNodeList) {
				await p2p.start();
			}
			await wait(200);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList.filter(p2p => p2p.isActive).map(p2p => p2p.stop()),
			);
			await wait(100);
		});

		it('should return list of peers with at most the minimum discovery threshold', async () => {
			const firstP2PNode = p2pNodeList[0];
			const newPeers = (firstP2PNode as any)._peerBook.newPeers;
			expect(newPeers.length).to.be.at.most(MINIMUM_PEER_DISCOVERY_THRESHOLD);
		});
	});

	describe(`When maximum peer discovery response size is set to ${MAX_PEER_DISCOVERY_RESPONSE_LENGTH}`, () => {
		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers =
					index === 0
						? []
						: [
								{
									ipAddress: '127.0.0.1',
									wsPort: NETWORK_START_PORT + index - 1,
								},
						  ];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					connectTimeout: 10000,
					ackTimeout: 200,
					seedPeers,
					wsEngine: 'ws',
					populatorInterval: 10000,
					maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
					maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
					maxPeerDiscoveryResponseLength: MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
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
			});
			// Launch nodes one at a time with a delay between each launch.
			for (const p2p of p2pNodeList) {
				await p2p.start();
			}
			await wait(200);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(100);
		});

		it('should return list of peers with less than maximum discovery response size', async () => {
			const firstP2PNode = p2pNodeList[0];
			const newPeers = (firstP2PNode as any)._peerBook.newPeers;
			expect(newPeers.length).to.be.lessThan(
				MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
			);
		});
	});
});
