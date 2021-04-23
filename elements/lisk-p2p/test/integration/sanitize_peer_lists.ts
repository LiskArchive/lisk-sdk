/*
 * Copyright © 2021 Lisk Foundation
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

import { isIPV4 } from '@liskhq/lisk-validator';
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

describe('Sanitize peer lists on load', () => {
	const initPeerInfoList = (qty: number) => {
		const peerInfos: any[] = [];
		for (let i = 1; i <= qty; i += 1) {
			peerInfos.push({
				peerId: `200:db8:85a3:8d3:1319:8a2e:370:7348:${5000 + (i % 40000)}`,
				ipAddress: '200:db8:85a3:8d3:1319:8a2e:370:7348',
				port: 5000 + (i % 40000),
			});
		}

		return peerInfos;
	};

	describe('Address validation', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];

		beforeAll(async () => {
			// To capture all the initial events set network creation time to minimum 1 ms
			const customConfig = () => ({
				rateCalculationInterval: 100,
				previousPeers: initPeerInfoList(200),
			});

			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 0,
				customConfig,
				networkSize: 4,
			});

			await Promise.all(p2pNodeList.map(async p2p => p2p.start()));

			await wait(1000);
		});

		afterAll(async () => {
			await destroyNetwork(p2pNodeList);
			await wait(200);
		});

		it('should not contain invalid addresses in any of its peer list', () => {
			for (const p2p of p2pNodeList) {
				const { allPeers } = p2p['_peerBook'];

				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				const allPeerAddresses = allPeers.map(peerInfo => peerInfo.ipAddress).sort();
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				const connectedPeerAddresses = p2p
					.getConnectedPeers()
					.map(peerInfo => peerInfo.ipAddress)
					.sort();

				expect(
					[...allPeerAddresses, ...connectedPeerAddresses].filter(ipAddress => !isIPV4(ipAddress)),
				).toHaveLength(0);
			}
		});
	});
});
