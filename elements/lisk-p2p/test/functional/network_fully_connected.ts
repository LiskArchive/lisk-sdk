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
import { P2P, EVENT_CLOSE_OUTBOUND } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';
import { InboundPeer, OutboundPeer, ConnectionState } from '../../src/peer';

describe('Fully connected network: The seedPeers list of each node contains the previously launched node', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
	const ALL_NODE_PORTS: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);

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

				const allPeersPorts = allPeers.map(peerInfo => peerInfo.wsPort).sort();
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
			expect(response.data).to.equal(`Hello world from peer ${targetPeerPort}`);
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

	describe('Disconnect duplicate peers', () => {
		let firstP2PNodeCloseEvents: Array<any> = [];
		let firstPeerCloseEvents: Array<any> = [];
		let firstPeerErrors: Array<any> = [];
		let firstPeerDuplicate: OutboundPeer;
		let firstP2PNode: P2P;
		let existingPeer: InboundPeer;

		beforeEach(async () => {
			firstP2PNode = p2pNodeList[0];
			firstPeerCloseEvents = [];
			existingPeer = firstP2PNode['_peerPool'].getPeers(
				InboundPeer,
			)[0] as InboundPeer;
			firstPeerDuplicate = new OutboundPeer(
				existingPeer.peerInfo,
				firstP2PNode['_peerPool'].peerConfig,
			);

			firstPeerDuplicate.on(EVENT_CLOSE_OUTBOUND, (event: any) => {
				firstPeerCloseEvents.push(event);
			});

			try {
				// This will create a connection.
				await firstPeerDuplicate.applyNodeInfo(firstP2PNode.nodeInfo);
			} catch (error) {
				firstPeerErrors.push(error);
			}

			firstP2PNode.on(EVENT_CLOSE_OUTBOUND, event => {
				firstP2PNodeCloseEvents.push(event);
			});
			await wait(100);
		});
		afterEach(() => {
			firstPeerDuplicate.removeAllListeners(EVENT_CLOSE_OUTBOUND);
			firstP2PNode.removeAllListeners(EVENT_CLOSE_OUTBOUND);
			firstPeerDuplicate.disconnect();
		});

		// Simulate legacy behaviour where the node tries to connect back to an inbound peer.
		it('should remove a peer if they try to connect but they are already connected', async () => {
			expect(firstPeerErrors).to.have.length(1);
			expect(firstPeerErrors[0])
				.to.have.property('name')
				.which.equals('BadConnectionError');
			expect(firstPeerErrors[0])
				.to.have.property('name')
				.which.equals('BadConnectionError');
			expect(firstPeerDuplicate)
				.to.have.property('state')
				.which.equals(ConnectionState.CLOSED);
			// Disconnecting our new outbound socket should not cause the existing inbound peer instance to be removed.
			expect(firstP2PNodeCloseEvents).to.be.empty;
		});
	});
});
