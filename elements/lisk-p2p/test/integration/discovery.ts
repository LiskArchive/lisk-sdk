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
import { P2P, events, constants } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
	SEED_PEER_IP,
	NETWORK_CREATION_WAIT_TIME,
} from '../utils/network_setup';
import { constructPeerId } from '../../src/utils';

const {
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_NEW_INBOUND_PEER,
	EVENT_NETWORK_READY,
	EVENT_UPDATED_PEER_INFO,
	EVENT_BAN_PEER,
	EVENT_CLOSE_OUTBOUND,
	EVENT_REQUEST_RECEIVED,
} = events;

const {
	INTENTIONAL_DISCONNECT_CODE,
	SEED_PEER_DISCONNECTION_REASON,
} = constants;

describe('Network discovery', () => {
	const CUSTOM_FALLBACK_SEED_DISCOVERY_INTERVAL = 400;
	describe('Peer discovery', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		let disconnectedNode: P2P;
		const collectedEvents = new Map();
		const ALL_NODE_PORTS: ReadonlyArray<number> = [
			...new Array(NETWORK_PEER_COUNT).keys(),
		].map(index => NETWORK_START_PORT + index);

		beforeAll(async () => {
			// To capture all the initial events set network creation time to minimum 1 ms
			const customConfig = () => ({
				fallbackSeedPeerDiscoveryInterval: CUSTOM_FALLBACK_SEED_DISCOVERY_INTERVAL,
				rateCalculationInterval: 100,
			});

			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 0,
				customConfig,
			});
			const firstNode = p2pNodeList[0];

			firstNode.on(EVENT_NEW_INBOUND_PEER, () => {
				collectedEvents.set('EVENT_NEW_INBOUND_PEER', true);
			});
			firstNode.on(EVENT_FAILED_TO_ADD_INBOUND_PEER, () => {
				collectedEvents.set('EVENT_FAILED_TO_ADD_INBOUND_PEER', true);
			});
			// We monitor last node to ensure outbound connection
			p2pNodeList[p2pNodeList.length - 1].on(
				EVENT_FAILED_TO_FETCH_PEERS,
				() => {
					collectedEvents.set('EVENT_FAILED_TO_FETCH_PEERS', true);
				},
			);
			p2pNodeList[p2pNodeList.length - 1].on(EVENT_BAN_PEER, () => {
				collectedEvents.set('EVENT_BAN_PEER', true);
			});
			p2pNodeList[p2pNodeList.length - 1].on(EVENT_CONNECT_OUTBOUND, () => {
				collectedEvents.set('EVENT_CONNECT_OUTBOUND', true);
			});
			p2pNodeList[p2pNodeList.length - 1].on(EVENT_DISCOVERED_PEER, () => {
				collectedEvents.set('EVENT_DISCOVERED_PEER', true);
			});
			p2pNodeList[p2pNodeList.length - 1].on(EVENT_NETWORK_READY, () => {
				collectedEvents.set('EVENT_NETWORK_READY', true);
			});
			p2pNodeList[p2pNodeList.length - 1].on(EVENT_UPDATED_PEER_INFO, () => {
				collectedEvents.set('EVENT_UPDATED_PEER_INFO', true);
			});

			await Promise.all(p2pNodeList.map(p2p => p2p.start()));

			await wait(1000);
		});

		afterAll(async () => {
			await destroyNetwork(p2pNodeList);
			await disconnectedNode.stop();
			await wait(200);
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

				expect(peerPorts).toEqual(expectedPeerPorts);
			}
		});

		it('should discover all peers and connect to all the peers so there should be no peer in newPeers list', async () => {
			for (let p2p of p2pNodeList) {
				const newPeers = p2p['_peerBook'].newPeers;

				const peerPorts = newPeers.map(peerInfo => peerInfo.wsPort).sort();

				expect(ALL_NODE_PORTS).toIncludeAllMembers(peerPorts);
			}
		});

		it('should discover all peers and add them to the triedPeers list within each node', () => {
			for (let p2p of p2pNodeList) {
				const triedPeers = [...p2p['_peerBook'].triedPeers];
				const peerPorts = triedPeers
					.map(peerInfo => peerInfo.wsPort)
					.filter(port => {
						return port !== p2p.nodeInfo.wsPort;
					})
					.sort();
				// The current node should not be in its own peer list.
				const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
					return port !== p2p.nodeInfo.wsPort;
				});
				expect(expectedPeerPorts).toEqual(peerPorts);
			}
		});

		it('should not contain itself in any of its peer list', async () => {
			for (let p2p of p2pNodeList) {
				const allPeers = p2p['_peerBook'].allPeers;

				const allPeersPorts = allPeers.map(peerInfo => peerInfo.peerId).sort();
				const connectedPeerPorts = p2p
					.getConnectedPeers()
					.map(peerInfo => constructPeerId(peerInfo.ipAddress, peerInfo.wsPort))
					.sort();

				expect([...allPeersPorts, ...connectedPeerPorts]).not.toEqual(
					expect.arrayContaining([p2p.nodeInfo.peerId]),
				);
			}
		});

		it('should not apply penalty or throw error Peerlist at peer discovery', async () => {
			expect(
				collectedEvents.get('EVENT_FAILED_TO_FETCH_PEERS'),
			).toBeUndefined();
			expect(collectedEvents.get('EVENT_BAN_PEER')).toBeUndefined();
		});

		it(`should fire ${EVENT_NETWORK_READY} event`, async () => {
			expect(collectedEvents.get('EVENT_NETWORK_READY')).toBeDefined();
		});

		it(`should fire ${EVENT_NEW_INBOUND_PEER} event`, async () => {
			expect(collectedEvents.get('EVENT_NEW_INBOUND_PEER')).toBeDefined();
		});

		it(`should fire ${EVENT_CONNECT_OUTBOUND} event`, async () => {
			expect(collectedEvents.get('EVENT_CONNECT_OUTBOUND')).toBeDefined();
		});

		it(`should fire ${EVENT_UPDATED_PEER_INFO} event`, async () => {
			expect(collectedEvents.get('EVENT_UPDATED_PEER_INFO')).toBeDefined();
		});

		it(`should fire ${EVENT_DISCOVERED_PEER} event`, async () => {
			expect(collectedEvents.get('EVENT_DISCOVERED_PEER')).toBeDefined();
		});

		it(`should fire ${EVENT_FAILED_TO_ADD_INBOUND_PEER} event`, async () => {
			disconnectedNode = new P2P({
				connectTimeout: 100,
				ackTimeout: 200,
				seedPeers: [
					{
						ipAddress: '127.0.0.1',
						wsPort: 5000,
					},
				],
				fixedPeers: [
					{
						ipAddress: '127.0.0.1',
						wsPort: 5000,
					},
				],
				maxOutboundConnections: 1,
				maxInboundConnections: 0,
				nodeInfo: {
					wsPort: 5020,
					networkId: 'aaa',
					version: '9.9.9',
					protocolVersion: '9.9',
					minVersion: '9.9.9',
					os: platform(),
					height: 10000,
					nonce: `404`,
					advertiseAddress: true,
				},
			});
			await disconnectedNode.start();
			await wait(200);
			expect(
				collectedEvents.get('EVENT_FAILED_TO_ADD_INBOUND_PEER'),
			).toBeDefined();
		});
	});

	describe('Initial seed peer discovery', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Array();

		beforeEach(async () => {
			const customConfig = (index: number) => ({
				maxOutboundConnections: index % 2 === 1 ? 3 : 20,
			});

			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 0,
				customConfig,
			});

			p2pNodeList.forEach(p2p => {
				p2p.on(EVENT_CLOSE_OUTBOUND, msg => {
					if (msg.code === INTENTIONAL_DISCONNECT_CODE) {
						collectedEvents.push(msg.reason);
					}
				});
			});

			await Promise.all(p2pNodeList.map(p2p => p2p.start()));

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should disconnecting from seed peers', async () => {
			// Every peer should reach the Outbound Connection limit and disconnect from discoverySeedPeers
			expect(Object.keys(collectedEvents)).not.toHaveLength(0);

			for (const disconnectReason of collectedEvents) {
				expect(disconnectReason).toBe(SEED_PEER_DISCONNECTION_REASON);
			}
		});
	});

	describe('Fallback Seed Peer Discovery', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Array();

		beforeEach(async () => {
			const customConfig = (index: number) => ({
				maxOutboundConnections: index % 2 === 1 ? 3 : 20,
				fallbackSeedPeerDiscoveryInterval: index === 2 ? 100 : 10000,
				rateCalculationInterval: 100,
				populatorInterval:
					index === 2 ? CUSTOM_FALLBACK_SEED_DISCOVERY_INTERVAL : 10000,
			});

			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 0,
				customConfig,
			});

			const secondP2PNode = p2pNodeList[1];

			secondP2PNode.on(EVENT_REQUEST_RECEIVED, msg => {
				if (
					msg._procedure == 'getPeers' &&
					msg._peerId == constructPeerId(SEED_PEER_IP, NETWORK_START_PORT + 2)
				) {
					collectedEvents.push(msg);
				}
			});

			await Promise.all(p2pNodeList.map(p2p => p2p.start()));

			await wait(NETWORK_CREATION_WAIT_TIME);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it(`should receive getPeers multiple times`, async () => {
			// thirdP2PNode should send getPeers request 3 times (1 initial discovery + 2 fallback)
			expect(collectedEvents.length).toBe(
				1 +
					~~(
						NETWORK_CREATION_WAIT_TIME / CUSTOM_FALLBACK_SEED_DISCOVERY_INTERVAL
					),
			);
		});
	});
});
