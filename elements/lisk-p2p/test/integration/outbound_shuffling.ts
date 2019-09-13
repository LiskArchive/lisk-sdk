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
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

describe('Outbound peer shuffling', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const POPULATOR_INTERVAL_SHUFFLING = 3000;
	const OUTBOUND_SHUFFLE_INTERVAL = 500;

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
			populatorInterval: POPULATOR_INTERVAL_SHUFFLING,
			outboundShuffleInterval: OUTBOUND_SHUFFLE_INTERVAL,
		});

		p2pNodeList = await createNetwork({ customConfig, customSeedPeers });
	});

	after(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should shuffle outbound peers in an interval', async () => {
		const p2pNode = p2pNodeList[0];
		const { outboundCount } = p2pNode['_peerPool'].getPeersCountPerKind();
		// Wait for periodic shuffling
		await wait(500);
		const { outboundCount: updatedOutbound } = p2pNode[
			'_peerPool'
		].getPeersCountPerKind();

		expect(updatedOutbound).lt(outboundCount);
	});
});
