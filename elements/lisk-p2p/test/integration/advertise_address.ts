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
	POPULATOR_INTERVAL,
	nodeInfoConstants,
} from '../utils/network_setup';
import { wait } from '../utils/helpers';

const p2pConfig = (wsPort: number, advertiseAddress: boolean = true) => ({
	connectTimeout: 100,
	ackTimeout: 200,
	seedPeers: [
		{
			ipAddress: '127.0.0.1',
			wsPort: 5003,
		},
	],
	wsEngine: 'ws',
	maxOutboundConnections: 10,
	maxInboundConnections: 10,
	nodeInfo: {
		...nodeInfoConstants,
		wsPort,
		advertiseAddress,
	},
});

describe('Advertise Address', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		const customConfig = () => ({
			advertiseAddress: true,
			populatorInterval: POPULATOR_INTERVAL,
		});

		p2pNodeList = await createNetwork({ customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should advertise address in network when enabled', async () => {
		const advertisePeerPort = 5998;
		const p2pNode = new P2P(p2pConfig(advertisePeerPort));
		await p2pNode.start();
		await wait(100);

		for (let p2p of p2pNodeList) {
			const connectedPeers = p2p
				.getConnectedPeers()
				.filter(p => p.wsPort === p2pNode.nodeInfo.wsPort);

			expect(connectedPeers[0].wsPort).to.be.eql(advertisePeerPort);
		}
		await p2pNode.stop();
	});

	it('should not advertise address in network when disabled', async () => {
		const p2pNode = new P2P(p2pConfig(5999, false));
		await p2pNode.start();
		await wait(100);

		for (let p2p of p2pNodeList) {
			const connectedPeers = p2p
				.getConnectedPeers()
				.filter(p => p.wsPort === p2pNode.nodeInfo.wsPort);
			const disConnectedPeers = p2p
				.getDisconnectedPeers()
				.filter(p => p.wsPort === p2pNode.nodeInfo.wsPort);
			expect(connectedPeers).to.be.empty;
			expect(disConnectedPeers).to.be.empty;
		}

		await p2pNode.stop();
	});
});
