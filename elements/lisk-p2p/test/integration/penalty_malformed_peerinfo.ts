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
import { P2P, EVENT_BAN_PEER } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

describe('Penalty sending malformed peerInfo', () => {
	let p2pNodeList: P2P[] = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 2 });

		p2pNodeList[1].on(EVENT_BAN_PEER, peerId => {
			collectedEvents.set(EVENT_BAN_PEER, peerId);
		});

		p2pNodeList[0].applyNodeInfo({
			os: platform(),
			nethash:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			version: p2pNodeList[0].nodeInfo.version,
			protocolVersion: '1.1',
			wsPort: p2pNodeList[0].nodeInfo.wsPort,
			height: 10,
			junk: '1.'.repeat(13000),
			options: p2pNodeList[0].nodeInfo.options,
		});

		await wait(200);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should fire ${EVENT_BAN_PEER} event`, async () => {
		expect(collectedEvents.get(EVENT_BAN_PEER)).to.be.equal('127.0.0.1:5000');
	});
});
