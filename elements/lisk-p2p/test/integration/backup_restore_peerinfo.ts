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
import { createNetwork, destroyNetwork } from '../utils/network_setup';

const { EVENT_MESSAGE_RECEIVED, EVENT_BAN_PEER, EVENT_REMOVE_PEER, EVENT_CLOSE_OUTBOUND } = events;

describe('Backup and Restore', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let firstNode: P2P;
	let secondNode: P2P;
	let messageCounter = 0;
	const bannedMessages: any[] = [];
	const removedPeer: any[] = [];
	const disconnectMessages: any[] = [];

	beforeEach(async () => {
		const customConfig = () => ({
			wsMaxMessageRate: 110,
			rateCalculationInterval: 300,
			wsMaxMessageRatePenalty: 100,
		});

		p2pNodeList = await createNetwork({ customConfig, networkSize: 2 });
		[firstNode, secondNode] = p2pNodeList;

		secondNode.on(EVENT_MESSAGE_RECEIVED, _message => {
			messageCounter += 1;
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
		const targetPeerId = `127.0.0.1:${secondNode.config.port}`;
		const TOTAL_SENDS = 5;
		const CUSTOM_DISCONNECT_MESSAGE = 'Intentional disconnect **';

		for (let i = 0; i < TOTAL_SENDS; i += 1) {
			await wait(2);
			try {
				firstNode.sendToPeer(
					{
						event: 'foo',
						data: i,
					},
					targetPeerId,
				);
				// eslint-disable-next-line no-empty
			} catch (error) {}
		}
		await wait(50);

		const getFirstConnectedPeer = secondNode['_peerPool']
			.getConnectedPeers()
			.find(peerInfo => peerInfo.id === `127.0.0.1:${firstNode.config.port}`);

		if (getFirstConnectedPeer) {
			// Disconnect after sending few messages
			getFirstConnectedPeer.disconnect(4009, CUSTOM_DISCONNECT_MESSAGE);

			expect(messageCounter).toBeGreaterThan(TOTAL_SENDS - 2);

			const disconnectFirstPeer = secondNode['_peerBook'].getPeer({
				ipAddress: '127.0.0.1',
				port: 5000,
				peerId: '127.0.0.1:5000',
			});
			if (disconnectFirstPeer) {
				// Should capture message counter if a peer disconnects
				expect((disconnectFirstPeer.internalState as any).messageCounter.get('foo')).toBe(
					TOTAL_SENDS,
				);
			}

			await wait(10);

			expect(disconnectMessages.map(msg => msg.reason)).toContain(CUSTOM_DISCONNECT_MESSAGE);

			const getFirstNodeSecondTime = secondNode['_peerPool']['_peerMap'].get(
				`127.0.0.1:${firstNode.config.port}`,
			);

			if (getFirstNodeSecondTime) {
				for (let i = 0; i < TOTAL_SENDS; i += 1) {
					await wait(2);
					try {
						firstNode.sendToPeer(
							{
								event: 'foo',
								data: i,
							},
							targetPeerId,
						);
						// eslint-disable-next-line no-empty
					} catch (error) {}
				}
				await wait(20);

				// Should get more TOTAL_SENDS number of foo messages
				expect(
					(getFirstNodeSecondTime.peerInfo.internalState as any).messageCounter.get('foo'),
				).toBe(TOTAL_SENDS * 2);
			}

			expect(removedPeer.length).toBeGreaterThan(0);
			// Now send more messages to get banned
			// eslint-disable-next-line no-plusplus
			for (let i = 0; i < 200; i++) {
				await wait(1);
				try {
					firstNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
					// eslint-disable-next-line no-empty
				} catch (error) {}
			}
			await wait(200);

			expect(bannedMessages).toHaveLength(1);
		}
	});
});
