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
import { P2P, EVENT_MESSAGE_RECEIVED } from '../../../src/index';
import { wait } from '../../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
} from 'utils/network_setup';

describe('P2P.send', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on(EVENT_MESSAGE_RECEIVED, message => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					message,
				});
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
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

		expect(Object.keys(collectedMessages)).toHaveLength(0);
		for (let receivedMessageData of collectedMessages) {
			if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
				nodePortToMessagesMap[receivedMessageData.nodePort] = [];
			}
			nodePortToMessagesMap[receivedMessageData.nodePort].push(
				receivedMessageData,
			);
		}

		expect(Object.keys(nodePortToMessagesMap)).toHaveLength(0);
		for (let receivedMessages of Object.values(nodePortToMessagesMap) as any) {
			expect(receivedMessages).toBeInstanceOf('array');
			expect(receivedMessages.length).toBeGreaterThan(
				expectedMessagesLowerBound,
			);
			expect(receivedMessages.length).toBeLessThan(expectedMessagesUpperBound);
		}
	});

	it('should receive a message in the correct format', async () => {
		const firstP2PNode = p2pNodeList[0];

		const numOfConnectedPeers = firstP2PNode.getConnectedPeers().length;

		firstP2PNode.send({ event: 'bar', data: 'test' });

		await wait(100);

		expect(collectedMessages).toBeInstanceOf('array');
		expect(collectedMessages.length).toEqual(numOfConnectedPeers);
		expect(collectedMessages[0]).toHaveProperty('message');
		expect(collectedMessages[0].message)
			.toHaveProperty('event')
			.toBe('bar');
		expect(collectedMessages[0].message)
			.toHaveProperty('data')
			.toBe('test');
		expect(collectedMessages[0].message)
			.toHaveProperty('peerId')
			.toBe(`127.0.0.1:${NETWORK_START_PORT}`);
	});

	describe('when peers are at different heights', () => {
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

		// TODO: #3389 Improve network test to be fast and stable, it can fail randomly depend on network shuffle
		it('should send messages to peers within the network with updated heights; should reach multiple peers with even distribution', async () => {
			const TOTAL_SENDS = 1000;
			const nodePortToMessagesMap: any = {};

			const expectedAverageMessagesPerNode = TOTAL_SENDS;
			const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
			const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				randomP2PNode.send({ event: 'bar', data: i });
			}
			await wait(100);

			expect(Object.keys(collectedMessages)).toHaveLength(0);
			for (let receivedMessageData of collectedMessages) {
				if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
					nodePortToMessagesMap[receivedMessageData.nodePort] = [];
				}
				nodePortToMessagesMap[receivedMessageData.nodePort].push(
					receivedMessageData,
				);
			}

			expect(Object.keys(nodePortToMessagesMap)).toHaveLength(0);
			for (let receivedMessages of Object.values(
				nodePortToMessagesMap,
			) as any) {
				expect(receivedMessages).toBeInstanceOf('array');
				expect(receivedMessages.length).toBeGreaterThan(
					expectedMessagesLowerBound,
				);
				expect(receivedMessages.length).toBeLessThan(
					expectedMessagesUpperBound,
				);
			}
		});
	});
});
