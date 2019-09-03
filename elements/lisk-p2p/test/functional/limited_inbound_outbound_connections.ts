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

describe('Network with a limited number of outbound/inbound connections', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT_WITH_LIMIT = 30;
	const LIMITED_CONNECTIONS = 5;
	const ALL_NODE_PORTS_WITH_LIMIT: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT_WITH_LIMIT).keys(),
	].map(index => NETWORK_START_PORT + index);
	const POPULATOR_INTERVAL_WITH_LIMIT = 50;

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
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(100);
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
			const expectedRequestsLowerBound = expectedAverageRequestsPerNode * 0.45;
			const expectedRequestsUpperBound = expectedAverageRequestsPerNode * 1.55;

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
