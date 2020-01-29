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
import { P2P, events } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

const { EVENT_BAN_PEER } = events;

describe('penalty sending malformed peerInfo', () => {
	let p2pNodeList: P2P[] = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		p2pNodeList = await createNetwork({
			networkSize: 2,
			customConfig: (index: number) =>
				index === 0 ? { maxPeerInfoSize: 30248 } : {},
		});

		p2pNodeList[1].on(EVENT_BAN_PEER, peerId => {
			collectedEvents.set(EVENT_BAN_PEER, peerId);
		});

		p2pNodeList[0].applyNodeInfo({
			os: platform(),
			networkId:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			version: p2pNodeList[0].nodeInfo.version,
			protocolVersion: '1.1',
			wsPort: p2pNodeList[0].nodeInfo.wsPort,
			height: 10,
			nonce: 'nonce',
			invalidData: '1.'.repeat(13000),
			options: p2pNodeList[0].nodeInfo.options,
			advertiseAddress: true,
		});

		await wait(100);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should fire ${EVENT_BAN_PEER} event`, async () => {
		expect(collectedEvents.get(EVENT_BAN_PEER)).toBe('127.0.0.1:5000');
	});
});
