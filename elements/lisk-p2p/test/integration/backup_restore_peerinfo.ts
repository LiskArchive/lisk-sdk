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
import {
	P2P,
	EVENT_MESSAGE_RECEIVED,
	EVENT_BAN_PEER,
	EVENT_REMOVE_PEER,
	EVENT_CLOSE_OUTBOUND,
} from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';
import expect = require('expect');

describe('Backup and Restore', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let firstNode: P2P;
	let secondNode: P2P;
	let messageCounter = 0;
	let bannedMessages: any[] = [];
	let removedPeer: any[] = [];
	let disconnectMessages: any[] = [];

	beforeEach(async () => {
		const customConfig = () => ({
			wsMaxMessageRate: 110,
			rateCalculationInterval: 100,
			wsMaxMessageRatePenalty: 100,
		});

		p2pNodeList = await createNetwork({ customConfig, networkSize: 2 });
		firstNode = p2pNodeList[0];
		secondNode = p2pNodeList[1];

		secondNode.on(EVENT_MESSAGE_RECEIVED, _message => {
			messageCounter++;
		});
		secondNode.on(EVENT_BAN_PEER, peerId => {
			bannedMessages.push(peerId);
		});
		secondNode.on(EVENT_REMOVE_PEER, peerId => {
			removedPeer.push(peerId);
		});
		secondNode.on(EVENT_CLOSE_OUTBOUND, closePacket => {
			disconnectMessages.push(closePacket);
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('send messages to second peer', async () => {
		const targetPeerId = `127.0.0.1:${secondNode.nodeInfo.wsPort}`;
		const TOTAL_SENDS = 8;
		const CUSTOM_DISCONNECT_MESSAGE = 'Intentional disconnect **';

		for (let i = 0; i < TOTAL_SENDS; i++) {
			await wait(1);
			try {
				firstNode.sendToPeer(
					{
						event: 'foo',
						data: i,
					},
					targetPeerId,
				);
			} catch (error) {}
		}
		await wait(20);

		const getFirstConnectedPeer = secondNode['_peerPool']
			.getConnectedPeers()
			.find(
				peerInfo => peerInfo.id === `127.0.0.1:${firstNode.nodeInfo.wsPort}`,
			);

		if (getFirstConnectedPeer) {
			// Disconnect after sending few messages
			getFirstConnectedPeer.disconnect(4009, CUSTOM_DISCONNECT_MESSAGE);

			expect(messageCounter).toBeGreaterThanOrEqual(TOTAL_SENDS - 1);

			await wait(100);

			expect(
				disconnectMessages
					.map(msg => msg.reason)
					.includes(CUSTOM_DISCONNECT_MESSAGE),
			).toBeTruthy;

			const getFirstNodeSecondTime = secondNode['_peerPool']['_peerMap'].get(
				`127.0.0.1:${firstNode.nodeInfo.wsPort}`,
			);

			if (getFirstNodeSecondTime) {
				expect(
					(getFirstNodeSecondTime.peerInfo
						.internalState as any).messageRates.get('foo'),
				).toBeGreaterThan(0);
			}

			expect(removedPeer.length).toBeGreaterThan(0);
			// Now send more messages to get banned
			for (let i = 0; i < TOTAL_SENDS + 200; i++) {
				await wait(1);
				try {
					firstNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
				} catch (error) {}
			}
			await wait(10);

			expect(bannedMessages.length).toEqual(1);
		}
	});
});
