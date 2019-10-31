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
import { createNetwork, destroyNetwork } from 'utils/network_setup';
import { constructPeerId } from '../../../src/utils';

describe('P2P.sendToPeer', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 2 });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send message to a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];

		const targetPeer = firstP2PNode.getConnectedPeers()[0];

		firstP2PNode.sendToPeer(
			{
				event: 'foo',
				data: 123,
			},
			constructPeerId(targetPeer.ipAddress, targetPeer.wsPort),
		);

		p2pNodeList[1].on('messageReceived', msg => {
			expect(msg)
				.to.have.property('peerId')
				.which.is.equal(
					constructPeerId(
						firstP2PNode.config.hostIp as string,
						firstP2PNode.nodeInfo.wsPort,
					),
				);
			expect(msg)
				.to.have.property('event')
				.which.is.equal('foo');
			expect(msg)
				.to.have.property('data')
				.which.is.equal(123);
		});
	});
});
