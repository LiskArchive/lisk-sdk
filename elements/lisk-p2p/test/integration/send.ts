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

describe('P2P.send', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
	let collectedMessages: Array<any> = [];

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

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
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
		for (let receivedMessages of Object.values(nodePortToMessagesMap) as any) {
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
