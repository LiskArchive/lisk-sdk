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
import { P2P, RequestFailError } from '../../src/index';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

describe('Unseeded network: Each node has an empty seedPeers list', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeEach(async () => {
		// Make sure that integration tests use real timers.
		p2pNodeList = await createNetwork();
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should set the isActive property to true for all nodes', async () => {
		for (let p2p of p2pNodeList) {
			expect(p2p).to.have.property('isActive', true);
		}
	});

	it('should throw an error when attempting to make a request', async () => {
		const firstP2PNode = p2pNodeList[0];
		const response = firstP2PNode.request({
			procedure: 'foo',
			data: 'bar',
		});

		return expect(response).to.eventually.be.rejectedWith(
			RequestFailError,
			'Request failed due to no peers found in peer selection',
		);
	});
});
