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
import { P2P, EVENT_CLOSE_OUTBOUND, EVICTED_PEER_CODE } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

describe('Outbound peer shuffling', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEventsCount = new Map();
	const OUTBOUND_SHUFFLE_INTERVAL = 100;

	beforeEach(async () => {
		const customSeedPeers = (
			index: number,
			startPort: number,
			networkSize: number,
		) =>
			[...new Array(networkSize / 2).keys()]
				.map(index => ({
					ipAddress: '127.0.0.1',
					wsPort: startPort + ((index + 2) % networkSize), // Choose alternate peers for connection so that a node has available peers to make outbound connections
				}))
				.filter(seedPeer => seedPeer.wsPort !== startPort + index); // Avoid adding yourself

		const customConfig = (
			_index: number,
			_startPort: number,
			networkSize: number,
		) => ({
			maxOutboundConnections: Math.round(networkSize / 2),
			maxInboundConnections: Math.round(networkSize / 2),
			outboundShuffleInterval: OUTBOUND_SHUFFLE_INTERVAL,
			seedPeers: customSeedPeers(_index, _startPort, networkSize),
		});

		p2pNodeList = await createNetwork({ customConfig });

		p2pNodeList.forEach(p2p => {
			p2p.on(EVENT_CLOSE_OUTBOUND, msg => {
				if (msg.code === EVICTED_PEER_CODE) {
					let evictedConnections = collectedEventsCount.get(
						p2p.nodeInfo.wsPort,
					);

					if (evictedConnections) {
						collectedEventsCount.set(
							p2p.nodeInfo.wsPort,
							(evictedConnections += 1),
						);
					} else {
						collectedEventsCount.set(p2p.nodeInfo.wsPort, 1);
					}
				}
			});
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should shuffle outbound peers and close connection with evict', async () => {
		await wait(500);

		p2pNodeList.forEach(p2p => {
			const evictedConnections = collectedEventsCount.get(p2p.nodeInfo.wsPort);

			expect(evictedConnections).to.be.gt(0);
		});
	});
});
