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

describe('Integration tests for P2P library', () => {
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const ALL_NODE_PORTS: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);
	const NO_PEERS_FOUND_ERROR = `Request failed due to no peers found in peer selection`;

	let p2pNodeList: ReadonlyArray<P2P> = [];

	describe('Disconnected network: All nodes launch at the same time. Each node has an empty seedPeers list', () => {
		beforeEach(async () => {
			p2pNodeList = ALL_NODE_PORTS.map(nodePort => {
				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers: [],
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
				});
			});

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				p2p => p2p.start(),
			);
			await Promise.all(peerStartPromises);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
		});

		it('should set the isActive property to true for all nodes', () => {
			p2pNodeList.forEach(p2p => {
				expect(p2p).to.have.property('isActive', true);
			});
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

	describe('Partially connected network which becomes fully connected: All nodes launch at the same time. The seedPeers list of each node contains the next node in the sequence. Discovery interval runs multiple times.', () => {
		const DISCOVERY_INTERVAL = 200;

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
					blacklistedPeers: [],
					seedPeers,
					wsEngine: 'ws',
					connectTimeout: 5000,
					ackTimeout: 5000,
					// Set a different discoveryInterval for each node; that way they don't keep trying to discover each other at the same time.
					discoveryInterval: DISCOVERY_INTERVAL + index * 11,
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

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				p2p => p2p.start(),
			);

			await Promise.all(peerStartPromises);
			await wait(100);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
		});

		describe('Peer discovery', () => {
			it('should discover all peers in the network after a few cycles of discovery', async () => {
				// Wait for a few cycles of discovery.
				await wait(DISCOVERY_INTERVAL * 7);

				p2pNodeList.forEach(p2p => {
					const { connectedPeers } = p2p.getNetworkStatus();

					const peerPorts = connectedPeers
						.map(peerInfo => peerInfo.wsPort)
						.sort();
					const expectedPeerPorts = ALL_NODE_PORTS.filter(
						peerPort => peerPort !== p2p.nodeInfo.wsPort,
					);

					expect(peerPorts).to.be.eql(expectedPeerPorts);
				});
			});
		});

		describe('P2P.send', () => {
			describe('P2P.send when peers are at same height', () => {
				let collectedMessages: Array<any> = [];

				beforeEach(async () => {
					collectedMessages = [];
					p2pNodeList.forEach(p2p => {
						p2p.on('messageReceived', message => {
							collectedMessages.push({
								nodePort: p2p.nodeInfo.wsPort,
								message,
							});
						});
					});
				});

				it('should send messages to subset of peers within the network; should reach multiple peers with even distribution', async () => {
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
					collectedMessages.forEach((receivedMessageData: any) => {
						if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
							nodePortToMessagesMap[receivedMessageData.nodePort] = [];
						}
						nodePortToMessagesMap[receivedMessageData.nodePort].push(
							receivedMessageData,
						);
					});

					expect(nodePortToMessagesMap).to.not.to.be.empty;
					Object.values(nodePortToMessagesMap).forEach(
						(receivedMessages: any) => {
							expect(receivedMessages).to.be.an('array');
							expect(receivedMessages.length).to.be.greaterThan(
								expectedMessagesLowerBound,
							);
							expect(receivedMessages.length).to.be.lessThan(
								expectedMessagesUpperBound,
							);
						},
					);
				});
			});

			describe('P2P.send when peers are at different heights', () => {
				const randomPeerIndex = Math.floor(Math.random() * NETWORK_PEER_COUNT);
				let collectedMessages: Array<any> = [];
				let randomP2PNode: any;

				beforeEach(async () => {
					collectedMessages = [];
					randomP2PNode = p2pNodeList[randomPeerIndex];
					p2pNodeList.forEach(async p2p => {
						p2p.on('messageReceived', message => {
							collectedMessages.push({
								nodePort: p2p.nodeInfo.wsPort,
								message,
							});
						});
					});
				});

				it('should send messages to subset of peers within the network with updated heights; should reach multiple peers with even distribution', async () => {
					const TOTAL_SENDS = 100;
					const nodePortToMessagesMap: any = {};

					p2pNodeList.forEach(p2p => {
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
					});

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
					collectedMessages.forEach((receivedMessageData: any) => {
						if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
							nodePortToMessagesMap[receivedMessageData.nodePort] = [];
						}
						nodePortToMessagesMap[receivedMessageData.nodePort].push(
							receivedMessageData,
						);
					});

					expect(nodePortToMessagesMap).to.not.to.be.empty;
					Object.values(nodePortToMessagesMap).forEach(
						(receivedMessages: any) => {
							expect(receivedMessages).to.be.an('array');
							expect(receivedMessages.length).to.be.greaterThan(
								expectedMessagesLowerBound,
							);
							expect(receivedMessages.length).to.be.lessThan(
								expectedMessagesUpperBound,
							);
						},
					);
				});
			});
		});

		describe('P2P.applyNodeInfo', () => {
			it('should send the node info to a subset of peers within the network. It should update itself and reflect new values', async () => {
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

				await wait(100);

				// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
				p2pNodeList.slice(1).forEach(p2pNode => {
					const networkStatus = p2pNode.getNetworkStatus();
					const firstNodeInConnectedPeer = networkStatus.connectedPeers.find(
						peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
					);

					const firstNodeInNewPeer = networkStatus.newPeers.find(
						peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
					);

					const firstNodeInTriedPeer = networkStatus.triedPeers.find(
						peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
					);

					// Check if the peerinfo is updated in new peer list
					if (firstNodeInNewPeer) {
						expect(firstNodeInNewPeer)
							.to.have.property('height')
							.which.equals(10);
						expect(firstNodeInNewPeer)
							.to.have.property('nethash')
							.which.equals(
								'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
							);
					}

					// Check if the peerinfo is updated in tried peer list
					if (firstNodeInTriedPeer) {
						expect(firstNodeInTriedPeer)
							.to.have.property('height')
							.which.equals(10);
						expect(firstNodeInTriedPeer)
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

				const connectedPeers = firstP2PNode.getNetworkStatus().connectedPeers;
				const portOfLastInactivePort = ALL_NODE_PORTS[NETWORK_PEER_COUNT / 2];

				const actualConnectedPeers = connectedPeers
					.filter(
						peer =>
							peer.wsPort !== NETWORK_START_PORT &&
							peer.wsPort % NETWORK_START_PORT > NETWORK_PEER_COUNT / 2,
					)
					.map(peer => peer.wsPort);

				// Check if the connected Peers are having port greater than the last port that we crashed by index
				actualConnectedPeers.forEach(port => {
					expect(port).greaterThan(portOfLastInactivePort);
				});

				p2pNodeList.forEach(p2p => {
					if (p2p.nodeInfo.wsPort > portOfLastInactivePort) {
						expect(p2p.isActive).to.be.true;
					}
				});
			});
		});
	});

	describe('Fully connected network: Nodes are started gradually, one at a time. The seedPeers list of each node contains the previously launched node', () => {
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
										NETWORK_START_PORT + ((index - 1) % NETWORK_PEER_COUNT),
								},
						  ];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					ackTimeout: 5000,
					seedPeers,
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
				});
			});

			// Launch nodes one at a time with a delay between each launch.
			for (const p2p of p2pNodeList) {
				await p2p.start();
				await wait(100);
			}
			await wait(100);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(100);
		});

		describe('Peer discovery', () => {
			it('should discover all peers and add them to the connectedPeers list within each node', async () => {
				p2pNodeList.forEach(p2p => {
					const { connectedPeers } = p2p.getNetworkStatus();

					const peerPorts = connectedPeers
						.map(peerInfo => peerInfo.wsPort)
						.sort();

					// The current node should not be in its own peer list.
					const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
						return port !== p2p.nodeInfo.wsPort;
					});

					expect(peerPorts).to.be.eql(expectedPeerPorts);
				});
			});

			it('should discover all peers and connect to all the peers so there should be no peer in newPeers list', () => {
				p2pNodeList.forEach(p2p => {
					const { newPeers } = p2p.getNetworkStatus();

					const peerPorts = newPeers.map(peerInfo => peerInfo.wsPort).sort();

					expect(peerPorts).to.be.eql([]);
				});
			});

			it('should discover all peers and add them to the triedPeers list within each node', () => {
				p2pNodeList.forEach(p2p => {
					const { triedPeers } = p2p.getNetworkStatus();

					const peerPorts = triedPeers.map(peerInfo => peerInfo.wsPort).sort();

					// The current node should not be in its own peer list.
					const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
						return port !== p2p.nodeInfo.wsPort;
					});

					expect(peerPorts).to.be.eql(expectedPeerPorts);
				});
			});

			it('should not contain itself in any of its peer list', async () => {
				p2pNodeList.forEach(p2p => {
					const {
						triedPeers,
						connectedPeers,
						newPeers,
					} = p2p.getNetworkStatus();

					const triedPeerPorts = triedPeers
						.map(peerInfo => peerInfo.wsPort)
						.sort();
					const newPeerPorts = newPeers.map(peerInfo => peerInfo.wsPort).sort();
					const connectedPeerPorts = connectedPeers
						.map(peerInfo => peerInfo.wsPort)
						.sort();

					expect([
						...triedPeerPorts,
						...newPeerPorts,
						...connectedPeerPorts,
					]).to.not.contain.members([p2p.nodeInfo.wsPort]);
				});
			});
		});

		describe('Cleanup unresponsive peers', () => {
			it('should remove inactive 2nd node from connected peer list of other', async () => {
				const initialNetworkStatus = p2pNodeList[0].getNetworkStatus();
				const secondNode = p2pNodeList[1];
				const initialPeerPorts = initialNetworkStatus.connectedPeers
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
					return port !== NETWORK_START_PORT;
				});
				expect(initialPeerPorts).to.be.eql(expectedPeerPorts);
				await secondNode.stop();

				await wait(200);

				const networkStatusAfterPeerCrash = p2pNodeList[0].getNetworkStatus();

				const peerPortsAfterPeerCrash = networkStatusAfterPeerCrash.connectedPeers
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				const expectedPeerPortsAfterPeerCrash = ALL_NODE_PORTS.filter(port => {
					return port !== NETWORK_START_PORT && port !== NETWORK_START_PORT + 1;
				});

				expect(peerPortsAfterPeerCrash).to.be.eql(
					expectedPeerPortsAfterPeerCrash,
				);
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
							requestData: request.data,
						});
					});
				});
			});

			it('should make request to the network; it should reach a single peer', async () => {
				const firstP2PNode = p2pNodeList[0];
				const response = await firstP2PNode.request({
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

			// Check for even distribution of requests across the network. Account for an error margin.
			it('requests made to the network should be distributed randomly', async () => {
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

				Object.values(nodePortToResponsesMap).forEach(
					(requestsHandled: any) => {
						expect(requestsHandled).to.be.an('array');
						expect(requestsHandled.length).to.be.greaterThan(
							expectedRequestsLowerBound,
						);
						expect(requestsHandled.length).to.be.lessThan(
							expectedRequestsUpperBound,
						);
					},
				);
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
							message,
						});
					});
				});
			});

			it('should send a message to a subset of peers within the network; should reach multiple peers with even distribution', async () => {
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
				collectedMessages.forEach((receivedMessageData: any) => {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(
						receivedMessageData,
					);
				});

				expect(nodePortToMessagesMap).to.not.to.be.empty;
				Object.values(nodePortToMessagesMap).forEach(
					(receivedMessages: any) => {
						expect(receivedMessages).to.be.an('array');
						expect(receivedMessages.length).to.be.greaterThan(
							expectedMessagesLowerBound,
						);
						expect(receivedMessages.length).to.be.lessThan(
							expectedMessagesUpperBound,
						);
					},
				);
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
							request,
						});
					});
				});
			});

			it('should send the node info to a subset of peers within the network.', async () => {
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

				await wait(100);

				// Each peer of firstP2PNode should receive a message.
				expect(collectedMessages.length).to.equal(9);

				collectedMessages.forEach((receivedMessageData: any) => {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(
						receivedMessageData,
					);
				});

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
				p2pNodeList.slice(1).forEach(p2pNode => {
					const networkStatus = p2pNode.getNetworkStatus();
					const firstP2PNodePeerInfo = networkStatus.connectedPeers.find(
						peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
					);
					expect(firstP2PNodePeerInfo).to.exist;
					expect(firstP2PNodePeerInfo)
						.to.have.property('height')
						.which.equals(10);
				});
			});
		});

		describe('when couple of node shuts down and are unresponsive', () => {
			it('should remove the unresponsive nodes from network status of other nodes', async () => {
				const initialNetworkStatus = p2pNodeList[0].getNetworkStatus();
				const initialPeerPorts = initialNetworkStatus.connectedPeers
					.map(peerInfo => peerInfo.wsPort)
					.sort();

				expect(initialPeerPorts).to.be.eql(
					ALL_NODE_PORTS.filter(port => port !== NETWORK_START_PORT),
				);

				await p2pNodeList[1].stop();
				await wait(100);
				await p2pNodeList[2].stop();
				await wait(100);

				const networkStatusAfterPeerCrash = p2pNodeList[0].getNetworkStatus();

				const peerPortsAfterPeerCrash = networkStatusAfterPeerCrash.connectedPeers
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
		) => input.peers;

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
										NETWORK_START_PORT + ((index - 1) % NETWORK_PEER_COUNT),
								},
						  ];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					ackTimeout: 5000,
					peerSelectionForSend: peerSelectionForSendRequest as P2PPeerSelectionForSendFunction,
					peerSelectionForRequest: peerSelectionForSendRequest as P2PPeerSelectionForRequestFunction,
					peerSelectionForConnection,
					seedPeers,
					wsEngine: 'ws',
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

			// Launch nodes one at a time with a delay between each launch.
			for (const p2p of p2pNodeList) {
				await p2p.start();
				await wait(100);
			}
			await wait(100);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
		});

		it('should start all the nodes with custom selection functions without fail', async () => {
			p2pNodeList.forEach(p2p =>
				expect(p2p).to.have.property('isActive', true),
			);
		});

		describe('Peer Discovery', () => {
			it('should run peer discovery successfully', async () => {
				p2pNodeList.forEach(p2p => {
					const connectedPeers = p2p.getNetworkStatus().connectedPeers;

					expect(p2p.isActive).to.be.true;
					expect(connectedPeers.length).to.gt(1);
				});
			});
		});

		describe('P2P.request', () => {
			beforeEach(async () => {
				p2pNodeList.forEach(async p2p => {
					// Collect port numbers to check which peer handled which request.
					p2p.on('requestReceived', request => {
						request.end({
							nodePort: p2p.nodeInfo.wsPort,
							requestProcedure: request.procedure,
							requestData: request.data,
						});
					});
				});
			});

			it('should make a request to the network; it should reach a single peer based on custom selection function', async () => {
				const firstP2PNode = p2pNodeList[0];
				const response = await firstP2PNode.request({
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

			beforeEach(async () => {
				collectedMessages = [];
				p2pNodeList.forEach(async p2p => {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message,
						});
					});
				});
			});

			it('should send a message to a subset of peers within the network; should reach multiple peers with even distribution', async () => {
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
				collectedMessages.forEach((receivedMessageData: any) => {
					if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
						nodePortToMessagesMap[receivedMessageData.nodePort] = [];
					}
					nodePortToMessagesMap[receivedMessageData.nodePort].push(
						receivedMessageData,
					);
				});

				expect(nodePortToMessagesMap).to.not.to.be.empty;
				Object.values(nodePortToMessagesMap).forEach(
					(receivedMessages: any) => {
						expect(receivedMessages).to.be.an('array');
						expect(receivedMessages.length).to.be.greaterThan(
							expectedMessagesLowerBound,
						);
						expect(receivedMessages.length).to.be.lessThan(
							expectedMessagesUpperBound,
						);
					},
				);
			});
		});
	});

	describe('Partially connected network of 4 nodes: All nodes launch at the same time. The custom fields that are passed in nodeinfo is captured by other nodes.', () => {
		const DISCOVERY_INTERVAL = 200;

		beforeEach(async () => {
			p2pNodeList = [...Array(4).keys()].map(index => {
				// Each node will have the next node in the sequence as a seed peer.
				const seedPeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort: NETWORK_START_PORT + ((index + 1) % 4),
					},
				];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					blacklistedPeers: [],
					seedPeers,
					wsEngine: 'ws',
					// A short connectTimeout and ackTimeout will make the node to give up on discovery quicker for our test.
					connectTimeout: 1000,
					ackTimeout: 1000,
					// Set a different discoveryInterval for each node; that way they don't keep trying to discover each other at the same time.
					discoveryInterval: DISCOVERY_INTERVAL + index * 11,
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

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				p2p => p2p.start(),
			);
			await Promise.all(peerStartPromises);
			await wait(100);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
		});

		describe('all the nodes should be able to communicate and receive custom fields passed in nodeinfo', () => {
			it('should have tried peers with custom test field "modules" that was passed as nodeinfo', async () => {
				p2pNodeList.forEach(p2p => {
					const {
						connectedPeers,
						newPeers,
						triedPeers,
					} = p2p.getNetworkStatus();

					triedPeers.forEach(peer => {
						expect(peer)
							.has.property('modules')
							.has.property('names')
							.is.an('array');

						expect(peer)
							.has.property('modules')
							.has.property('active')
							.is.a('boolean');
					});

					newPeers.forEach(peer => {
						expect(peer)
							.has.property('modules')
							.has.property('names')
							.is.an('array');

						expect(peer)
							.has.property('modules')
							.has.property('active')
							.is.a('boolean');
					});

					connectedPeers.forEach(peer => {
						expect(peer)
							.has.property('modules')
							.has.property('names')
							.is.an('array');

						expect(peer)
							.has.property('modules')
							.has.property('active')
							.is.a('boolean');
					});
				});
			});
		});
	});

	describe('Fully connected network with a custom maximum payload', () => {
		const dataLargerThanMaxPayload = [
			{
				ip: '100.100.100.100',
				os: 'linux4.18.0-20-generic',
				version: '2.0.0-rc.0',
				wsPort: 7001,
				httpPort: 7000,
				protocolVersion: '1.1',
				height: 8691420,
				broadhash:
					'65b4ad0583d0222db11619ec86bd4ba154e0bf8bfd72a4b9ad38dbc26da65249',
				nonce: 'V2IrG8mpOGx6LDuE',
				state: 2,
			},
			{
				ip: '100.100.100.100',
				os: 'linux4.15.0-54-generic',
				version: '2.0.0-rc.0',
				wsPort: 7001,
				httpPort: 7000,
				protocolVersion: '1.1',
				height: 8691420,
				broadhash:
					'65b4ad0583d0222db11619ec86bd4ba154e0bf8bfd72a4b9ad38dbc26da65249',
				nonce: 'rbEj3J36NblYDEyd',
				state: 2,
			},
		];

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
										NETWORK_START_PORT + ((index - 1) % NETWORK_PEER_COUNT),
								},
						  ];

				const nodePort = NETWORK_START_PORT + index;

				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					ackTimeout: 5000,
					seedPeers,
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
					wsMaxPayload: 500,
				});
			});

			// Launch nodes one at a time with a delay between each launch.
			for (const p2p of p2pNodeList) {
				await p2p.start();
			}
			await wait(100);
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

			beforeEach(() => {
				collectedMessages = [];
				p2pNodeList.forEach(p2p => {
					p2p.on('messageReceived', message => {
						collectedMessages.push({
							nodePort: p2p.nodeInfo.wsPort,
							message,
						});
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
				await wait(100);

				for (const p2pNode of p2pNodeList) {
					if (p2pNode.nodeInfo.wsPort === 5000) {
						expect(p2pNodeList[0].getNetworkStatus().connectedPeers).to.be
							.empty;
					}
					expect(p2pNodeList[1].getNetworkStatus().connectedPeers).to.be.not
						.empty;
				}
			});
		});
	});
});
