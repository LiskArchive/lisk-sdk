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
import { P2P, events } from '../../src/index';
import { wait } from '../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_PEER_COUNT,
} from '../utils/network_setup';

describe('P2P.broadcast', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];

	const BROADCAST_EVENT = 'foo';
	const BROADCAST_DATA = 'bar';

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on(events.EVENT_MESSAGE_RECEIVED, message => {
				if (message.event === BROADCAST_EVENT) {
					collectedMessages.push({
						nodePort: p2p.nodeInfo.wsPort,
						message,
					});
				}
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send a message to every connected peer', async () => {
		// Arrange
		const firstP2PNode = p2pNodeList[0];
		const nodePortToMessagesMap: any = {};

		// Act
		firstP2PNode.broadcast({ event: BROADCAST_EVENT, data: BROADCAST_DATA });
		await wait(100);

		// Assert
		expect(Object.keys(collectedMessages)).toHaveLength(NETWORK_PEER_COUNT - 1);
		for (let receivedMessageData of collectedMessages) {
			if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
				nodePortToMessagesMap[receivedMessageData.nodePort] = [];
			}
			nodePortToMessagesMap[receivedMessageData.nodePort].push(
				receivedMessageData,
			);
		}

		expect(Object.keys(nodePortToMessagesMap)).toHaveLength(
			NETWORK_PEER_COUNT - 1,
		);
		for (let receivedMessages of Object.values(nodePortToMessagesMap) as any) {
			expect(receivedMessages).toEqual(expect.any(Array));
			expect(receivedMessages).toHaveLength(1);
		}
	});

	it('should receive a message in the correct format', async () => {
		// Arrange
		const firstP2PNode = p2pNodeList[0];

		// Act
		firstP2PNode.broadcast({ event: BROADCAST_EVENT, data: BROADCAST_DATA });
		await wait(100);

		// Assert
		expect(collectedMessages).toEqual(expect.any(Array));
		expect(collectedMessages).toHaveLength(NETWORK_PEER_COUNT - 1);

		expect(collectedMessages[0]).toMatchObject({
			message: {
				event: BROADCAST_EVENT,
				data: BROADCAST_DATA,
				peerId: `127.0.0.1:${firstP2PNode.nodeInfo.wsPort}`,
			},
		});
	});
});
