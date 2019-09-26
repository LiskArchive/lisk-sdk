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
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
} from 'utils/network_setup';

describe('P2P.sendToPeer', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on('messageReceived', message => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					message,
				});
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send message to a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];
		const targetPeerPort = NETWORK_START_PORT + 3;
		const targetPeerId = `127.0.0.1:${targetPeerPort}`;

		firstP2PNode.sendToPeer(
			{
				event: 'foo',
				data: 123,
			},
			targetPeerId,
		);

		await wait(100);

		expect(collectedMessages.length).to.equal(1);
		expect(collectedMessages[0])
			.to.have.property('nodePort')
			.which.is.equal(targetPeerPort);
		expect(collectedMessages[0]).to.have.property('message');
		expect(collectedMessages[0].message)
			.to.have.property('event')
			.which.is.equal('foo');
		expect(collectedMessages[0].message)
			.to.have.property('data')
			.which.is.equal(123);
	});
});
