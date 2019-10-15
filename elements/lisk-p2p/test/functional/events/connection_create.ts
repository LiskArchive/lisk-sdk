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
	EVENT_CONNECT_OUTBOUND,
	EVENT_NEW_INBOUND_PEER,
	EVENT_DISCOVERED_PEER,
	EVENT_UPDATED_PEER_INFO,
} from '../../../src/index';
import { wait } from '../../utils/helpers';
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

describe(`Events Connections Create`, () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		// To capture all the initial events set network creation time to minimum 1 ms
		p2pNodeList = await createNetwork({
			networkSize: 2,
			networkDiscoveryWaitTime: 1,
		});
		const firstNode = p2pNodeList[0];
		const secondNode = p2pNodeList[1];

		firstNode.on(EVENT_NEW_INBOUND_PEER, res => {
			collectedEvents.set('EVENT_NEW_INBOUND_PEER', res);
		});

		secondNode.on(EVENT_CONNECT_OUTBOUND, res => {
			collectedEvents.set('EVENT_CONNECT_OUTBOUND', res);
		});
		secondNode.on(EVENT_DISCOVERED_PEER, res => {
			collectedEvents.set('EVENT_DISCOVERED_PEER', res);
		});

		secondNode.on(EVENT_UPDATED_PEER_INFO, res => {
			collectedEvents.set('EVENT_UPDATED_PEER_INFO', res);
		});

		await wait(1000);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`Handle ${EVENT_NEW_INBOUND_PEER} event and payload`, async () => {
		const secondNode = p2pNodeList[1];
		const payload = collectedEvents.get('EVENT_NEW_INBOUND_PEER');

		expect(payload)
			.to.have.property('wsPort')
			.which.equals(secondNode.nodeInfo.wsPort);
		expect(payload)
			.to.have.property('nonce')
			.which.equals(secondNode.nodeInfo.nonce);
	});

	it(`Handle ${EVENT_CONNECT_OUTBOUND} event and payload`, async () => {
		const firstNode = p2pNodeList[0];
		const payload = collectedEvents.get('EVENT_CONNECT_OUTBOUND');

		expect(payload)
			.to.have.property('wsPort')
			.which.equals(firstNode.nodeInfo.wsPort);
		expect(payload)
			.to.have.property('nonce')
			.which.equals(firstNode.nodeInfo.nonce);
	});

	it(`Handle ${EVENT_UPDATED_PEER_INFO} event and payload`, async () => {
		const firstNode = p2pNodeList[0];
		const payload = collectedEvents.get('EVENT_UPDATED_PEER_INFO');

		expect(payload)
			.to.have.property('wsPort')
			.which.equals(firstNode.nodeInfo.wsPort);
		expect(payload)
			.to.have.property('nonce')
			.which.equals(firstNode.nodeInfo.nonce);

		expect(collectedEvents.get('EVENT_UPDATED_PEER_INFO')).to.exist;
	});

	it(`Handle ${EVENT_DISCOVERED_PEER} event and payload`, async () => {
		const secondNode = p2pNodeList[1];
		const payload = collectedEvents.get('EVENT_DISCOVERED_PEER');

		expect(payload)
			.to.have.property('wsPort')
			.which.equals(secondNode.nodeInfo.wsPort);
		expect(payload)
			.to.have.property('nonce')
			.which.equals(secondNode.nodeInfo.nonce);
	});
});
