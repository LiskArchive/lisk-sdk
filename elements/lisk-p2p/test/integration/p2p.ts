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
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import cloneDeep = require('lodash.clonedeep');
import { expect } from 'chai';
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';
import {
	P2PPeerSelectionForSendFunction,
	P2PPeerSelectionForRequestFunction,
	P2PPeerSelectionForConnectionFunction,
	P2PPeerSelectionForSendInput,
	P2PPeerSelectionForRequestInput,
	P2PPeerSelectionForConnectionInput,
} from '../../src/p2p_types';
import { EVENT_REMOVE_PEER } from '../../src/events';
import { InboundPeer } from '../../src/peer';

describe('Integration tests for P2P library', () => {
	before(() => {
		// Make sure that integration tests use real timers.
		sandbox.restore();
	});

	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
	const ALL_NODE_PORTS: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);
	const NO_PEERS_FOUND_ERROR = `Request failed due to no peers found in peer selection`;

	let p2pNodeList: ReadonlyArray<P2P> = [];

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	describe('Disconnected network: All nodes launch at the same time. Each node has an empty seedPeers list', () => {
		beforeEach(async () => {
			p2pNodeList = ALL_NODE_PORTS.map(nodePort => {
				return new P2P({
					connectTimeout: 200,
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
			await wait(100);
		});

		it('should set the isActive property to true for all nodes', () => {
			for (let p2p of p2pNodeList) {
				expect(p2p).to.have.property('isActive', true);
			}
		});

		describe('P2P.request', () => {
			it('should throw an error when not able to get any peer in peer selection', async () => {
				const firstP2PNode = p2pNodeList[0];
				const response = firstP2PNode.request({
					procedure: 'foo',
					data: 'bar',
				});

				expect(response).to.be.rejectedWith(Error, NO_PEERS_FOUND_ERROR);
			});
		});
	});

	describe('Partially connected network which becomes fully connected: The seedPeers list of each node contains the next node in the sequence. Discovery interval runs multiple times.', () => {
		beforeEach(async () => {
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
					ackTimeout: 200,
					peerBanTime: 100,
					populatorInterval: POPULATOR_INTERVAL,
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

		describe('Peer discovery', () => {
			it('should discover all peers in the network after a few cycles of discovery', async () => {
				// Wait for a few cycles of discovery.
				await wait(POPULATOR_INTERVAL * 10);

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
					const randomPeerIndex = Math.floor(
						Math.random() * NETWORK_PEER_COUNT,
					);
					const randomP2PNode = p2pNodeList[randomPeerIndex];
					const nodePortToMessagesMap: any = {};

					const expectedAverageMessagesPerNode = TOTAL_SENDS;
					const expectedMessagesLowerBound =
						expectedAverageMessagesPerNode * 0.5;
					const expectedMessagesUpperBound =
						expectedAverageMessagesPerNode * 1.5;

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
					const expectedMessagesLowerBound =
						expectedAverageMessagesPerNode * 0.5;
					const expectedMessagesUpperBound =
						expectedAverageMessagesPerNode * 1.5;

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

	describe('Fully connected network: The seedPeers list of each node contains the previously launched node', () => {
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

		describe('Peer discovery', () => {
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

					const allPeersPorts = allPeers
						.map(peerInfo => peerInfo.wsPort)
						.sort();
					const connectedPeerPorts = p2p
						.getConnectedPeers()
						.map(peerInfo => peerInfo.wsPort)
						.sort();

					expect([
						...allPeersPorts,
						...connectedPeerPorts,
					]).to.not.contain.members([p2p.nodeInfo.wsPort]);
				}
			});
		});

		describe('Cleanup unresponsive peers', () => {
			it('should remove inactive 2nd node from connected peer list of other', async () => {
				const secondNode = p2pNodeList[1];
				const initialPeerPorts = p2pNodeList[0]
					.getConnectedPeers()
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
					return port !== NETWORK_START_PORT;
				});
				expect(initialPeerPorts).to.be.eql(expectedPeerPorts);
				await secondNode.stop();

				await wait(200);

				const peerPortsAfterPeerCrash = p2pNodeList[0]
					.getConnectedPeers()
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				const expectedPeerPortsAfterPeerCrash = ALL_NODE_PORTS.filter(port => {
					return port !== NETWORK_START_PORT && port !== NETWORK_START_PORT + 1;
				});

				expect(peerPortsAfterPeerCrash).to.contain.members(
					expectedPeerPortsAfterPeerCrash,
				);
			});
		});

		describe('P2P.request', () => {
			beforeEach(() => {
				for (let p2p of p2pNodeList) {
					// Collect port numbers to check which peer handled which request.
					p2p.on('requestReceived', request => {
						if (!request.wasResponseSent) {
							request.end({
								nodePort: p2p.nodeInfo.wsPort,
								requestProcedure: request.procedure,
								requestData: request.data,
								requestPeerId: request.peerId,
							});
						}
					});
				}
			});

			it('should make request to the network; it should reach a single peer', async () => {
				const secondP2PNode = p2pNodeList[1];
				const response = await secondP2PNode.request({
					procedure: 'foo',
					data: 'bar',
				});
				expect(response).to.have.property('data');
				expect(response.data)
					.to.have.property('nodePort')
					.which.is.a('number');
				expect(response.data)
					.to.have.property('requestProcedure')
					.which.is.a('string');
				expect(response.data)
					.to.have.property('requestData')
					.which.is.equal('bar');
				expect(response.data)
					.to.have.property('requestPeerId')
					.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
			});

			// Check for even distribution of requests across the network. Account for an error margin.
			// TODO: Skipping this test as of now because we are removing duplicate IPs so this scenario will not work locally
			it.skip('requests made to the network should be distributed randomly', async () => {
				const TOTAL_REQUESTS = 1000;
				const firstP2PNode = p2pNodeList[0];
				const nodePortToResponsesMap: any = {};

				const expectedAverageRequestsPerNode =
					TOTAL_REQUESTS / NETWORK_PEER_COUNT;
				const expectedRequestsLowerBound = expectedAverageRequestsPerNode * 0.5;
				const expectedRequestsUpperBound = expectedAverageRequestsPerNode * 1.5;

				for (let i = 0; i < TOTAL_REQUESTS; i++) {
					const response = await firstP2PNode.request({
						procedure: 'foo',
						data: i,
					});
					let resultData = response.data as any;
					if (!nodePortToResponsesMap[resultData.nodePort]) {
						nodePortToResponsesMap[resultData.nodePort] = [];
					}
					nodePortToResponsesMap[resultData.nodePort].push(resultData);
				}

				for (let requestsHandled of Object.values(
					nodePortToResponsesMap,
				) as any) {
					expect(requestsHandled).to.be.an('array');
					expect(requestsHandled.length).to.be.greaterThan(
						expectedRequestsLowerBound,
					);
					expect(requestsHandled.length).to.be.lessThan(
						expectedRequestsUpperBound,
					);
				}
			});
		});

		describe('P2P.send', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(() => {
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

			it('should send a message to peers; should reach peers with even distribution', async () => {
				const TOTAL_SENDS = 100;
				const firstP2PNode = p2pNodeList[0];
				const nodePortToMessagesMap: any = {};

				const expectedAverageMessagesPerNode = TOTAL_SENDS;
				const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
				const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					firstP2PNode.send({ event: 'bar', data: i });
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

			it('should receive a message in the correct format', async () => {
				const firstP2PNode = p2pNodeList[0];
				firstP2PNode.send({ event: 'bar', data: 'test' });

				await wait(100);

				expect(collectedMessages).to.be.an('array');
				expect(collectedMessages.length).to.be.eql(9);
				expect(collectedMessages[0]).to.have.property('message');
				expect(collectedMessages[0].message)
					.to.have.property('event')
					.which.is.equal('bar');
				expect(collectedMessages[0].message)
					.to.have.property('data')
					.which.is.equal('test');
				expect(collectedMessages[0].message)
					.to.have.property('peerId')
					.which.is.equal(`127.0.0.1:${NETWORK_START_PORT}`);
			});
		});

		describe('P2P.applyNodeInfo', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(() => {
				collectedMessages = [];
				for (let p2p of p2pNodeList) {
					p2p.on('requestReceived', request => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							request,
						});
					});
				}
			});

			it('should send the node info to peers', async () => {
				const firstP2PNode = p2pNodeList[0];
				const nodePortToMessagesMap: any = {};

				firstP2PNode.applyNodeInfo({
					os: platform(),
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: firstP2PNode.nodeInfo.version,
					protocolVersion: '1.1',
					wsPort: firstP2PNode.nodeInfo.wsPort,
					height: 10,
					options: firstP2PNode.nodeInfo.options,
				});

				await wait(200);

				// Each peer of firstP2PNode should receive a message.
				expect(collectedMessages.length).to.equal(9);

				for (let receivedMessageData of collectedMessages) {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(
						receivedMessageData,
					);
				}

				// Check that each message contains the updated P2PNodeInfo.
				Object.values(nodePortToMessagesMap)
					.filter(
						(receivedMessages: any) =>
							receivedMessages &&
							receivedMessages[0] &&
							receivedMessages[0].nodePort !== firstP2PNode.nodeInfo.wsPort,
					)
					.forEach((receivedMessages: any) => {
						expect(receivedMessages.length).to.be.equal(1);
						expect(receivedMessages[0].request).to.have.property('data');
						expect(receivedMessages[0].request.data)
							.to.have.property('height')
							.which.equals(10);
					});

				// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
				for (let p2pNode of p2pNodeList.slice(1)) {
					const firstP2PNodePeerInfo = p2pNode
						.getConnectedPeers()
						.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);
					expect(firstP2PNodePeerInfo).to.exist;
					expect(firstP2PNodePeerInfo)
						.to.have.property('height')
						.which.equals(10);
				}
			});

			it('should update itself and reflect new node info', async () => {
				const firstP2PNode = p2pNodeList[0];

				firstP2PNode.applyNodeInfo({
					os: platform(),
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: firstP2PNode.nodeInfo.version,
					protocolVersion: '1.1',
					wsPort: firstP2PNode.nodeInfo.wsPort,
					height: 10,
					options: firstP2PNode.nodeInfo.options,
				});

				await wait(200);

				// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
				for (let p2pNode of p2pNodeList.slice(1)) {
					const firstNodeInConnectedPeer = p2pNode
						.getConnectedPeers()
						.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);

					const allPeersList = p2pNode['_peerBook'].getAllPeers();

					const firstNodeInAllPeersList = allPeersList.find(
						peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
					);

					// Check if the peerinfo is updated in new peer list
					if (firstNodeInAllPeersList) {
						expect(firstNodeInAllPeersList)
							.to.have.property('height')
							.which.equals(10);
						expect(firstNodeInAllPeersList)
							.to.have.property('nethash')
							.which.equals(
								'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
							);
					}

					// Check if the peerinfo is updated in connected peer list
					if (firstNodeInConnectedPeer) {
						expect(firstNodeInConnectedPeer)
							.to.have.property('height')
							.which.equals(10);
						expect(firstNodeInConnectedPeer)
							.to.have.property('nethash')
							.which.equals(
								'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
							);
					}
				}
			});
		});

		describe('P2P.sendToPeer', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(() => {
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

			it('should send message to a specific peer within the network', async () => {
				const firstP2PNode = p2pNodeList[0];

				const targetPeerPort = NETWORK_START_PORT + 3;
				const targetPeerId = `127.0.0.1:${targetPeerPort}`;

				firstP2PNode.sendToPeer(
					{
						event: 'foo',
						data: 123,
					},
					targetPeerId,
				);

				await wait(100);

				expect(collectedMessages.length).to.equal(1);
				expect(collectedMessages[0])
					.to.have.property('nodePort')
					.which.is.equal(targetPeerPort);
				expect(collectedMessages[0]).to.have.property('message');
				expect(collectedMessages[0].message)
					.to.have.property('event')
					.which.is.equal('foo');
				expect(collectedMessages[0].message)
					.to.have.property('data')
					.which.is.equal(123);
			});
		});

		describe('P2P.requestFromPeer', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(() => {
				collectedMessages = [];
				for (let p2p of p2pNodeList) {
					p2p.on('requestReceived', request => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							request,
						});
						if (request.procedure === 'getGreeting') {
							request.end(
								`Hello ${request.data} from peer ${p2p.nodeInfo.wsPort}`,
							);
						} else {
							if (!request.wasResponseSent) {
								request.end(456);
							}
						}
					});
				}
			});

			it('should send request to a specific peer within the network', async () => {
				const firstP2PNode = p2pNodeList[0];

				const targetPeerPort = NETWORK_START_PORT + 4;
				const targetPeerId = `127.0.0.1:${targetPeerPort}`;

				await firstP2PNode.requestFromPeer(
					{
						procedure: 'proc',
						data: 123456,
					},
					targetPeerId,
				);

				expect(collectedMessages.length).to.equal(1);
				expect(collectedMessages[0]).to.have.property('request');
				expect(collectedMessages[0].request.procedure).to.equal('proc');
				expect(collectedMessages[0].request.data).to.equal(123456);
			});

			it('should receive response from a specific peer within the network', async () => {
				const firstP2PNode = p2pNodeList[0];

				const targetPeerPort = NETWORK_START_PORT + 2;
				const targetPeerId = `127.0.0.1:${targetPeerPort}`;

				const response = await firstP2PNode.requestFromPeer(
					{
						procedure: 'getGreeting',
						data: 'world',
					},
					targetPeerId,
				);

				expect(response).to.have.property('data');
				expect(response.data).to.equal(
					`Hello world from peer ${targetPeerPort}`,
				);
			});
		});

		describe('Cleanup unresponsive peers', () => {
			it('should remove crashed nodes from network status of other nodes', async () => {
				const initialPeerPorts = p2pNodeList[0]
					.getConnectedPeers()
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				expect(initialPeerPorts).to.be.eql(
					ALL_NODE_PORTS.filter(port => port !== NETWORK_START_PORT),
				);

				await p2pNodeList[0].stop();
				await wait(100);
				await p2pNodeList[1].stop();
				await wait(100);

				const peerPortsAfterPeerCrash = p2pNodeList[2]
					.getConnectedPeers()
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				const expectedPeerPortsAfterPeerCrash = ALL_NODE_PORTS.filter(port => {
					return (
						port !== NETWORK_START_PORT + 1 &&
						port !== NETWORK_START_PORT + 2 &&
						port !== NETWORK_START_PORT
					);
				});

				expect(peerPortsAfterPeerCrash).to.be.eql(
					expectedPeerPortsAfterPeerCrash,
				);
			});
		});
	});

	describe('Fully connected network: Message rate checks', () => {
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
					seedPeers,
					wsEngine: 'ws',
					populatorInterval: POPULATOR_INTERVAL,
					maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
					maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
					rateCalculationInterval: 100,
					// For the third node, make the message rate limit higher.
					wsMaxMessageRate: index == 2 ? 100000 : 110,
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

		describe('P2P.sendToPeer', () => {
			let collectedMessages: Array<any> = [];
			let messageRates: Map<number, Array<number>> = new Map();

			beforeEach(() => {
				collectedMessages = [];
				messageRates = new Map();
				for (let p2p of p2pNodeList) {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message,
						});
						let peerRates = messageRates.get(p2p.nodeInfo.wsPort) || [];
						peerRates.push(message.rate);
						messageRates.set(p2p.nodeInfo.wsPort, peerRates);
					});
				}
			});

			it('should track the message rate correctly when receiving messages', async () => {
				const TOTAL_SENDS = 100;
				const firstP2PNode = p2pNodeList[0];
				const ratePerSecondLowerBound = 70;
				const ratePerSecondUpperBound = 130;

				const targetPeerPort = NETWORK_START_PORT + 3;
				const targetPeerId = `127.0.0.1:${targetPeerPort}`;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					await wait(10);
					firstP2PNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
				}

				await wait(50);
				const secondPeerRates = messageRates.get(targetPeerPort) || [];
				const lastRate = secondPeerRates[secondPeerRates.length - 1];

				expect(lastRate).to.be.gt(ratePerSecondLowerBound);
				expect(lastRate).to.be.lt(ratePerSecondUpperBound);
			});

			it('should disconnect the peer if it tries to send messages at a rate above wsMaxMessageRate', async () => {
				const TOTAL_SENDS = 300;
				const firstP2PNode = p2pNodeList[0];
				const secondP2PNode = p2pNodeList[1];

				const removedPeers: Array<string> = [];

				secondP2PNode.on(EVENT_REMOVE_PEER, peerId => {
					removedPeers.push(peerId);
				});

				const targetPeerId = `127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					await wait(1);
					try {
						firstP2PNode.sendToPeer(
							{
								event: 'foo',
								data: i,
							},
							targetPeerId,
						);
					} catch (error) {}
				}

				await wait(100);

				expect(removedPeers).to.contain('127.0.0.1:5000');
			});
		});

		describe('P2P.requestFromPeer', () => {
			let collectedMessages: Array<any> = [];
			let requestRates: Map<number, Array<number>> = new Map();

			beforeEach(() => {
				collectedMessages = [];
				requestRates = new Map();
				for (let p2p of p2pNodeList) {
					p2p.on('requestReceived', request => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							request,
						});
						if (request.procedure === 'getGreeting') {
							request.end(
								`Hello ${request.data} from peer ${p2p.nodeInfo.wsPort}`,
							);
						} else {
							if (!request.wasResponseSent) {
								request.end(456);
							}
						}
						let peerRates = requestRates.get(p2p.nodeInfo.wsPort) || [];
						peerRates.push(request.rate);
						requestRates.set(p2p.nodeInfo.wsPort, peerRates);
					});
				}
			});

			it('should track the request rate correctly when receiving requests', async () => {
				const TOTAL_SENDS = 100;
				const firstP2PNode = p2pNodeList[0];
				const ratePerSecondLowerBound = 70;
				const ratePerSecondUpperBound = 130;

				const targetPeerPort = NETWORK_START_PORT + 3;
				const targetPeerId = `127.0.0.1:${targetPeerPort}`;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					await wait(10);
					firstP2PNode.requestFromPeer(
						{
							procedure: 'proc',
							data: 123456,
						},
						targetPeerId,
					);
				}

				await wait(50);
				const secondPeerRates = requestRates.get(targetPeerPort) || [];
				const lastRate = secondPeerRates[secondPeerRates.length - 1];

				expect(lastRate).to.be.gt(ratePerSecondLowerBound);
				expect(lastRate).to.be.lt(ratePerSecondUpperBound);
			});

			it('should disconnect the peer if it tries to send responses at a rate above wsMaxMessageRate', async () => {
				const TOTAL_SENDS = 300;
				const firstP2PNode = p2pNodeList[0];
				const thirdP2PNode = p2pNodeList[2];

				const removedPeers: Array<string> = [];

				firstP2PNode.on(EVENT_REMOVE_PEER, peerId => {
					removedPeers.push(peerId);
				});

				const targetPeerId = `127.0.0.1:${thirdP2PNode.nodeInfo.wsPort}`;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					await wait(1);
					(async () => {
						try {
							await firstP2PNode.requestFromPeer(
								{
									procedure: 'proc',
									data: 123456,
								},
								targetPeerId,
							);
						} catch (error) {}
					})();
				}

				await wait(100);

				expect(removedPeers).to.contain('127.0.0.1:5002');
			});
		});
	});

	describe('Connected network: User custom selection algorithm is passed to each node', () => {
		// Custom selection function that finds peers having common values for modules field for example.
		const peerSelectionForSendRequest:
			| P2PPeerSelectionForSendFunction
			| P2PPeerSelectionForRequestFunction = (
			input: P2PPeerSelectionForSendInput | P2PPeerSelectionForRequestInput,
		) => {
			const { peers: peersList, nodeInfo } = input;

			const filteredPeers = peersList.filter(peer => {
				if (nodeInfo && nodeInfo.height <= peer.height) {
					const nodesModules = nodeInfo.modules
						? (nodeInfo.modules as ReadonlyArray<string>)
						: undefined;
					const peerModules = peer.modules
						? (peer.modules as ReadonlyArray<string>)
						: undefined;

					if (
						nodesModules &&
						peerModules &&
						nodesModules.filter(value => peerModules.includes(value)).length > 0
					) {
						return true;
					}
				}

				return false;
			});

			// In case there are no peers with same modules or less than 30% of the peers are selected then use only height to select peers
			if (
				filteredPeers.length === 0 ||
				(filteredPeers.length / peersList.length) * 100 < 30
			) {
				return peersList.filter(
					peer => peer.height >= (nodeInfo ? nodeInfo.height : 0),
				);
			}

			return filteredPeers;
		};
		// Custom Peer selection for connection that returns all the peers
		const peerSelectionForConnection: P2PPeerSelectionForConnectionFunction = (
			input: P2PPeerSelectionForConnectionInput,
		) => [...input.newPeers, ...input.triedPeers];

		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers =
					index === 0
						? []
						: [
								{
									ipAddress: '127.0.0.1',
									wsPort:
										NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
								},
						  ];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					connectTimeout: 100,
					ackTimeout: 200,
					peerSelectionForSend: peerSelectionForSendRequest as P2PPeerSelectionForSendFunction,
					peerSelectionForRequest: peerSelectionForSendRequest as P2PPeerSelectionForRequestFunction,
					peerSelectionForConnection,
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
						os: platform(),
						height: 1000 + index,
						broadhash:
							'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
						nonce: `O2wTkjqplHII${nodePort}`,
						modules: index % 2 === 0 ? ['fileTransfer'] : ['socialSite'],
					},
				});
			});
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(1000);
		});

		it('should start all the nodes with custom selection functions without fail', () => {
			for (let p2p of p2pNodeList) {
				expect(p2p).to.have.property('isActive', true);
			}
		});

		describe('Peer Discovery', () => {
			it('should run peer discovery successfully', async () => {
				for (let p2p of p2pNodeList) {
					expect(p2p.isActive).to.be.true;
					expect(p2p.getConnectedPeers().length).to.gt(1);
				}
			});
		});

		describe('P2P.request', () => {
			beforeEach(() => {
				for (let p2p of p2pNodeList) {
					// Collect port numbers to check which peer handled which request.
					p2p.on('requestReceived', request => {
						if (!request.wasResponseSent) {
							request.end({
								nodePort: p2p.nodeInfo.wsPort,
								requestProcedure: request.procedure,
								requestData: request.data,
							});
						}
					});
				}
			});

			it('should make a request to the network; it should reach a single peer based on custom selection function', async () => {
				const secondP2PNode = p2pNodeList[1];
				const response = await secondP2PNode.request({
					procedure: 'foo',
					data: 'bar',
				});

				expect(response).to.have.property('data');
				expect(response.data)
					.to.have.property('nodePort')
					.which.is.a('number');
				expect(response.data)
					.to.have.property('requestProcedure')
					.which.is.a('string');
				expect(response.data)
					.to.have.property('requestData')
					.which.is.equal('bar');
			});
		});
		describe('P2P.send', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(() => {
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

			it('should send a message to peers; should reach multiple peers with even distribution', async () => {
				const TOTAL_SENDS = 100;
				const firstP2PNode = p2pNodeList[0];
				const nodePortToMessagesMap: any = {};

				const expectedAverageMessagesPerNode = TOTAL_SENDS;
				const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
				const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					firstP2PNode.send({ event: 'bar', data: i });
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

	describe('Partially connected network of 4 nodes: All nodes launch at the same time. The custom fields that are passed in nodeinfo is captured by other nodes.', () => {
		beforeEach(async () => {
			p2pNodeList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
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
					seedPeers,
					wsEngine: 'ws',
					// A short connectTimeout and ackTimeout will make the node to give up on discovery quicker for our test.
					connectTimeout: 100,
					ackTimeout: 200,
					populatorInterval: POPULATOR_INTERVAL,
					maxOutboundConnections: 5,
					maxInboundConnections: 5,
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
						modules: {
							names: ['test', 'crypto'],
							active: true,
						},
					},
				});
			});
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(1000);
		});

		describe('all the nodes should be able to communicate and receive custom fields passed in nodeinfo', () => {
			it('should have tried peers with custom test field "modules" that was passed as nodeinfo', () => {
				for (let p2p of p2pNodeList) {
					const triedPeers = p2p['_peerBook'].triedPeers;
					const newPeers = p2p['_peerBook'].newPeers;

					for (let peer of triedPeers) {
						expect(peer)
							.has.property('modules')
							.has.property('names')
							.is.an('array');

						expect(peer)
							.has.property('modules')
							.has.property('active')
							.is.a('boolean');
					}

					for (let peer of newPeers) {
						if (peer.modules) {
							expect(peer)
								.has.property('modules')
								.has.property('names')
								.is.an('array');

							expect(peer)
								.has.property('modules')
								.has.property('active')
								.is.a('boolean');
						}
					}

					for (let peer of p2p.getConnectedPeers()) {
						expect(peer)
							.has.property('modules')
							.has.property('names')
							.is.an('array');

						expect(peer)
							.has.property('modules')
							.has.property('active')
							.is.a('boolean');
					}
				}
			});
		});
	});

	describe('Network with a limited number of outbound/inbound connections', () => {
		const NETWORK_PEER_COUNT_WITH_LIMIT = 30;
		const LIMITED_CONNECTIONS = 5;
		const ALL_NODE_PORTS_WITH_LIMIT: ReadonlyArray<number> = [
			...new Array(NETWORK_PEER_COUNT_WITH_LIMIT).keys(),
		].map(index => NETWORK_START_PORT + index);
		const POPULATOR_INTERVAL_WITH_LIMIT = 50;

		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT_WITH_LIMIT).keys()].map(
				index => {
					// Each node will have the previous node in the sequence as a seed peer except the first node.
					const seedPeers = [
						{
							ipAddress: '127.0.0.1',
							wsPort:
								NETWORK_START_PORT +
								((index + 1) % NETWORK_PEER_COUNT_WITH_LIMIT),
						},
					];

					const nodePort = NETWORK_START_PORT + index;
					return new P2P({
						connectTimeout: 200,
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
				},
			);
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(1800);
		});

		afterEach(async () => {
			await wait(1000);
		});

		describe('Peer discovery and connections', () => {
			it(`should not create more than ${LIMITED_CONNECTIONS} outbound connections`, () => {
				for (let p2p of p2pNodeList) {
					const { outboundCount } = p2p['_peerPool'].getPeersCountPerKind();
					expect(outboundCount).to.be.at.most(LIMITED_CONNECTIONS);
				}
			});

			it(`should not create more than ${LIMITED_CONNECTIONS} inbound connections`, () => {
				for (let p2p of p2pNodeList) {
					const { inboundCount } = p2p['_peerPool'].getPeersCountPerKind();
					expect(inboundCount).to.be.at.most(LIMITED_CONNECTIONS);
				}
			});

			it('should discover peers and add them to the peer lists within each node', () => {
				for (let p2p of p2pNodeList) {
					const allPeers = p2p['_peerBook'].getAllPeers();
					const peerPorts = allPeers.map(peerInfo => peerInfo.wsPort);

					expect(ALL_NODE_PORTS_WITH_LIMIT).to.include.members(peerPorts);
				}
			});

			it('should have connected and disconnected peers', () => {
				for (let p2p of p2pNodeList) {
					const connectedPeers = p2p.getConnectedPeers();
					const disconnectedPeers = p2p.getDisconnectedPeers();

					expect(connectedPeers).is.not.empty;
					expect(disconnectedPeers).is.not.empty;
				}
			});

			it('should have disjoint connected and disconnected peers', () => {
				for (let p2p of p2pNodeList) {
					const connectedPeers = p2p.getConnectedPeers();
					const disconnectedPeers = p2p.getDisconnectedPeers();

					for (const connectedPeer of connectedPeers) {
						expect(disconnectedPeers).to.not.deep.include(connectedPeer);
					}
				}
			});
		});

		describe('P2P.request', () => {
			beforeEach(() => {
				for (let p2p of p2pNodeList) {
					// Collect port numbers to check which peer handled which request.
					p2p.on('requestReceived', request => {
						if (!request.wasResponseSent) {
							request.end({
								nodePort: p2p.nodeInfo.wsPort,
								requestProcedure: request.procedure,
								requestData: request.data,
								requestPeerId: request.peerId,
							});
						}
					});
				}
			});

			it('should make request to the network; it should reach a single peer', async () => {
				const secondP2PNode = p2pNodeList[1];
				const response = await secondP2PNode.request({
					procedure: 'foo',
					data: 'bar',
				});
				expect(response).to.have.property('data');
				expect(response.data)
					.to.have.property('nodePort')
					.which.is.a('number');
				expect(response.data)
					.to.have.property('requestProcedure')
					.which.is.a('string');
				expect(response.data)
					.to.have.property('requestData')
					.which.is.equal('bar');
				expect(response.data)
					.to.have.property('requestPeerId')
					.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
			});

			// Check for even distribution of requests across the network. Account for an error margin.
			// TODO: Skipping this test as of now because we are removing duplicate IPs so this scenario will not work locally
			it.skip('requests made to our peers should be distributed randomly', async () => {
				const TOTAL_REQUESTS = 300;
				const firstP2PNode = p2pNodeList[0];
				const nodePortToResponsesMap: any = {};

				const expectedAverageRequestsPerNode =
					TOTAL_REQUESTS / (LIMITED_CONNECTIONS * 2);
				const expectedRequestsLowerBound =
					expectedAverageRequestsPerNode * 0.45;
				const expectedRequestsUpperBound =
					expectedAverageRequestsPerNode * 1.55;

				for (let i = 0; i < TOTAL_REQUESTS; i++) {
					const response = await firstP2PNode.request({
						procedure: 'foo',
						data: i,
					});
					let resultData = response.data as any;
					if (!nodePortToResponsesMap[resultData.nodePort]) {
						nodePortToResponsesMap[resultData.nodePort] = [];
					}
					nodePortToResponsesMap[resultData.nodePort].push(resultData);
				}

				for (let requestsHandled of Object.values(
					nodePortToResponsesMap,
				) as any) {
					expect(requestsHandled).to.be.an('array');
					expect(requestsHandled.length).to.be.at.least(
						expectedRequestsLowerBound,
					);
					expect(requestsHandled.length).to.be.lessThan(
						expectedRequestsUpperBound,
					);
				}
			});
		});

		describe('P2P.send', () => {
			const propagatedMessages = new Map();

			beforeEach(() => {
				for (let p2p of p2pNodeList) {
					p2p.on('messageReceived', async message => {
						if (
							message.event === 'propagate' &&
							!propagatedMessages.has(p2p.nodeInfo.wsPort)
						) {
							propagatedMessages.set(p2p.nodeInfo.wsPort, message);
							// Simulate some kind of delay; e.g. this like like verifying a block before propagation.
							await wait(10);
							p2p.send({ event: 'propagate', data: message.data + 1 });
						}
					});
				}
			});

			it('should propagate the message only if the package is not known', async () => {
				const firstP2PNode = p2pNodeList[0];
				firstP2PNode.send({ event: 'propagate', data: 0 });

				await wait(50);

				expect(propagatedMessages.size).to.be.eql(30);
				for (var value of propagatedMessages.values()) {
					expect(value).to.have.property('event');
					expect(value.event).to.be.equal('propagate');
					expect(value).to.have.property('data');
					expect(value.data).to.be.within(0, 2);
				}
			});
		});
	});

	describe('Network with frequent peer shuffling', () => {
		const NETWORK_PEER_COUNT_SHUFFLING = 10;
		const POPULATOR_INTERVAL_SHUFFLING = 10000;
		const OUTBOUND_SHUFFLE_INTERVAL = 500;
		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT_SHUFFLING).keys()].map(
				index => {
					const nodePort = NETWORK_START_PORT + index;

					const seedPeers = [...new Array(NETWORK_PEER_COUNT_SHUFFLING).keys()]
						.map(index => ({
							ipAddress: '127.0.0.1',
							wsPort:
								NETWORK_START_PORT +
								((index + 1) % NETWORK_PEER_COUNT_SHUFFLING),
						}))
						.filter(seedPeer => seedPeer.wsPort !== nodePort);

					return new P2P({
						connectTimeout: 200,
						ackTimeout: 200,
						seedPeers,
						wsEngine: 'ws',
						populatorInterval: POPULATOR_INTERVAL_SHUFFLING,
						maxOutboundConnections: Math.round(
							NETWORK_PEER_COUNT_SHUFFLING / 2,
						),
						maxInboundConnections: Math.round(NETWORK_PEER_COUNT_SHUFFLING / 2),
						outboundShuffleInterval: OUTBOUND_SHUFFLE_INTERVAL,
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
				},
			);
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(200);
		});

		describe('Peer outbound shuffling', () => {
			it('should shuffle outbound peers in an interval', async () => {
				const p2pNode = p2pNodeList[0];
				const { outboundCount } = p2pNode['_peerPool'].getPeersCountPerKind();
				// Wait for periodic shuffling
				await wait(500);
				const { outboundCount: updatedOutbound } = p2pNode[
					'_peerPool'
				].getPeersCountPerKind();

				expect(updatedOutbound).to.equal(outboundCount - 1);
			});
		});
	});

	describe('Network with different lists of blacklisted/fixed/whitelisted peers', () => {
		const FIVE_CONNECTIONS = 5;
		const POPULATOR_INTERVAL_WITH_LIMIT = 10;
		const previousPeers = [
			{
				ipAddress: '127.0.0.15',
				wsPort: NETWORK_START_PORT + 5,
				height: 10,
				version: '1.0',
				protocolVersion: '1.0',
				number: undefined,
			},
		];
		const serverSocketPrototypeBackup = cloneDeep(SCServerSocket.prototype);

		before(async () => {
			const serverSocketPrototype = SCServerSocket.prototype as any;
			const realResetPongTimeoutFunction =
				serverSocketPrototype._resetPongTimeout;
			serverSocketPrototype._resetPongTimeout = function() {
				const queryObject = url.parse(this.request.url, true).query as any;
				let ipSuffix = queryObject.wsPort - 5000 + 10;
				this.remoteAddress = `127.0.0.${ipSuffix}`;
				return realResetPongTimeoutFunction.apply(this, arguments);
			};
		});

		after(async () => {
			SCServerSocket.prototype = serverSocketPrototypeBackup;
		});

		describe('blacklisting', () => {
			const blacklistedPeers = [
				{
					ipAddress: '127.0.0.15',
					wsPort: NETWORK_START_PORT + 5,
				},
			];
			const previousPeersBlacklisted = [
				{
					ipAddress: '127.0.0.15',
					wsPort: NETWORK_START_PORT + 5,
					height: 10,
					version: '1.0',
					protocolVersion: '1.0',
					number: undefined,
				},
			];
			beforeEach(async () => {
				p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
					// Each node will have the previous node in the sequence as a seed peer except the first node.
					const seedPeers = [
						{
							ipAddress: '127.0.0.' + (((index + 1) % NETWORK_PEER_COUNT) + 10),
							wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
						},
					];
					const nodePort = NETWORK_START_PORT + index;
					return new P2P({
						hostIp: '127.0.0.' + (index + 10),
						connectTimeout: 100,
						ackTimeout: 200,
						blacklistedPeers: blacklistedPeers,
						seedPeers: seedPeers,
						fixedPeers: blacklistedPeers,
						whitelistedPeers: blacklistedPeers,
						previousPeers: previousPeersBlacklisted,
						wsEngine: 'ws',
						populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
						maxOutboundConnections: FIVE_CONNECTIONS,
						maxInboundConnections: FIVE_CONNECTIONS,
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

			it('should not add any blacklisted peer to newPeers', () => {
				for (let p2p of p2pNodeList) {
					const newPeers = p2p['_peerBook'].newPeers;
					const newPeersIPWS = newPeers.map(peer => {
						return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
					});
					expect(newPeersIPWS).not.to.deep.include.members(blacklistedPeers);
				}
			});

			it('should not add any blacklisted peer to triedPeers', () => {
				for (let p2p of p2pNodeList) {
					const triedPeers = p2p['_peerBook'].triedPeers;
					const triedPeersIPWS = triedPeers.map(peer => {
						return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
					});
					expect(triedPeersIPWS).not.to.deep.include.members(blacklistedPeers);
				}
			});

			it('should not connect to any blacklisted peer', () => {
				for (let p2p of p2pNodeList) {
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
					});
					expect(connectedPeersIPWS).not.to.deep.include.members(
						blacklistedPeers,
					);
				}
			});

			it('should isolate the blacklisted peer', () => {
				for (let p2p of p2pNodeList) {
					if (
						p2p['_nodeInfo'].wsPort === blacklistedPeers[0].wsPort &&
						p2p['_config'].hostIp === blacklistedPeers[0].ipAddress
					) {
						const connectedPeers = p2p['_peerPool'].getConnectedPeers();
						expect(connectedPeers.length).to.equal(0);
					}
				}
			});
		});

		describe('fixed', () => {
			const fixedPeers = [
				{
					ipAddress: '127.0.0.10',
					wsPort: NETWORK_START_PORT,
				},
			];
			beforeEach(async () => {
				p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
					// Each node will have the previous node in the sequence as a seed peer except the first node.
					const seedPeers = [
						{
							ipAddress: '127.0.0.' + (((index + 1) % NETWORK_PEER_COUNT) + 10),
							wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
						},
					];
					const nodePort = NETWORK_START_PORT + index;
					return new P2P({
						hostIp: '127.0.0.' + (index + 10),
						connectTimeout: 100,
						ackTimeout: 200,
						seedPeers: seedPeers,
						fixedPeers,
						previousPeers,
						wsEngine: 'ws',
						populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
						maxOutboundConnections: FIVE_CONNECTIONS,
						maxInboundConnections: FIVE_CONNECTIONS,
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

			it('everyone but itself should have a permanent connection to the fixed peer', () => {
				p2pNodeList.forEach((p2p, index) => {
					if (index != 0) {
						const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
							return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
						});
						expect(connectedPeersIPWS).to.deep.include.members(fixedPeers);
					}
				});
			});
		});

		describe('whitelisting', () => {
			const whitelistedPeers = [
				{
					ipAddress: '127.0.0.10',
					wsPort: NETWORK_START_PORT,
				},
			];
			beforeEach(async () => {
				p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
					// Each node will have the previous node in the sequence as a seed peer except the first node.
					const seedPeers = [
						{
							ipAddress: '127.0.0.' + (((index + 1) % NETWORK_PEER_COUNT) + 10),
							wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
						},
					];
					const nodePort = NETWORK_START_PORT + index;
					return new P2P({
						hostIp: '127.0.0.' + (index + 10),
						connectTimeout: 100,
						ackTimeout: 200,
						seedPeers,
						whitelistedPeers,
						wsEngine: 'ws',
						populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
						maxOutboundConnections: FIVE_CONNECTIONS,
						maxInboundConnections: FIVE_CONNECTIONS,
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

			it('should add every whitelisted peer to triedPeers', () => {
				p2pNodeList.forEach((p2p, index) => {
					if (![0, 9].includes(index)) {
						const triedPeers = p2p['_peerBook'].triedPeers;
						const triedPeersIPWS = triedPeers.map(peer => {
							return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
						});
						expect(triedPeersIPWS).to.deep.include.members(whitelistedPeers);
					}
				});
			});

			it('should not be possible to ban them', () => {
				const peerPenalty = {
					peerId: `${whitelistedPeers[0].ipAddress}:${
						whitelistedPeers[0].wsPort
					}`,
					penalty: 100,
				};

				p2pNodeList.forEach((p2p, index) => {
					if (![0, 9].includes(index)) {
						p2p.applyPenalty(peerPenalty);
						const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
							return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
						});
						expect(connectedPeersIPWS).to.deep.include.members(
							whitelistedPeers,
						);
					}
				});
			});
		});
	});

	describe('Network with peer inbound eviction protection for connectTime enabled', () => {
		const NETWORK_PEER_COUNT_WITH_LIMIT = 10;
		const MAX_INBOUND_CONNECTIONS = 3;
		const POPULATOR_INTERVAL_WITH_LIMIT = 100;
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

		describe('Inbound peer evictions', () => {
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
	});

	describe('Fully connected network with a custom maximum payload', () => {
		let dataLargerThanMaxPayload: Array<string>;

		beforeEach(async () => {
			dataLargerThanMaxPayload = [];
			for (let i = 0; i < 6000; i++) {
				dataLargerThanMaxPayload.push(`message${i}`);
			}
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
					},
				];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 200,
					ackTimeout: 200,
					seedPeers,
					populatorInterval: 30,
					maxOutboundConnections: 10,
					maxInboundConnections: 30,
					wsEngine: 'ws',
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
					wsMaxPayload: 5000,
				});
			});

			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(300);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(100);
		});

		describe('P2P.send', () => {
			let collectedMessages: Array<any> = [];
			let closedPeers: Map<number, any>;

			beforeEach(() => {
				collectedMessages = [];
				closedPeers = new Map();
				p2pNodeList.forEach(p2p => {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message,
						});
					});

					p2p.on('closeInbound', packet => {
						let peers = [];
						if (closedPeers.has(p2p.nodeInfo.wsPort)) {
							peers = closedPeers.get(p2p.nodeInfo.wsPort);
						}
						peers.push(packet.peerInfo);
						closedPeers.set(p2p.nodeInfo.wsPort, peers);
					});

					p2p.on('closeOutbound', packet => {
						let peers = [];
						if (closedPeers.has(p2p.nodeInfo.wsPort)) {
							peers = closedPeers.get(p2p.nodeInfo.wsPort);
						}
						peers.push(packet.peerInfo);
						closedPeers.set(p2p.nodeInfo.wsPort, peers);
					});
				});
			});

			it('should not send a package larger than the ws max payload', async () => {
				const firstP2PNode = p2pNodeList[0];

				firstP2PNode.send({
					event: 'maxPayload',
					data: dataLargerThanMaxPayload,
				});
				await wait(100);

				expect(collectedMessages).to.be.empty;
			});

			it('should disconnect the peer which has sent the message', async () => {
				const firstP2PNode = p2pNodeList[0];
				firstP2PNode.send({
					event: 'maxPayload',
					data: dataLargerThanMaxPayload,
				});

				await wait(300);

				const firstPeerDisconnectedList =
					closedPeers.get(firstP2PNode.nodeInfo.wsPort) || [];
				for (const p2pNode of p2pNodeList) {
					const disconnectedList =
						closedPeers.get(p2pNode.nodeInfo.wsPort) || [];
					const wasFirstPeerDisconnected =
						disconnectedList.some(
							(peerInfo: any) => peerInfo.wsPort === 5000,
						) ||
						firstPeerDisconnectedList.some(
							(peerInfo: any) => peerInfo.wsPort === p2pNode.nodeInfo.wsPort,
						);
					if (p2pNode.nodeInfo.wsPort === 5000) {
						expect(disconnectedList.length).to.be.gte(9);
					} else {
						expect(wasFirstPeerDisconnected).to.be.true;
					}
				}
			});
		});
	});

	describe('Peer selection response to fetch peers RPC', () => {
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
					p2pNodeList
						.filter(p2p => p2p.isActive)
						.map(async p2p => await p2p.stop()),
				);
				await wait(100);
			});

			it('should return list of peers with at most the minimum discovery threshold', async () => {
				const firstP2PNode = p2pNodeList[0];
				const newPeers = firstP2PNode['_peerBook'].newPeers;
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
				const newPeers = firstP2PNode['_peerBook'].newPeers;
				expect(newPeers.length).to.be.lessThan(
					MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
				);
			});
		});
	});
});
