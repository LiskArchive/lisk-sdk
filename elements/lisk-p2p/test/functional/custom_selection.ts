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
import {
	P2PPeerSelectionForSendFunction,
	P2PPeerSelectionForRequestFunction,
	P2PPeerSelectionForConnectionFunction,
	P2PPeerSelectionForSendInput,
	P2PPeerSelectionForRequestInput,
	P2PPeerSelectionForConnectionInput,
} from '../../src/p2p_types';

describe('Network with custom selection algorithm is passed to each node', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 15;
	const POPULATOR_INTERVAL = 50;
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

	before(async () => {
		// Make sure that integration tests use real timers.
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
								wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
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
				maxOutboundConnections: 5,
				maxInboundConnections: 5,
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

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
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
