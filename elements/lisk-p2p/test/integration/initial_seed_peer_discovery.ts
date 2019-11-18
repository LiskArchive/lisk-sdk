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
	EVENT_CLOSE_OUTBOUND,
	INTENTIONAL_DISCONNECT_CODE,
	SEED_PEER_DISCONNECTION_REASON,
} from '../../src/index';
import { wait } from '../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_PEER_COUNT,
} from 'utils/network_setup';

describe('Initial Seed Peer Discovery', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Array();

	beforeEach(async () => {
		const customConfig = () => ({
			maxOutboundConnections: 4,
		});

		p2pNodeList = await createNetwork({
			networkDiscoveryWaitTime: 0,
			customConfig,
		});

		p2pNodeList.forEach(p2p => {
			p2p.on(EVENT_CLOSE_OUTBOUND, msg => {
				if (msg.code === INTENTIONAL_DISCONNECT_CODE) {
					collectedEvents.push(msg.reason);
				}
			});
		});

		await Promise.all(p2pNodeList.map(p2p => p2p.start()));

		await wait(1000);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should disconnecting from Seed Peers', async () => {
		// Every peer should reach the Outbound Connection limit and disconnect from discoverySeedPeers
		expect(collectedEvents.length).to.be.equal(NETWORK_PEER_COUNT - 1);

		for (const disconnectReason of collectedEvents) {
			expect(disconnectReason).to.be.equal(SEED_PEER_DISCONNECTION_REASON);
		}
	});
});
