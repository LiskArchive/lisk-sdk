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
import {
	P2P,
	EVENT_CONNECT_OUTBOUND,
	EVENT_NEW_INBOUND_PEER,
	EVENT_DISCOVERED_PEER,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	INVALID_CONNECTION_SELF_REASON,
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
} from '../../../src/index';
import { wait } from '../../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	SEED_PEER_IP,
	NETWORK_START_PORT,
} from '../../utils/network_setup';

describe(`Connection Create`, () => {
	describe(`Events`, () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			// To capture all the initial events set network creation time to minimum 1 ms
			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
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

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it(`should handle ${EVENT_NEW_INBOUND_PEER} event and payload`, async () => {
			const secondNode = p2pNodeList[1];
			const payload = collectedEvents.get(EVENT_NEW_INBOUND_PEER);

			expect(payload)
				.to.have.property('wsPort')
				.which.equals(secondNode.nodeInfo.wsPort);
			expect(payload).to.have.property('sharedState');
		});

		it(`should handle ${EVENT_CONNECT_OUTBOUND} event and payload`, async () => {
			const firstNode = p2pNodeList[0];
			const payload = collectedEvents.get(EVENT_CONNECT_OUTBOUND);

			expect(payload)
				.to.have.property('wsPort')
				.which.equals(firstNode.nodeInfo.wsPort);
			expect(payload).to.have.property('sharedState');
		});

		it(`should handle ${EVENT_UPDATED_PEER_INFO} event and payload`, async () => {
			const firstNode = p2pNodeList[0];
			const payload = collectedEvents.get(EVENT_UPDATED_PEER_INFO);

			expect(payload)
				.to.have.property('wsPort')
				.which.equals(firstNode.nodeInfo.wsPort);
			expect(payload).to.have.property('sharedState');
		});

		it(`should handle ${EVENT_DISCOVERED_PEER} event and payload`, async () => {
			const secondNode = p2pNodeList[1];
			const payload = collectedEvents.get(EVENT_DISCOVERED_PEER);

			expect(payload)
				.to.have.property('wsPort')
				.which.equals(secondNode.nodeInfo.wsPort);
			expect(payload).to.have.property('sharedState');
		});

		it(`should update peerBook with connected peer`, async () => {
			const firstNode = p2pNodeList[0];
			const disconnectedPeers = firstNode.getDisconnectedPeers();

			expect(disconnectedPeers).to.be.empty;
		});
	});

	describe(`Errors`, () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedErrors: Array<any> = [];

		beforeEach(async () => {
			const customNodeInfo = (index: number) => ({
				nethash:
					index === 1
						? 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba'
						: 'BAD_d6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
				version: '1.0.1',
				protocolVersion: index === 2 ? '1.1' : 'BAD',
				minVersion: '1.0.0',
				os: 'darwin',
				height: 0,
				httpPort: 0,
				broadhash:
					'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
				nonce: `O2wTkjqplHII500${index}`,
			});

			const customConfig = (index: number) => ({
				nodeInfo: customNodeInfo(index),
				seedPeers: [
					{
						ipAddress: SEED_PEER_IP,
						wsPort: NETWORK_START_PORT,
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

		it(`should fire ${EVENT_FAILED_TO_ADD_INBOUND_PEER} events`, async () => {
			expect(collectedErrors).to.include(INVALID_CONNECTION_SELF_REASON);
			expect(collectedErrors).to.include(INCOMPATIBLE_NETWORK_REASON);
			expect(collectedErrors).to.include(INCOMPATIBLE_PROTOCOL_VERSION_REASON);
		});
	});
});
