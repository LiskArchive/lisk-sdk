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

describe('Limited number of outbound/inbound connections', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const LIMITED_CONNECTIONS = 3;
	const ALL_NODE_PORTS_WITH_LIMIT: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);
	const POPULATOR_INTERVAL_WITH_LIMIT = 50;

	beforeEach(async () => {
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
			// Each node will have the previous node in the sequence as a seed peer except the first node.
			const seedPeers = [
				{
					ipAddress: '127.0.0.1',
					wsPort: NETWORK_START_PORT + ((index - 1) % NETWORK_PEER_COUNT),
				},
			];

			const nodePort = NETWORK_START_PORT + index;
			return new P2P({
				connectTimeout: 100,
				ackTimeout: 200,
				seedPeers,
				wsEngine: 'ws',
				populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
				latencyProtectionRatio: 0,
				productivityProtectionRatio: 0,
				longevityProtectionRatio: 0,
				maxOutboundConnections: LIMITED_CONNECTIONS,
				maxInboundConnections: LIMITED_CONNECTIONS,
				nodeInfo: {
					wsPort: nodePort,
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: '1.0.1',
					protocolVersion: '1.0.1',
					minVersion: '1.0.0',
					os: platform(),
					height: 0,
					broadhash:
						'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
					nonce: `O2wTkjqplHII${nodePort}`,
				},
			});
		});
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(1000);
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList.filter(p2p => p2p.isActive).map(p2p => p2p.stop()),
		);
		await wait(100);
	});

	it(`should not create more than ${LIMITED_CONNECTIONS} outbound connections`, async () => {
		for (let p2p of p2pNodeList) {
			const { outboundCount } = p2p['_peerPool'].getPeersCountPerKind();
			expect(outboundCount).to.be.at.most(LIMITED_CONNECTIONS);
		}
	});

	it(`should not create more than ${LIMITED_CONNECTIONS} inbound connections`, async () => {
		for (let p2p of p2pNodeList) {
			const { inboundCount } = p2p['_peerPool'].getPeersCountPerKind();
			expect(inboundCount).to.be.at.most(LIMITED_CONNECTIONS);
		}
	});

	it('should discover peers and add them to the peer lists within each node', async () => {
		for (let p2p of p2pNodeList) {
			const allPeers = p2p['_peerBook'].getAllPeers();
			const peerPorts = allPeers.map(peerInfo => peerInfo.wsPort);

			expect(ALL_NODE_PORTS_WITH_LIMIT).to.include.members(peerPorts);
		}
	});

	it('should have connected and disconnected peers', async () => {
		for (let p2p of p2pNodeList) {
			const connectedPeers = p2p.getConnectedPeers();

			expect(connectedPeers).is.not.empty;
		}
	});

	it('should have disjoint connected and disconnected peers', async () => {
		for (let p2p of p2pNodeList) {
			const connectedPeers = p2p.getConnectedPeers();
			const disconnectedPeers = p2p.getDisconnectedPeers();

			for (const connectedPeer of connectedPeers) {
				expect(disconnectedPeers).to.not.deep.include(connectedPeer);
			}
		}
	});
});
