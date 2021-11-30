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
import { P2P, events, constants } from '../../../src/index';

import { wait } from '../../utils/helpers';
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

const SOCKET_HUNG_UP_CODE = 1006;
const { EVENT_CLOSE_INBOUND, EVENT_CLOSE_OUTBOUND } = events;
const { INTENTIONAL_DISCONNECT_CODE } = constants;

describe('Events on Connection Close', () => {
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

		firstNode.on(EVENT_CLOSE_INBOUND, msg => {
			collectedEvents.set('EVENT_CLOSE_INBOUND', msg);
		});

		secondNode.on(EVENT_CLOSE_OUTBOUND, msg => {
			collectedEvents.set('EVENT_CLOSE_OUTBOUND', msg);
		});

		await wait(1000);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should handle ${EVENT_CLOSE_INBOUND} event and transactions`, async () => {
		const secondNode = p2pNodeList[1];

		await secondNode.stop();
		await wait(300);

		const transactions = collectedEvents.get('EVENT_CLOSE_INBOUND');

		expect(transactions).toMatchObject({
			code: INTENTIONAL_DISCONNECT_CODE,
			peerInfo: {
				port: secondNode.config.port,
				sharedState: expect.any(Object),
			},
		});
	});

	it(`should handle ${EVENT_CLOSE_OUTBOUND} event and transactions`, async () => {
		const firstNode = p2pNodeList[0];

		await firstNode.stop();
		await wait(300);

		const transactions = collectedEvents.get('EVENT_CLOSE_OUTBOUND');

		expect(transactions).toMatchObject({
			code: SOCKET_HUNG_UP_CODE,
			peerInfo: {
				port: firstNode.config.port,
				sharedState: expect.any(Object),
			},
		});
	});
});
