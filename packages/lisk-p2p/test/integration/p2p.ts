import { expect } from 'chai';
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';

describe('Integration tests for P2P library', () => {
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const ALL_NODE_PORTS: ReadonlyArray<number> = [...Array(NETWORK_PEER_COUNT).keys()].map(index => NETWORK_START_PORT + index);
	const NETWORK_END_PORT = ALL_NODE_PORTS[ALL_NODE_PORTS.length - 1];

	let p2pNodeList: ReadonlyArray<P2P> = [];

	describe('Disconnected network: All nodes launch at the same time; each node has an empty seedPeers list', () => {
		beforeEach(async () => {
			p2pNodeList = ALL_NODE_PORTS.map(nodePort => {
				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers: [],
					wsEngine: 'ws',
					nodeInfo: {
						wsPort: nodePort,
						nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.0',
						os: platform(),
						height: 0,
						options: {
							broadhash:
								'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
							nonce: 'O2wTkjqplHII5wPv',
						},
					},
				});
			});

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				p2p => p2p.start(),
			);
			await Promise.all(peerStartPromises);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList.map(p2p => {
					return p2p.stop();
				}),
			);
		});

		it('should set the isActive property to true for all nodes', () => {
			p2pNodeList.forEach(p2p => {
				expect(p2p).to.have.property('isActive', true);
			});
		});
	});

	describe('Partially connected network: All nodes launch at the same time; the seedPeers list of each node contains the next node in the sequence', () => {
		const DISCOVERY_INTERVAL = 200;
		
		beforeEach(async () => {
			p2pNodeList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the next node in the sequence as a seed peer.
				const seedPeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
						height: 0,
					},
				];

				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers,
					wsEngine: 'ws',
					// Set a different discoveryInterval for each node; that way they don't keep trying to discover each other at the same time.
					discoveryInterval: DISCOVERY_INTERVAL + index * 10,
					nodeInfo: {
						wsPort: NETWORK_START_PORT + index,
						nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.0',
						os: platform(),
						height: 0,
						options: {
							broadhash:
								'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
							nonce: 'O2wTkjqplHII5wPv',
						},
					},
				});
			});

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				p2p => p2p.start(),
			);
			await Promise.all(peerStartPromises);
			await wait(100);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList.map(p2p => {
					return p2p.stop();
				}),
			);
		});

		describe('Peer discovery', () => {
			it('should discover seed peers and add them to connectedPeers list', () => {
				p2pNodeList.forEach(p2p => {
					let {connectedPeers} = p2p.getNetworkStatus();

					const peerPorts = connectedPeers.map(peerInfo => peerInfo.wsPort).sort();

					const previousPeerPort = p2p.nodeInfo.wsPort - 1;
					const nextPeerPort = p2p.nodeInfo.wsPort + 1;

					const expectedPeerPorts = [
						previousPeerPort < NETWORK_START_PORT ? NETWORK_END_PORT : previousPeerPort,
						p2p.nodeInfo.wsPort,
						nextPeerPort > NETWORK_END_PORT ? NETWORK_START_PORT : nextPeerPort
					].sort();

					expect(peerPorts).to.be.eql(expectedPeerPorts);
				});
			});

			it('should discover all peers in the network after a few cycles of discovery', async () => {
				// Wait for 5 cycles of discovery.
				await wait(DISCOVERY_INTERVAL * 5);

				p2pNodeList.forEach(p2p => {
					let {connectedPeers} = p2p.getNetworkStatus();

					const peerPorts = connectedPeers.map(peerInfo => peerInfo.wsPort).sort();
					const expectedPeerPorts = ALL_NODE_PORTS;

					expect(peerPorts).to.be.eql(expectedPeerPorts);
				});
			});
		});
	});

	describe('Fully connected network: Nodes are started gradually, one at a time; the seedPeers list of each node contains the previously launched node', () => {
		beforeEach(async () => {
			p2pNodeList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers = index === 0 ? [] : [
					{
						ipAddress: '127.0.0.1',
						wsPort: NETWORK_START_PORT + ((index - 1) % NETWORK_PEER_COUNT),
						height: 0,
					},
				]; 

				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers,
					wsEngine: 'ws',
					nodeInfo: {
						wsPort: NETWORK_START_PORT + index,
						nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.0',
						os: platform(),
						height: 0,
						options: {
							broadhash:
								'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
							nonce: 'O2wTkjqplHII5wPv',
						},
					},
				});
			});

			// Launch nodes one at a time with a delay between each launch.
			for (const p2p of p2pNodeList) {
				await p2p.start();
				await wait(100);
			}
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList.map(p2p => {
					return p2p.stop();
				}),
			);
		});

		describe('Peer discovery', () => {
			it('should discover all peers and add them to the connectedPeers list within each node', () => {
				p2pNodeList.forEach(p2p => {
					const {connectedPeers} = p2p.getNetworkStatus();

					const peerPorts = connectedPeers.map(peerInfo => peerInfo.wsPort).sort();

					// Right now we do not care whether the node includes itself in its own peer list.
					// TODO later: Formalize the correct approach and assert it here.
					const peerPortsExcludingSelf = peerPorts
						.filter(wsPort => wsPort !== p2p.nodeInfo.wsPort);

					// The current node should not be in its own peer list.
					const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
						return port !== p2p.nodeInfo.wsPort;
					});

					expect(peerPortsExcludingSelf).to.be.eql(expectedPeerPorts);
				});
			});

			it('should discover all peers and add them to the newPeers list within each node', () => {
				p2pNodeList.forEach(p2p => {
					const {newPeers} = p2p.getNetworkStatus();

					const peerPorts = newPeers.map(peerInfo => peerInfo.wsPort).sort();

					// TODO ASAP: Make better assertions.
					expect(peerPorts).to.be.an.instanceOf(Array);
				});
			});

			it('should discover all peers and add them to the triedPeers list within each node', () => {
				p2pNodeList.forEach(p2p => {
					const {triedPeers} = p2p.getNetworkStatus();

					const peerPorts = triedPeers.map(peerInfo => peerInfo.wsPort).sort();
					// Right now we do not care whether the node includes itself in its own peer list.
					// TODO later: Formalize the correct approach and assert it here.
					const peerPortsExcludingSelf = peerPorts
						.filter(wsPort => wsPort !== p2p.nodeInfo.wsPort);

					// The current node should not be in its own peer list.
					const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
						return port !== p2p.nodeInfo.wsPort;
					});

					expect(peerPortsExcludingSelf).to.be.eql(expectedPeerPorts);
				});
			});
		});

		describe('P2P.request', () => {
			beforeEach(async () => {
				p2pNodeList.forEach(p2p => {
					// Collect port numbers to check which peer handled which request.
					p2p.on('requestReceived', request => {
						request.end({
							nodePort: p2p.nodeInfo.wsPort,
							requestProcedure: request.procedure,
							requestData: request.data
						});
					});
				});
			});

			it('should make request to the network; it should reach a single peer', async () => {
				const firstP2PNode = p2pNodeList[0];
				const response = await firstP2PNode.request({procedure: 'foo', data: 'bar'});
				expect(response).to.have.property('data');
				expect(response.data).to.have.property('nodePort').which.is.a('number');
				expect(response.data).to.have.property('requestProcedure').which.is.a('string');
				expect(response.data).to.have.property('requestData').which.is.equal('bar');
			});

			// Check for even distribution of requests across the network. Account for an error margin.
			it('requests made to the network should be distributed randomly', async () => {
				const TOTAL_REQUESTS = 1000;
				const firstP2PNode = p2pNodeList[0];
				const nodePortToResponsesMap: any = {};

				const expectedAverageRequestsPerNode = TOTAL_REQUESTS / NETWORK_PEER_COUNT;
				const expectedRequestsLowerBound = expectedAverageRequestsPerNode * .5;
				const expectedRequestsUpperBound = expectedAverageRequestsPerNode * 1.5;
				
				for (let i = 0; i < TOTAL_REQUESTS; i++) {
					const response = await firstP2PNode.request({procedure: 'foo', data: i});
					let resultData = response.data as any;
					if (!nodePortToResponsesMap[resultData.nodePort]) {
						nodePortToResponsesMap[resultData.nodePort] = [];
					}
					nodePortToResponsesMap[resultData.nodePort].push(resultData);
				}

				Object.values(nodePortToResponsesMap).forEach((requestsHandled: any) => {
					expect(requestsHandled).to.be.an('array');
					expect(requestsHandled.length).to.be.greaterThan(expectedRequestsLowerBound);
					expect(requestsHandled.length).to.be.lessThan(expectedRequestsUpperBound);
				});
			});
		});

		describe('P2P.send', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(async () => {
				collectedMessages = [];
				p2pNodeList.forEach(p2p => {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message
						});
					});
				});
			});

			it('should send a message to a subset of peers within the network; should reach multiple peers with even distribution', async () => {
				const TOTAL_SENDS = 100;
				const firstP2PNode = p2pNodeList[0];
				const nodePortToMessagesMap: any = {};

				const expectedAverageMessagesPerNode = TOTAL_SENDS;
				const expectedMessagesLowerBound = expectedAverageMessagesPerNode * .5;
				const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

				for (let i = 0; i < TOTAL_SENDS; i++) {
					firstP2PNode.send({event: 'bar', data: i});
				}

				await wait(100);

				collectedMessages.forEach((receivedMessageData: any) => {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(receivedMessageData);
				});

				Object.values(nodePortToMessagesMap).forEach((receivedMessages: any) => {
					expect(receivedMessages).to.be.an('array');
					expect(receivedMessages.length).to.be.greaterThan(expectedMessagesLowerBound);
					expect(receivedMessages.length).to.be.lessThan(expectedMessagesUpperBound);
				});
			});
		});

		describe('P2P.applyNodeInfo', () => {
			let collectedMessages: Array<any> = [];

			beforeEach(async () => {
				collectedMessages = [];
				p2pNodeList.forEach(p2p => {
					p2p.on('requestReceived', request => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							request
						});
					});
				});
			});

			it('should send the node info to a subset of peers within the network.', async () => {
				const firstP2PNode = p2pNodeList[0];
				const nodePortToMessagesMap: any = {};

				firstP2PNode.applyNodeInfo({
					os: platform(),
					nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: firstP2PNode.nodeInfo.version,
					wsPort: firstP2PNode.nodeInfo.wsPort,
					height: 10,
					options: firstP2PNode.nodeInfo.options,
				});

				await wait(100);

				// Each peer of firstP2PNode should receive a message.
				expect(collectedMessages.length).to.equal(9);

				collectedMessages.forEach((receivedMessageData: any) => {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(receivedMessageData);
				});

				// Check that each message contains the updated P2PNodeInfo.
				Object.values(nodePortToMessagesMap)
				.filter((receivedMessages: any) =>
					receivedMessages &&
					receivedMessages[0] &&
					receivedMessages[0].nodePort !== firstP2PNode.nodeInfo.wsPort
				)
				.forEach((receivedMessages: any) => {
					expect(receivedMessages.length).to.be.equal(1);
					expect(receivedMessages[0].request).to.have.property('data');
					expect(receivedMessages[0].request.data).to.have.property('height').which.equals(10);
				});

				// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
				p2pNodeList.slice(1).forEach((p2pNode) => {
					const networkStatus = p2pNode.getNetworkStatus();
					const firstP2PNodePeerInfo = networkStatus.connectedPeers.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);
					expect(firstP2PNodePeerInfo).to.exist;
					expect(firstP2PNodePeerInfo).to.have.property('height').which.equals(10);
				});
			});
		});
	});
});
