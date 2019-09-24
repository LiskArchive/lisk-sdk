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
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
} from '../utils/network_setup';

describe('Limited number of outbound/inbound connections', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const LIMITED_CONNECTIONS = 3;

	const ALL_NODE_PORTS_WITH_LIMIT: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);
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
			val: POPULATOR_INTERVAL_WITH_LIMIT,
			seedPeers: customSeedPeers(index, startPort, networkSize),
		});

		p2pNodeList = await createNetwork({
			customConfig,
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should not create more than ${LIMITED_CONNECTIONS} outbound connections`, async () => {
		for (let p2p of p2pNodeList) {
			const { outboundCount } = (p2p as any)._peerPool.getPeersCountPerKind();
			expect(outboundCount).to.be.at.most(LIMITED_CONNECTIONS);
		}
	});

	it(`should not create more than ${LIMITED_CONNECTIONS} inbound connections`, async () => {
		for (let p2p of p2pNodeList) {
			const { inboundCount } = (p2p as any)._peerPool.getPeersCountPerKind();
			expect(inboundCount).to.be.at.most(LIMITED_CONNECTIONS);
		}
	});

	it('should discover peers and add them to the peer lists within each node', async () => {
		for (let p2p of p2pNodeList) {
			const allPeers = p2p['_peerBook'].getAllPeers();
			const peerPorts = allPeers.map(peerInfo => peerInfo.wsPort);

			expect(ALL_NODE_PORTS_WITH_LIMIT).to.include.members(peerPorts);
		}
	});

	it('should have connected and disconnected peers', async () => {
		for (let p2p of p2pNodeList) {
			const connectedPeers = p2p.getConnectedPeers();

			expect(connectedPeers).is.not.empty;
		}
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
