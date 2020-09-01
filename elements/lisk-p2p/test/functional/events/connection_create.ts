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
import { P2P, events, constants } from '../../../src/index';
import { wait } from '../../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	SEED_PEER_IP,
	NETWORK_START_PORT,
} from '../../utils/network_setup';

const {
	EVENT_CONNECT_OUTBOUND,
	EVENT_NEW_INBOUND_PEER,
	EVENT_DISCOVERED_PEER,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
} = events;

const {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
	INVALID_CONNECTION_SELF_REASON,
} = constants;

describe('Connection Create', () => {
	describe('Events', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeAll(async () => {
			// To capture all the initial events set network creation time to minimum 1 ms
			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 0,
			});
			const firstNode = p2pNodeList[0];
			const secondNode = p2pNodeList[1];

			firstNode.on(EVENT_NEW_INBOUND_PEER, res => {
				collectedEvents.set(EVENT_NEW_INBOUND_PEER, res);
			});

			secondNode.on(EVENT_CONNECT_OUTBOUND, res => {
				collectedEvents.set(EVENT_CONNECT_OUTBOUND, res);
			});
			secondNode.on(EVENT_DISCOVERED_PEER, res => {
				collectedEvents.set(EVENT_DISCOVERED_PEER, res);
			});

			secondNode.on(EVENT_UPDATED_PEER_INFO, res => {
				collectedEvents.set(EVENT_UPDATED_PEER_INFO, res);
			});

			await Promise.all(p2pNodeList.map(async p2p => p2p.start()));

			await wait(1000);
		});

		afterAll(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it(`should handle ${EVENT_NEW_INBOUND_PEER} event and payload`, () => {
			const secondNode = p2pNodeList[1];
			const payload = collectedEvents.get(EVENT_NEW_INBOUND_PEER);

			expect(payload).toMatchObject({
				port: secondNode.config.port,
				sharedState: expect.any(Object),
			});
		});

		it(`should handle ${EVENT_CONNECT_OUTBOUND} event and payload`, () => {
			const firstNode = p2pNodeList[0];
			const payload = collectedEvents.get(EVENT_CONNECT_OUTBOUND);

			expect(payload).toMatchObject({
				port: firstNode.config.port,
				sharedState: expect.any(Object),
			});
		});

		it(`should handle ${EVENT_UPDATED_PEER_INFO} event and payload`, () => {
			const firstNode = p2pNodeList[0];
			const payload = collectedEvents.get(EVENT_UPDATED_PEER_INFO);

			expect(payload).toMatchObject({
				port: firstNode.config.port,
				sharedState: expect.any(Object),
			});
		});

		it(`should handle ${EVENT_DISCOVERED_PEER} event and payload`, () => {
			const secondNode = p2pNodeList[1];
			const payload = collectedEvents.get(EVENT_DISCOVERED_PEER);

			expect(payload).toMatchObject({
				port: secondNode.config.port,
				sharedState: expect.any(Object),
			});
		});

		it('should update peerBook with connected peer', () => {
			const firstNode = p2pNodeList[0];
			const disconnectedPeers = firstNode.getDisconnectedPeers();

			expect(Object.keys(disconnectedPeers)).toHaveLength(0);
		});
	});

	describe('Errors', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedErrors: Array<any> = [];

		beforeEach(async () => {
			const customNodeInfo = (index: number) => ({
				networkIdentifier:
					index === 1
						? 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba'
						: 'BAD_d6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
				networkVersion: index === 2 ? '1.1' : 'BAD',
				nonce: `O2wTkjqplHII500${index}`,
			});

			const customConfig = (index: number) => ({
				nodeInfo: customNodeInfo(index),
				seedPeers: [
					{
						ipAddress: SEED_PEER_IP,
						port: NETWORK_START_PORT,
					},
				],
			});

			p2pNodeList = await createNetwork({
				networkSize: 3,
				networkDiscoveryWaitTime: 1,
				customConfig,
			});

			const firstNode = p2pNodeList[0];

			firstNode.on(EVENT_FAILED_TO_ADD_INBOUND_PEER, res => {
				collectedErrors.push(res.message);
			});

			await wait(1000);
		});
		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it(`should fire ${EVENT_FAILED_TO_ADD_INBOUND_PEER} events`, () => {
			expect(collectedErrors).toEqual(expect.arrayContaining([INVALID_CONNECTION_SELF_REASON]));
			expect(collectedErrors).toEqual(expect.arrayContaining([INCOMPATIBLE_NETWORK_REASON]));
			expect(collectedErrors).toEqual(
				expect.arrayContaining([INCOMPATIBLE_PROTOCOL_VERSION_REASON]),
			);
		});
	});
});
