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
import { P2P, events } from '../../../src/index';
import { wait } from '../../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
} from '../../utils/network_setup';

describe('P2P.send', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
	const randomPeerIndex = Math.floor(Math.random() * NETWORK_PEER_COUNT);
	const messageEvent = 'bar';
	let randomP2PNode: any;

	beforeAll(async () => {
		p2pNodeList = await createNetwork();
		randomP2PNode = p2pNodeList[randomPeerIndex];

		for (const p2p of p2pNodeList) {
			// eslint-disable-next-line no-loop-func
			p2p.on(events.EVENT_MESSAGE_RECEIVED, message => {
				if (message.event === messageEvent) {
					collectedMessages.push({
						nodePort: p2p.config.port,
						message,
					});
				}
			});
		}
	});

	beforeEach(() => {
		collectedMessages = [];
	});

	afterAll(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send a message to peers; should reach peers with even distribution', async () => {
		// Arrange
		const TOTAL_SENDS = 100;
		const firstP2PNode = p2pNodeList[0];
		const nodePortToMessagesMap: any = {};
		const expectedAverageMessagesPerNode = TOTAL_SENDS;
		const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
		const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;
		const numOfConnectedPeers = firstP2PNode.getConnectedPeers().length;
		const expectedMessageCount = TOTAL_SENDS * numOfConnectedPeers;

		// Act
		for (let i = 0; i < TOTAL_SENDS; i += 1) {
			firstP2PNode.send({ event: messageEvent, data: 'test' });
		}
		await wait(100);

		// Assert
		expect(Object.keys(collectedMessages)).toHaveLength(expectedMessageCount);

		for (const receivedMessageData of collectedMessages) {
			if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
				nodePortToMessagesMap[receivedMessageData.nodePort] = [];
			}
			nodePortToMessagesMap[receivedMessageData.nodePort].push(receivedMessageData);
		}

		expect(Object.keys(nodePortToMessagesMap)).toHaveLength(numOfConnectedPeers);

		for (const receivedMessages of Object.values(nodePortToMessagesMap) as any) {
			expect(receivedMessages).toEqual(expect.any(Array));

			expect(receivedMessages.length).toBeGreaterThan(expectedMessagesLowerBound);
			expect(receivedMessages.length).toBeLessThan(expectedMessagesUpperBound);
		}
	});

	it('should receive a message in the correct format', async () => {
		// Arrange
		const firstP2PNode = p2pNodeList[0];
		const numOfConnectedPeers = firstP2PNode.getConnectedPeers().length;
		const data = Buffer.from(JSON.stringify('test'), 'utf8');

		// Act
		firstP2PNode.send({ event: messageEvent, data });
		await wait(100);

		// Assert
		expect(collectedMessages).toEqual(expect.any(Array));
		expect(collectedMessages).toHaveLength(numOfConnectedPeers);
		expect(collectedMessages[0]).toHaveProperty('message');
		expect(collectedMessages[0].message).toMatchObject({
			event: 'bar',
			data,
			peerId: `127.0.0.1:${NETWORK_START_PORT}`,
		});
	});

	it('should reach multiple peers with even distribution', async () => {
		// Arrange
		const TOTAL_SENDS = 1000;
		const nodePortToMessagesMap: any = {};
		const expectedAverageMessagesPerNode = TOTAL_SENDS;
		const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
		const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;
		const data = Buffer.from(JSON.stringify('test'), 'utf8');

		// Act
		for (let i = 0; i < TOTAL_SENDS; i += 1) {
			randomP2PNode.send({ event: messageEvent, data });
		}
		await wait(100);

		// Assert
		expect(Object.keys(collectedMessages)).not.toBeEmpty();

		for (const receivedMessageData of collectedMessages) {
			if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
				nodePortToMessagesMap[receivedMessageData.nodePort] = [];
			}
			nodePortToMessagesMap[receivedMessageData.nodePort].push(receivedMessageData);
		}

		expect(Object.keys(nodePortToMessagesMap)).not.toBeEmpty();

		for (const receivedMessages of Object.values(nodePortToMessagesMap) as any) {
			expect(receivedMessages).toEqual(expect.any(Array));

			expect(receivedMessages.length).toBeGreaterThan(expectedMessagesLowerBound);
			expect(receivedMessages.length).toBeLessThan(expectedMessagesUpperBound);
		}
	});
});
