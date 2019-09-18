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

describe('Custom nodeInfo', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 15;
	const POPULATOR_INTERVAL = 50;

	before(async () => {
		sandbox.restore();
	});

	beforeEach(async () => {
		p2pNodeList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
			// Each node will have the previous node in the sequence as a seed peer except the first node.
			const seedPeers =
				index === 0
					? []
					: [
							{
								ipAddress: '127.0.0.1',
								wsPort: NETWORK_START_PORT + index - 1,
							},
					  ];

			const nodePort = NETWORK_START_PORT + index;

			return new P2P({
				seedPeers,
				wsEngine: 'ws',
				// A short connectTimeout and ackTimeout will make the node to give up on discovery quicker for our test.
				connectTimeout: 100,
				ackTimeout: 200,
				populatorInterval: POPULATOR_INTERVAL,
				maxOutboundConnections: 5,
				maxInboundConnections: 5,
				nodeInfo: {
					wsPort: nodePort,
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: '1.0.1',
					protocolVersion: '1.1',
					minVersion: '1.0.0',
					os: platform(),
					height: 0,
					broadhash:
						'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
					nonce: `O2wTkjqplHII${nodePort}`,
					modules: {
						names: ['test', 'crypto'],
						active: true,
					},
				},
			});
		});
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(1000);
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	it('should have tried peers with custom test field "modules" that was passed as nodeinfo', () => {
		for (let p2p of p2pNodeList) {
			const triedPeers = (p2p as any)._peerBook.triedPeers;
			const newPeers = (p2p as any)._peerBook.newPeers;

			for (let peer of triedPeers) {
				expect(peer)
					.has.property('modules')
					.has.property('names')
					.is.an('array');

				expect(peer)
					.has.property('modules')
					.has.property('active')
					.is.a('boolean');
			}

			for (let peer of newPeers) {
				if (peer.modules) {
					expect(peer)
						.has.property('modules')
						.has.property('names')
						.is.an('array');

					expect(peer)
						.has.property('modules')
						.has.property('active')
						.is.a('boolean');
				}
			}

			for (let peer of p2p.getConnectedPeers()) {
				expect(peer)
					.has.property('modules')
					.has.property('names')
					.is.an('array');

				expect(peer)
					.has.property('modules')
					.has.property('active')
					.is.a('boolean');
			}
		}
	});
});
