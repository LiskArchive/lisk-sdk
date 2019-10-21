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
import {
	P2P,
	EVENT_REQUEST_RECEIVED,
	EVENT_INVALID_REQUEST_RECEIVED,
} from '../../../src/index';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

const REQ_PROCEDURE = 'foo';
const REQ_DATA = 'bar';

describe('Request', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 2 });

		const firstP2PNode = p2pNodeList[0];
		const secondP2PNode = p2pNodeList[1];

		firstP2PNode.on(EVENT_REQUEST_RECEIVED, request => {
			if (!request.wasResponseSent) {
				request.end({
					nodePort: firstP2PNode.nodeInfo.wsPort,
					requestProcedure: request.procedure,
					requestData: request.data,
					requestPeerId: request.peerId,
				});
			}
		});

		firstP2PNode.on(EVENT_INVALID_REQUEST_RECEIVED, req => {
			console.log('Listener 1:', req);
			collectedEvents.set(EVENT_INVALID_REQUEST_RECEIVED, req);
		});

		secondP2PNode.on(EVENT_INVALID_REQUEST_RECEIVED, req => {
			console.log('Listener 2:', req);
			collectedEvents.set(EVENT_INVALID_REQUEST_RECEIVED + 2, req);
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should make request to the network; it should reach atleast a single peer and be responsed', async () => {
		const firstP2PNode = p2pNodeList[0];
		const secondP2PNode = p2pNodeList[1];

		const response = await secondP2PNode.request({
			procedure: REQ_PROCEDURE,
			data: REQ_DATA,
		});

		expect(response).to.have.property('data');
		expect(response.data)
			.to.have.property('nodePort')
			.which.is.equal(firstP2PNode.nodeInfo.wsPort);
		expect(response.data)
			.to.have.property('requestProcedure')
			.which.is.equal(REQ_PROCEDURE);
		expect(response.data)
			.to.have.property('requestData')
			.which.is.equal(REQ_DATA);
		expect(response.data)
			.to.have.property('requestPeerId')
			.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
	});

	it('should make request to a given peer and be responsed', async () => {
		const firstP2PNode = p2pNodeList[0];
		const secondP2PNode = p2pNodeList[1];

		const FirstPeer = secondP2PNode.getConnectedPeers()[0];
		const PeerId = `${FirstPeer.ipAddress}:${FirstPeer.wsPort}`;

		const response = await secondP2PNode.requestFromPeer(
			{
				procedure: REQ_PROCEDURE,
				data: REQ_DATA,
			},
			PeerId,
		);

		expect(response).to.have.property('data');
		expect(response.data)
			.to.have.property('nodePort')
			.which.is.equal(firstP2PNode.nodeInfo.wsPort);
		expect(response.data)
			.to.have.property('requestProcedure')
			.which.is.equal(REQ_PROCEDURE);
		expect(response.data)
			.to.have.property('requestData')
			.which.is.equal(REQ_DATA);
		expect(response.data)
			.to.have.property('requestPeerId')
			.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
	});
});
