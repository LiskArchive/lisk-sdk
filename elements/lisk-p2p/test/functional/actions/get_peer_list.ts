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
import { P2P } from '../../../src/index';
import { wait } from '../../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
} from '../../utils/network_setup';

describe('PeerPool actions', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	describe('getConnectedPeers', () => {
		const ALL_NODE_PORTS: ReadonlyArray<number> = [
			...new Array(NETWORK_PEER_COUNT).keys(),
		].map(index => NETWORK_START_PORT + index);

		beforeEach(async () => {
			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 1,
			});

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should discover all peers and add them to the connectedPeers list within each node', async () => {
			const firstNode = p2pNodeList[0];

			const peerPorts = firstNode
				.getConnectedPeers()
				.map(peerInfo => peerInfo.wsPort)
				.sort();

			// The current node should not be in its own peer list.
			const expectedPeerPorts = ALL_NODE_PORTS.filter(port => {
				return port !== firstNode.nodeInfo.wsPort;
			});

			expect(peerPorts).to.be.eql(expectedPeerPorts);
		});
	});

	describe('getUniqueOutboundConnectedPeers', () => {
		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					wsPort: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
				seedPeers: customSeedPeers(index, startPort, networkSize),
			});

			p2pNodeList = await createNetwork({
				networkSize: 3,
				networkDiscoveryWaitTime: 1,
				customConfig,
			});

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should discover all peers from unique IP address and give them back', async () => {
			const firstNode = p2pNodeList[0];

			const UniqueOutboundPeersIpAddress = firstNode
				.getUniqueOutboundConnectedPeers()
				.map(peer => peer.ipAddress);

			expect(UniqueOutboundPeersIpAddress).to.have.members([
				'127.0.0.11',
				'127.0.0.12',
			]);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});
	});

	describe('getDisconnectedPeers', () => {
		const LIMITED_CONNECTIONS = 3;
		const POPULATOR_INTERVAL_WITH_LIMIT = 50;

		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					ipAddress: '127.0.0.1',
					wsPort: startPort + ((index + 1) % networkSize),
				},
			];
			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				populatorInterlatencyProtectionRatio: 0,
				productivityProtectionRatio: 0,
				longevityProtectionRatio: 0,
				maxOutboundConnections: LIMITED_CONNECTIONS,
				maxInboundConnections: LIMITED_CONNECTIONS,
				populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
				seedPeers: customSeedPeers(index, startPort, networkSize),
			});

			p2pNodeList = await createNetwork({
				customConfig,
			});
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should have disjoint connected and disconnected peers', async () => {
			for (let p2p of p2pNodeList) {
				const connectedPeers = p2p.getConnectedPeers();
				const disconnectedPeers = p2p.getDisconnectedPeers();

				for (const connectedPeer of connectedPeers) {
					expect(disconnectedPeers).to.not.deep.include(connectedPeer);
				}
			}
		});
	});
});
