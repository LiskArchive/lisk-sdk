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
import { createNetwork, destroyNetwork } from '../utils/network_setup';
import { P2PConfig } from '../../src/types';

const { EVENT_BAN_PEER } = events;

const customNodeInfoSchema = {
	$id: '/malformed',
	type: 'object',
	properties: {
		invalid: {
			dataType: 'string',
			fieldNumber: 1,
		},
	},
};

describe('penalty sending malformed peerInfo', () => {
	let p2pNodeList: P2P[] = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		p2pNodeList = await createNetwork({
			networkSize: 2,
			customConfig: (index: number): Partial<P2PConfig> =>
				index === 0 ? { maxPeerInfoSize: 30248, customNodeInfoSchema } : { customNodeInfoSchema },
			initNodeInfo: {
				invalid: '',
			},
		});

		p2pNodeList[1].on(EVENT_BAN_PEER, peerId => {
			collectedEvents.set(EVENT_BAN_PEER, peerId);
		});

		p2pNodeList[0].applyNodeInfo({
			chainID: Buffer.from('10000000', 'hex'),
			networkVersion: '1.1',
			options: { invalid: '1.'.repeat(13000) },
			advertiseAddress: true,
		});

		await wait(100);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should fire EVENT_BAN_PEER event', () => {
		expect(collectedEvents.get(EVENT_BAN_PEER)).toBe('127.0.0.1:5000');
	});
});
