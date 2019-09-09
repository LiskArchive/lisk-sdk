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
import { P2P, EVENT_REQUEST_RECEIVED } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';

describe('P2P.request', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;

	before(async () => {
		sandbox.restore();
	});

	beforeEach(async () => {
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
			// Each node will have the previous node in the sequence as a seed peer except the first node.
			const seedPeers =
				index === 0
					? []
					: [
							{
								ipAddress: '127.0.0.1',
								wsPort: NETWORK_START_PORT + index - 1,
							},
					  ];

			const nodePort = NETWORK_START_PORT + index;
			return new P2P({
				connectTimeout: 100,
				ackTimeout: 200,
				rateCalculationInterval: 10000,
				seedPeers,
				wsEngine: 'ws',
				populatorInterval: POPULATOR_INTERVAL,
				maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
				maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
				nodeInfo: {
					wsPort: nodePort,
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: '1.0.1',
					protocolVersion: '1.1',
					minVersion: '1.0.0',
					os: platform(),
					height: 0,
					broadhash:
						'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
					nonce: `O2wTkjqplHII${nodePort}`,
				},
			});
		});
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));

		await wait(1000);

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
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	it('should make request to the network; it should reach a single peer', async () => {
		const secondP2PNode = p2pNodeList[1];
		const response = await secondP2PNode.request({
			procedure: 'foo',
			data: 'bar',
		});
		expect(response).to.have.property('data');
		expect(response.data)
			.to.have.property('nodePort')
			.which.is.a('number');
		expect(response.data)
			.to.have.property('requestProcedure')
			.which.is.a('string');
		expect(response.data)
			.to.have.property('requestData')
			.which.is.equal('bar');
		expect(response.data)
			.to.have.property('requestPeerId')
			.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
	});

	// Check for even distribution of requests across the network. Account for an error margin.
	// TODO: Skipping this test as of now because we are removing duplicate IPs so this scenario will not work locally
	it.skip('requests made to the network should be distributed randomly', async () => {
		const TOTAL_REQUESTS = 1000;
		const firstP2PNode = p2pNodeList[0];
		const nodePortToResponsesMap: any = {};

		const expectedAverageRequestsPerNode = TOTAL_REQUESTS / NETWORK_PEER_COUNT;
		const expectedRequestsLowerBound = expectedAverageRequestsPerNode * 0.5;
		const expectedRequestsUpperBound = expectedAverageRequestsPerNode * 1.5;

		for (let i = 0; i < TOTAL_REQUESTS; i++) {
			const response = await firstP2PNode.request({
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
			expect(requestsHandled).to.be.an('array');
			expect(requestsHandled.length).to.be.greaterThan(
				expectedRequestsLowerBound,
			);
			expect(requestsHandled.length).to.be.lessThan(expectedRequestsUpperBound);
		}
	});
});
