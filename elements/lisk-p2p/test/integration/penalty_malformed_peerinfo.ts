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
import { platform } from 'os';
import { P2P, events } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

const { EVENT_BAN_PEER } = events;

const customNodeInfoSchema = {
	$id: '/nodeInfo',
	type: 'object',
	properties: {
		networkId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		protocolVersion: {
			dataType: 'string',
			fieldNumber: 2,
		},
		wsPort: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		nonce: {
			dataType: 'string',
			fieldNumber: 4,
		},
		advertiseAddress: {
			dataType: 'boolean',
			fieldNumber: 5,
		},
		os: {
			dataType: 'string',
			fieldNumber: 6,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
		invalid: {
			dataType: 'string',
			fieldNumber: 8,
		},
	},
	required: ['networkId', 'protocolVersion', 'wsPort', 'nonce'],
};

const customPeerInfoSchema = {
	$id: '/peerInfo',
	type: 'object',
	properties: {
		ipAddress: {
			dataType: 'string',
			fieldNumber: 1,
		},
		wsPort: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		networkId: {
			dataType: 'string',
			fieldNumber: 3,
		},
		protocolVersion: {
			dataType: 'string',
			fieldNumber: 4,
		},
		nonce: {
			dataType: 'string',
			fieldNumber: 5,
		},
		os: {
			dataType: 'string',
			fieldNumber: 6,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
		invalid: {
			dataType: 'string',
			fieldNumber: 8,
		},
	},
	required: ['ipAddress', 'wsPort'],
};

describe('penalty sending malformed peerInfo', () => {
	let p2pNodeList: P2P[] = [];
	const collectedEvents = new Map();
	const customSchema = {
		peerInfo: customPeerInfoSchema,
		nodeInfo: customNodeInfoSchema,
	};

	beforeEach(async () => {
		p2pNodeList = await createNetwork({
			networkSize: 2,
			customConfig: (index: number) =>
				index === 0
					? { maxPeerInfoSize: 30248, customSchema }
					: { customSchema },
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
			invalid: '1.'.repeat(13000),
			advertiseAddress: true,
		});

		await wait(100);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it(`should fire EVENT_BAN_PEER event`, () => {
		expect(collectedEvents.get(EVENT_BAN_PEER)).toBe('127.0.0.1:5000');
	});
});
