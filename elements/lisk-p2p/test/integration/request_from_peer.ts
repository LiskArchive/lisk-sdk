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
import { platform } from 'os';

describe('P2P.requestFromPeer', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
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

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on('requestReceived', request => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					request,
				});
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
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
	});

	it('should send request to a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];

		const targetPeerPort = NETWORK_START_PORT + 4;
		const targetPeerId = `127.0.0.1:${targetPeerPort}`;

		await firstP2PNode.requestFromPeer(
			{
				procedure: 'proc',
				data: 123456,
			},
			targetPeerId,
		);

		expect(collectedMessages.length).to.equal(1);
		expect(collectedMessages[0]).to.have.property('request');
		expect(collectedMessages[0].request.procedure).to.equal('proc');
		expect(collectedMessages[0].request.data).to.equal(123456);
	});

	it('should receive response from a specific peer within the network', async () => {
		const firstP2PNode = p2pNodeList[0];

		const targetPeerPort = NETWORK_START_PORT + 2;
		const targetPeerId = `127.0.0.1:${targetPeerPort}`;

		const response = await firstP2PNode.requestFromPeer(
			{
				procedure: 'getGreeting',
				data: 'world',
			},
			targetPeerId,
		);

		expect(response).to.have.property('data');
		expect(response.data).to.equal(`Hello world from peer ${targetPeerPort}`);
	});
});
