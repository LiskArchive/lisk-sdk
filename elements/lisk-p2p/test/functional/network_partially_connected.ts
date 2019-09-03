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

describe('Partially connected network which becomes fully connected: The seedPeers list of each node contains the next node in the sequence.', () => {
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

		p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
			// Each node will have the next node in the sequence as a seed peer.
			const seedPeers = [
				{
					ipAddress: '127.0.0.1',
					wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
				},
			];

			const nodePort = NETWORK_START_PORT + index;

			return new P2P({
				seedPeers,
				wsEngine: 'ws',
				connectTimeout: 100,
				ackTimeout: 100,
				peerBanTime: 100,
				populatorInterval: 100,
				maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
				maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
				nodeInfo: {
					wsPort: nodePort,
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					minVersion: '1.0.1',
					version: '1.0.1',
					protocolVersion: '1.1',
					os: platform(),
					height: 0,
					broadhash:
						'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
					nonce: `O2wTkjqplHII${nodePort}`,
				},
			});
		});
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(200);
	});

	after(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	describe('Peer discovery', () => {
		it('should discover all peers in the network after a few cycles of discovery', async () => {
			// Wait for a few cycles of discovery.
			await wait(POPULATOR_INTERVAL * 15);

			for (let p2p of p2pNodeList) {
				const peerPorts = p2p
					.getConnectedPeers()
					.map(peerInfo => peerInfo.wsPort)
					.sort();
				const expectedPeerPorts = ALL_NODE_PORTS.filter(
					peerPort => peerPort !== p2p.nodeInfo.wsPort,
				);

				expect(peerPorts).to.be.eql(expectedPeerPorts);
			}
		});
	});

	describe('Peer banning mechanism', () => {
		it('should not ban a bad peer for a 10 point penalty', async () => {
			const firstP2PNode = p2pNodeList[0];
			const badPeer = firstP2PNode.getConnectedPeers()[1];
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
				penalty: 10,
			};
			firstP2PNode.applyPenalty(peerPenalty);
			const updatedConnectedPeers = firstP2PNode.getConnectedPeers();
			expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.include(
				badPeer.wsPort,
			);
		});

		it('should ban a bad peer for a 100 point penalty', async () => {
			const firstP2PNode = p2pNodeList[0];
			const badPeer = firstP2PNode.getConnectedPeers()[2];
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
				penalty: 100,
			};
			firstP2PNode.applyPenalty(peerPenalty);
			const updatedConnectedPeers = firstP2PNode.getConnectedPeers();

			expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.not.include(
				badPeer.wsPort,
			);
		});

		it('should unban a peer after the ban period', async () => {
			const firstP2PNode = p2pNodeList[0];
			const badPeer = firstP2PNode.getConnectedPeers()[2];
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
				penalty: 100,
			};
			firstP2PNode.applyPenalty(peerPenalty);
			// Wait for ban time to expire and peer to be re-discovered
			await wait(1000);
			const updatedConnectedPeers = firstP2PNode.getConnectedPeers();

			expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.include(
				badPeer.wsPort,
			);
		});
	});

	describe('P2P.send', () => {
		describe('P2P.send when peers are at same height', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(async () => {
				collectedMessages = [];
				for (let p2p of p2pNodeList) {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message,
						});
					});
				}
			});

			it('should send messages to peers within the network; should reach multiple peers with even distribution', async () => {
				const TOTAL_SENDS = 100;
				const randomPeerIndex = Math.floor(Math.random() * NETWORK_PEER_COUNT);
				const randomP2PNode = p2pNodeList[randomPeerIndex];
				const nodePortToMessagesMap: any = {};

				const expectedAverageMessagesPerNode = TOTAL_SENDS;
				const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
				const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					randomP2PNode.send({ event: 'bar', data: i });
				}
				await wait(100);

				expect(collectedMessages).to.not.to.be.empty;
				for (let receivedMessageData of collectedMessages) {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(
						receivedMessageData,
					);
				}

				expect(nodePortToMessagesMap).to.not.to.be.empty;
				for (let receivedMessages of Object.values(
					nodePortToMessagesMap,
				) as any) {
					expect(receivedMessages).to.be.an('array');
					expect(receivedMessages.length).to.be.greaterThan(
						expectedMessagesLowerBound,
					);
					expect(receivedMessages.length).to.be.lessThan(
						expectedMessagesUpperBound,
					);
				}
			});
		});

		describe('P2P.send when peers are at different heights', () => {
			const randomPeerIndex = Math.floor(Math.random() * NETWORK_PEER_COUNT);
			let collectedMessages: Array<any> = [];
			let randomP2PNode: any;

			beforeEach(async () => {
				collectedMessages = [];
				randomP2PNode = p2pNodeList[randomPeerIndex];
				for (let p2p of p2pNodeList) {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message,
						});
					});
				}
			});

			it('should send messages to peers within the network with updated heights; should reach multiple peers with even distribution', async () => {
				const TOTAL_SENDS = 100;
				const nodePortToMessagesMap: any = {};

				for (let p2p of p2pNodeList) {
					p2p.applyNodeInfo({
						os: platform(),
						nethash:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: p2p.nodeInfo.version,
						protocolVersion: '1.1',
						wsPort: p2p.nodeInfo.wsPort,
						height: 1000 + (p2p.nodeInfo.wsPort % NETWORK_START_PORT),
						options: p2p.nodeInfo.options,
					});
				}

				await wait(200);

				const expectedAverageMessagesPerNode = TOTAL_SENDS;
				const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
				const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					randomP2PNode.send({ event: 'bar', data: i });
				}
				await wait(100);

				expect(collectedMessages).to.not.to.be.empty;
				for (let receivedMessageData of collectedMessages) {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(
						receivedMessageData,
					);
				}

				expect(nodePortToMessagesMap).to.not.to.be.empty;
				for (let receivedMessages of Object.values(
					nodePortToMessagesMap,
				) as any) {
					expect(receivedMessages).to.be.an('array');
					expect(receivedMessages.length).to.be.greaterThan(
						expectedMessagesLowerBound,
					);
					expect(receivedMessages.length).to.be.lessThan(
						expectedMessagesUpperBound,
					);
				}
			});
		});
	});

	describe('When half of the nodes crash', () => {
		it('should get network status with all unresponsive nodes removed', async () => {
			const firstP2PNode = p2pNodeList[0];
			// Stop all the nodes with port from 5001 to 5005
			p2pNodeList.forEach(async (p2p: any, index: number) => {
				if (index !== 0 && index < NETWORK_PEER_COUNT / 2) {
					await p2p.stop();
				}
			});
			await wait(200);

			const portOfLastInactivePort = ALL_NODE_PORTS[NETWORK_PEER_COUNT / 2];

			const actualConnectedPeers = firstP2PNode
				.getConnectedPeers()
				.filter(
					peer =>
						peer.wsPort !== NETWORK_START_PORT &&
						peer.wsPort % NETWORK_START_PORT > NETWORK_PEER_COUNT / 2,
				)
				.map(peer => peer.wsPort);

			// Check if the connected Peers are having port greater than the last port that we crashed by index
			for (let port of actualConnectedPeers) {
				expect(port).greaterThan(portOfLastInactivePort);
			}

			for (let p2p of p2pNodeList) {
				if (p2p.nodeInfo.wsPort > portOfLastInactivePort) {
					expect(p2p.isActive).to.be.true;
				}
			}
		});
	});
});
