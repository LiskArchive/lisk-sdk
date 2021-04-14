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
import { P2P, events } from '../../../src/index';
import { wait } from '../../utils/helpers';
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

const { EVENT_NETWORK_READY } = events;
describe(`Event on ${EVENT_NETWORK_READY}`, () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		// To capture all the initial events set network creation time to minimum 1 ms
		p2pNodeList = await createNetwork({
			networkSize: 2,
			networkDiscoveryWaitTime: 1,
		});

		const secondNode = p2pNodeList[1];

		secondNode.on(EVENT_NETWORK_READY, () => {
			collectedEvents.set(EVENT_NETWORK_READY, true);
		});
		await wait(1000);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should fire ${EVENT_NETWORK_READY} event`, () => {
		expect(collectedEvents.get(EVENT_NETWORK_READY)).toBeDefined();
	});
});
