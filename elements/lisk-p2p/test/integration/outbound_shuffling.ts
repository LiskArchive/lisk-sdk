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
import { P2P, events, constants } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

const { EVENT_CLOSE_OUTBOUND } = events;

describe('Outbound peer shuffling', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEventsCount = new Map();
	const OUTBOUND_SHUFFLE_INTERVAL = 1000;

	beforeEach(async () => {
		const customConfig = (_index: number, _startPort: number, networkSize: number) => ({
			maxOutboundConnections: Math.round(networkSize / 2),
			maxInboundConnections: Math.round(networkSize / 2),
			outboundShuffleInterval: OUTBOUND_SHUFFLE_INTERVAL,
			fallbackSeedPeerDiscoveryInterval: 10000,
		});

		p2pNodeList = await createNetwork({
			customConfig,
			networkDiscoveryWaitTime: 1,
			networkSize: 4,
		});

		p2pNodeList.forEach(p2p => {
			p2p.on(EVENT_CLOSE_OUTBOUND, msg => {
				if (msg.code === constants.EVICTED_PEER_CODE) {
					let evictedConnections = collectedEventsCount.get(p2p.config.port);

					if (evictedConnections) {
						collectedEventsCount.set(p2p.config.port, (evictedConnections += 1));
					} else {
						collectedEventsCount.set(p2p.config.port, 1);
					}
				}
			});
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should shuffle outbound peers and close connection with evict', async () => {
		await wait(1500);

		p2pNodeList.forEach(p2p => {
			const evictedConnections = collectedEventsCount.get(p2p.config.port);

			expect(evictedConnections).toBeGreaterThan(0);
		});
	});
});
