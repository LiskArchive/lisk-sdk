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
import { P2P, EVENT_REQUEST_RECEIVED } from '../../../src/index';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_PEER_COUNT,
} from '../../utils/network_setup';

describe('P2P.request', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		for (let p2p of p2pNodeList) {
			// Collect port numbers to check which peer handled which request.
			p2p.on(EVENT_REQUEST_RECEIVED, request => {
				if (!request.wasResponseSent) {
					request.end({
						nodePort: p2p.nodeInfo.wsPort,
						requestProcedure: request.procedure,
						requestData: request.data,
						requestPeerId: request.peerId,
					});
				}
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should make request to the network; it should reach a single peer', async () => {
		const secondP2PNode = p2pNodeList[1];
		const response = await secondP2PNode.request({
			procedure: 'foo',
			data: 'bar',
		});
		expect(response).toMatchSnapshot();
	});

	// Check for even distribution of requests across the network. Account for an error margin.
	it('requests made to the network should be distributed randomly', async () => {
		const TOTAL_REQUESTS = 1000;
		const lastP2PNode = p2pNodeList[NETWORK_PEER_COUNT - 1];
		const { outboundCount } = lastP2PNode['_peerPool'].getPeersCountPerKind();
		const nodePortToResponsesMap: any = {};

		const expectedAverageRequestsPerNode = TOTAL_REQUESTS / outboundCount;
		const expectedRequestsLowerBound = expectedAverageRequestsPerNode * 0.5;
		const expectedRequestsUpperBound = expectedAverageRequestsPerNode * 1.5;

		for (let i = 0; i < TOTAL_REQUESTS; i++) {
			const response = await lastP2PNode.request({
				procedure: 'foo',
				data: i,
			});
			let resultData = response.data as any;
			if (!nodePortToResponsesMap[resultData.nodePort]) {
				nodePortToResponsesMap[resultData.nodePort] = [];
			}
			nodePortToResponsesMap[resultData.nodePort].push(resultData);
		}

		for (let requestsHandled of Object.values(nodePortToResponsesMap) as any) {
			expect(requestsHandled).toEqual(expect.any(Array));

			expect(requestsHandled.length).toBeGreaterThan(
				expectedRequestsLowerBound,
			);
			expect(requestsHandled.length).toBeLessThan(expectedRequestsUpperBound);
		}
	});
});
