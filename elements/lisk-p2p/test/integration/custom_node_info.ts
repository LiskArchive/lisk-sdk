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
import { createNetwork, destroyNetwork } from './setup';

describe('Custom nodeInfo', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		const customModules = () => ({
			modules: {
				names: ['test', 'crypto'],
				active: true,
			},
		});

		p2pNodeList = await createNetwork({ customNodeInfo: customModules });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should have tried peers with custom test field "modules" that was passed as nodeinfo', async () => {
		for (let p2p of p2pNodeList) {
			const triedPeers = p2p['_peerBook'].triedPeers;
			const newPeers = p2p['_peerBook'].newPeers;

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
