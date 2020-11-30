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
import { P2P } from '../../../src/index';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
} from '../../utils/network_setup';
import { wait } from '../../utils/helpers';

describe('PeerPool actions', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	describe('getConnectedPeers', () => {
		const ALL_NODE_PORTS: ReadonlyArray<number> = [...new Array(NETWORK_PEER_COUNT).keys()].map(
			index => NETWORK_START_PORT + index,
		);

		beforeEach(async () => {
			p2pNodeList = await createNetwork();
			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should discover all peers and add them to the connectedPeers list within each node', () => {
			const firstNode = p2pNodeList[0];
			// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
			const peerPorts = firstNode
				.getConnectedPeers()
				.map(peerInfo => peerInfo.port)
				.sort();

			// The current node should not be in its own peer list.
			const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
				return port !== firstNode.config.port;
			});

			expect(peerPorts).toEqual(expectedPeerPorts);
		});
	});

	describe('getDisconnectedPeers', () => {
		const LIMITED_CONNECTIONS = 3;

		beforeEach(async () => {
			const customSeedPeers = (index: number, startPort: number, networkSize: number) => [
				{
					ipAddress: '127.0.0.1',
					port: startPort + ((index + 1) % networkSize),
				},
			];
			const customConfig = (index: number, startPort: number, networkSize: number) => ({
				populatorInterlatencyProtectionRatio: 0,
				productivityProtectionRatio: 0,
				longevityProtectionRatio: 0,
				maxOutboundConnections: LIMITED_CONNECTIONS,
				maxInboundConnections: LIMITED_CONNECTIONS,
				seedPeers: customSeedPeers(index, startPort, networkSize),
			});

			p2pNodeList = await createNetwork({
				customConfig,
			});
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should have disjoint connected and disconnected peers', () => {
			for (const p2p of p2pNodeList) {
				const connectedPeers = p2p.getConnectedPeers();
				const disconnectedPeers = p2p.getDisconnectedPeers();

				for (const connectedPeer of connectedPeers) {
					expect(disconnectedPeers).toEqual(expect.not.arrayContaining([connectedPeer]));
				}
			}
		});
	});
});
