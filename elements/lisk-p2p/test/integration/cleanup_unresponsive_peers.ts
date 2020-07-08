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
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork, DEFAULT_CONNECTION_TIMEOUT } from '../utils/network_setup';

describe('Cleanup unresponsive peers', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 4 });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should remove crashed nodes from network status of other nodes', async () => {
		// Arrange
		// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
		const peerPortsbeforePeerCrash = p2pNodeList[2]
			.getConnectedPeers()
			.map(peerInfo => peerInfo.port)
			.sort();

		// Act
		await p2pNodeList[0].stop();
		await p2pNodeList[1].stop();
		await wait(DEFAULT_CONNECTION_TIMEOUT);

		// Assert
		// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
		const peerPortsAfterPeerCrash = p2pNodeList[2]
			.getConnectedPeers()
			.map(peerInfo => peerInfo.port)
			.sort();

		const expectedPeerPortsAfterPeerCrash = peerPortsbeforePeerCrash.filter(port => {
			return port !== p2pNodeList[0].config.port && port !== p2pNodeList[1].config.port;
		});

		expect(peerPortsAfterPeerCrash).toEqual(expectedPeerPortsAfterPeerCrash);
	});
});
