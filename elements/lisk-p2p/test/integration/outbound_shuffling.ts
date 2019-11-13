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
	EVICTED_PEER_CODE,
	SEED_PEER_DISCONNECTION_REASON,
} from '../../src/index';
import { wait } from '../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_PEER_COUNT,
	SEED_PEER_IP,
	NETWORK_START_PORT,
} from 'utils/network_setup';

describe('Outbound peer shuffling', () => {
	describe('when networkk is fullfill Outbound connections', () => {
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
				const evictedConnections = collectedEventsCount.get(
					p2p.nodeInfo.wsPort,
				);

				expect(evictedConnections).to.be.gt(0);
			});
		});
	});

	describe('when Outbound connections are SeedPeers', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Array();
		const POPULATOR_INTERVAL = 100000;
		const OUTBOUND_SHUFFLE_INTERVAL = 50;

		beforeEach(async () => {
			const seedPeers = [...Array(NETWORK_PEER_COUNT)].map((_e, i) => ({
				ipAddress: SEED_PEER_IP,
				wsPort: NETWORK_START_PORT + i,
			}));

			const customConfig = () => ({
				seedPeers: seedPeers,
				populatorInterval: POPULATOR_INTERVAL,
				outboundShuffleInterval: OUTBOUND_SHUFFLE_INTERVAL,
			});

			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 1,
				customConfig,
			});

			p2pNodeList.forEach(p2p => {
				p2p.on(EVENT_CLOSE_OUTBOUND, msg => {
					if (msg.code === EVICTED_PEER_CODE) {
						collectedEvents.push(msg.reason);
					}
				});
			});
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should disconnecting from Seed Peers', async () => {
			await wait(200);

			expect(collectedEvents.length).to.be.gt(NETWORK_PEER_COUNT - 1);

			for (const disconnectReason of collectedEvents) {
				expect(disconnectReason).to.be.equal(SEED_PEER_DISCONNECTION_REASON);
			}
		});
	});
});
