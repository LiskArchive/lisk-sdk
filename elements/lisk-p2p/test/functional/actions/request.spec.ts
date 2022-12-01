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
import { DEFAULT_MESSAGE_ENCODING_FORMAT } from '../../../src/constants';
import { P2P, events } from '../../../src/index';
import { createNetwork, destroyNetwork, NETWORK_PEER_COUNT } from '../../utils/network_setup';

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('P2P.request', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeAll(async () => {
		p2pNodeList = await createNetwork();

		for (const p2p of p2pNodeList) {
			// Collect port numbers to check which peer handled which request.
			p2p.on(events.EVENT_REQUEST_RECEIVED, request => {
				if (!request.wasResponseSent) {
					request.end({
						nodePort: p2p.config.port,
						requestProcedure: request.procedure,
						requestData: request.data.toString(DEFAULT_MESSAGE_ENCODING_FORMAT),
						requestPeerId: request.peerId,
					});
				}
			});
		}
	});

	afterAll(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should make request to the network; it should reach a single peer', async () => {
		// Arrange
		const secondP2PNode = p2pNodeList[1];
		const data = Buffer.from('bar');

		// Act
		const response = await secondP2PNode.request({
			procedure: 'foo',
			data,
		});
		const parsedData = JSON.parse((response.data as Buffer).toString('utf8'));

		// Assert
		expect(response.data).toBeInstanceOf(Buffer);
		expect(response.peerId).toBe('127.0.0.1:5001');
		expect(parsedData).toMatchObject({
			nodePort: 5000,
			requestData: data.toString(DEFAULT_MESSAGE_ENCODING_FORMAT),
			requestPeerId: '127.0.0.1:5001',
			requestProcedure: 'foo',
		});
	});

	// Check for even distribution of requests across the network. Account for an error margin.
	it('requests made to the network should be distributed randomly', async () => {
		// Arrange
		const TOTAL_REQUESTS = 1000;
		const lastP2PNode = p2pNodeList[NETWORK_PEER_COUNT - 1];
		const { outboundCount } = lastP2PNode['_peerPool'].getPeersCountPerKind();
		const nodePortToResponsesMap: any = {};

		const expectedAverageRequestsPerNode = TOTAL_REQUESTS / outboundCount;
		const expectedRequestsLowerBound = expectedAverageRequestsPerNode * 0.5;
		const expectedRequestsUpperBound = expectedAverageRequestsPerNode * 1.5;

		// Act
		for (let i = 0; i < TOTAL_REQUESTS; i += 1) {
			const response = await lastP2PNode.request({
				procedure: 'foo',
				data: i,
			});
			const parsedData = JSON.parse((response.data as Buffer).toString('utf8'));
			if (!nodePortToResponsesMap[parsedData.nodePort]) {
				nodePortToResponsesMap[parsedData.nodePort] = [];
			}
			nodePortToResponsesMap[parsedData.nodePort].push(parsedData);
		}

		// Assert
		for (const requestsHandled of Object.values(nodePortToResponsesMap) as any) {
			expect(requestsHandled).toEqual(expect.any(Array));

			expect(requestsHandled.length).toBeGreaterThan(expectedRequestsLowerBound);
			expect(requestsHandled.length).toBeLessThan(expectedRequestsUpperBound);
		}
	});
});
