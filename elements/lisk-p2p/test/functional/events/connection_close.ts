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
	EVENT_CLOSE_INBOUND,
	EVENT_CLOSE_OUTBOUND,
	INTENTIONAL_DISCONNECT_CODE,
} from '../../../src/index';

import { wait } from '../../utils/helpers';
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

const SOCKET_HUNG_UP_CODE = 1006;

describe(`Events Connection Close`, () => {
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

		firstNode.on(EVENT_CLOSE_INBOUND, err => {
			collectedEvents.set('EVENT_CLOSE_INBOUND', err);
		});

		secondNode.on(EVENT_CLOSE_OUTBOUND, err => {
			collectedEvents.set('EVENT_CLOSE_OUTBOUND', err);
		});

		await wait(1000);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`Handle ${EVENT_CLOSE_INBOUND} event and error`, async () => {
		const secondNode = p2pNodeList[1];

		await secondNode.stop();
		await wait(300);

		const payload = collectedEvents.get('EVENT_CLOSE_INBOUND');

		expect(payload)
			.to.have.property('code')
			.which.equals(INTENTIONAL_DISCONNECT_CODE);
		expect(payload).to.have.property('peerInfo');
		expect(payload.peerInfo)
			.to.have.property('wsPort')
			.which.equals(secondNode.nodeInfo.wsPort);
		expect(payload.peerInfo)
			.to.have.property('nonce')
			.which.equals(secondNode.nodeInfo.nonce);
	});

	it(`Handle ${EVENT_CLOSE_OUTBOUND} event and error`, async () => {
		const firstNode = p2pNodeList[0];

		await firstNode.stop();
		await wait(300);

		const payload = collectedEvents.get('EVENT_CLOSE_OUTBOUND');

		expect(payload)
			.to.have.property('code')
			.which.equals(SOCKET_HUNG_UP_CODE);
		expect(payload).to.have.property('peerInfo');
		expect(payload.peerInfo)
			.to.have.property('wsPort')
			.which.equals(firstNode.nodeInfo.wsPort);
		expect(payload.peerInfo)
			.to.have.property('nonce')
			.which.equals(firstNode.nodeInfo.nonce);
	});
});
