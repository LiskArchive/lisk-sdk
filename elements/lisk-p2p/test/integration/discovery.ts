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

describe('Peer discovery: Seed peers list of each node contains the previously launched node', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
	const ALL_NODE_PORTS: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);

	before(async () => {
		sandbox.restore();
	});

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
				connectTimeout: 100,
				ackTimeout: 200,
				rateCalculationInterval: 10000,
				seedPeers,
				wsEngine: 'ws',
				populatorInterval: POPULATOR_INTERVAL,
				maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
				maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
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
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));

		await wait(1000);
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	it('should discover all peers and add them to the connectedPeers list within each node', async () => {
		for (let p2p of p2pNodeList) {
			const peerPorts = p2p
				.getConnectedPeers()
				.map(peerInfo => peerInfo.wsPort)
				.sort();

			// The current node should not be in its own peer list.
			const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
				return port !== p2p.nodeInfo.wsPort;
			});

			expect(peerPorts).to.be.eql(expectedPeerPorts);
		}
	});

	it('should discover all peers and connect to all the peers so there should be no peer in newPeers list', () => {
		for (let p2p of p2pNodeList) {
			const newPeers = p2p['_peerBook'].newPeers;

			const peerPorts = newPeers.map(peerInfo => peerInfo.wsPort).sort();

			expect(ALL_NODE_PORTS).to.include.members(peerPorts);
		}
	});

	it('should discover all peers and add them to the triedPeers list within each node', () => {
		for (let p2p of p2pNodeList) {
			const triedPeers = p2p['_peerBook'].triedPeers;

			const peerPorts = triedPeers.map(peerInfo => peerInfo.wsPort).sort();

			// The current node should not be in its own peer list.
			const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
				return port !== p2p.nodeInfo.wsPort;
			});

			expect(expectedPeerPorts).to.include.members(peerPorts);
		}
	});

	it('should not contain itself in any of its peer list', async () => {
		for (let p2p of p2pNodeList) {
			const allPeers = p2p['_peerBook'].getAllPeers();

			const allPeersPorts = allPeers.map(peerInfo => peerInfo.wsPort).sort();
			const connectedPeerPorts = p2p
				.getConnectedPeers()
				.map(peerInfo => peerInfo.wsPort)
				.sort();

			expect([...allPeersPorts, ...connectedPeerPorts]).to.not.contain.members([
				p2p.nodeInfo.wsPort,
			]);
		}
	});
});
