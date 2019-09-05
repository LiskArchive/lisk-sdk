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
import { platform } from 'os';

describe('Outbound peer shuffling', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT_SHUFFLING = 10;
	const POPULATOR_INTERVAL_SHUFFLING = 10000;
	const OUTBOUND_SHUFFLE_INTERVAL = 500;

	before(async () => {
		sandbox.restore();
	});

	beforeEach(async () => {
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT_SHUFFLING).keys()].map(
			index => {
				const nodePort = NETWORK_START_PORT + index;

				const seedPeers = [...new Array(NETWORK_PEER_COUNT_SHUFFLING).keys()]
					.map(index => ({
						ipAddress: '127.0.0.1',
						wsPort:
							NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT_SHUFFLING),
					}))
					.filter(seedPeer => seedPeer.wsPort !== nodePort);

				return new P2P({
					connectTimeout: 200,
					ackTimeout: 200,
					seedPeers,
					wsEngine: 'ws',
					populatorInterval: POPULATOR_INTERVAL_SHUFFLING,
					maxOutboundConnections: Math.round(NETWORK_PEER_COUNT_SHUFFLING / 2),
					maxInboundConnections: Math.round(NETWORK_PEER_COUNT_SHUFFLING / 2),
					outboundShuffleInterval: OUTBOUND_SHUFFLE_INTERVAL,
					nodeInfo: {
						wsPort: nodePort,
						nethash:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.1',
						protocolVersion: '1.0.1',
						minVersion: '1.0.0',
						os: platform(),
						height: 0,
						broadhash:
							'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
						nonce: `O2wTkjqplHII${nodePort}`,
					},
				});
			},
		);
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(200);
	});

	after(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	it('should shuffle outbound peers in an interval', async () => {
		const p2pNode = p2pNodeList[0];
		const { outboundCount } = p2pNode['_peerPool'].getPeersCountPerKind();
		// Wait for periodic shuffling
		await wait(500);
		const { outboundCount: updatedOutbound } = p2pNode[
			'_peerPool'
		].getPeersCountPerKind();

		expect(updatedOutbound).to.equal(outboundCount - 1);
	});
});
