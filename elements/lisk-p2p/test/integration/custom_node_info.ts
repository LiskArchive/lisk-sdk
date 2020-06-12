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
import { P2P } from '../../src/index';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

// TODO: Skipping as strict schema doesn't allow custom fields. Enable this test when users will be allowed to pass custom schema.
describe.skip('Custom nodeInfo', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		const customConfig = () => ({
			nodeInfo: {
				modules: {
					names: ['test', 'crypto'],
					active: true,
				},
			},
		});

		p2pNodeList = await createNetwork({ customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should have tried peers with custom test field "modules" that was passed as nodeinfo', () => {
		for (const p2p of p2pNodeList) {
			const { triedPeers } = (p2p as any)._peerBook;
			const { newPeers } = (p2p as any)._peerBook;
			for (const peer of triedPeers) {
				expect(peer).toMatchObject({
					sharedState: {
						modules: { names: expect.any(Array), active: expect.any(Boolean) },
					},
				});
			}
			for (const peer of newPeers) {
				if (peer.modules) {
					expect(peer).toMatchObject({
						sharedState: {
							modules: {
								names: expect.any(Array),
								active: expect.any(Boolean),
							},
						},
					});
				}
			}
			for (const peer of p2p.getConnectedPeers()) {
				expect(peer).toMatchObject({
					modules: { names: expect.any(Array), active: expect.any(Boolean) },
				});
			}
		}
	});
});
