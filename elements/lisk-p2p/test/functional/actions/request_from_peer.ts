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
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

describe('P2P.requestFromPeer', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];

		for (const p2p of p2pNodeList) {
			// eslint-disable-next-line no-loop-func
			p2p.on('EVENT_REQUEST_RECEIVED', request => {
				if (request.procedure === 'foo') {
					collectedMessages.push({
						nodePort: p2p.config.port,
						request,
					});
				}

				if (request.procedure === 'getGreeting') {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					request.end(`Hello ${request.data} from peer ${p2p.config.port}`);
				} else if (!request.wasResponseSent) {
					request.end(456);
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
			`${targetPeer.ipAddress}:${targetPeer.port}`,
		);

		expect(collectedMessages).toHaveLength(1);
		expect(collectedMessages[0]).toHaveProperty('request');
		expect(collectedMessages[0].request.procedure).toBe('foo');
		expect(collectedMessages[0].request.data).toEqual(Buffer.from('123456', 'utf8'));
	});

	it('should receive response from a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];

		const targetPeer = firstP2PNode.getConnectedPeers()[1];

		const response = await firstP2PNode.requestFromPeer(
			{
				procedure: 'getGreeting',
				data: 'world',
			},
			`${targetPeer.ipAddress}:${targetPeer.port}`,
		);
		const expectData = Buffer.from(
			JSON.stringify(`Hello "world" from peer ${targetPeer.port}`),
			'utf8',
		);

		expect(response).toHaveProperty('data');
		expect(response.data).toEqual(expectData);
	});
});
