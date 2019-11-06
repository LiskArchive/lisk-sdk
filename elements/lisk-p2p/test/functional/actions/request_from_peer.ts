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

describe('P2P.requestFromPeer', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];

		for (let p2p of p2pNodeList) {
			p2p.on('requestReceived', request => {
				if (request.procedure === 'foo') {
					collectedMessages.push({
						nodePort: p2p.nodeInfo.wsPort,
						request,
					});
				}

				if (request.procedure === 'getGreeting') {
					request.end(`Hello ${request.data} from peer ${p2p.nodeInfo.wsPort}`);
				} else {
					if (!request.wasResponseSent) {
						request.end(456);
					}
				}
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send request to a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];

		const targetPeer = firstP2PNode.getConnectedPeers()[1];

		await firstP2PNode.requestFromPeer(
			{
				procedure: 'foo',
				data: 123456,
			},
			`${targetPeer.ipAddress}:${targetPeer.wsPort}`,
		);

		expect(collectedMessages.length).to.equal(1);
		expect(collectedMessages[0]).to.have.property('request');
		expect(collectedMessages[0].request.procedure).to.equal('foo');
		expect(collectedMessages[0].request.data).to.equal(123456);
	});

	it('should receive response from a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];

		const targetPeer = firstP2PNode.getConnectedPeers()[1];

		const response = await firstP2PNode.requestFromPeer(
			{
				procedure: 'getGreeting',
				data: 'world',
			},
			`${targetPeer.ipAddress}:${targetPeer.wsPort}`,
		);

		expect(response).to.have.property('data');
		expect(response.data).to.equal(
			`Hello world from peer ${targetPeer.wsPort}`,
		);
	});
});
