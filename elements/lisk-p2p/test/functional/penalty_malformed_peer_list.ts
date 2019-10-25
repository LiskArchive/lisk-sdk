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
import { createNetwork, destroyNetwork } from '../utils/network_setup';
import { wait } from 'utils/helpers';

describe('Penalty malformed Peer List', () => {
	describe('When Peer List is too long', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
				customConfig: () => ({
					invalidPeerListPenalty: 101,
				}),
			});

			[...new Array(1001).keys()].map(index => {
				p2pNodeList[0]['_peerBook'].addPeer({
					peerId: `'1.1.1.1:${1 + index}`,
					ipAddress: '1.1.1.1',
					wsPort: 1000,
				});
			});

			p2pNodeList[1].on(EVENT_BAN_PEER, peerId => {
				collectedEvents.set(EVENT_BAN_PEER, peerId);
			});

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it(`should fire ${EVENT_BAN_PEER} event`, async () => {
			expect(collectedEvents.get(EVENT_BAN_PEER)).to.be.equal('127.0.0.1:5000');
		});
	});

	describe('When Peer List contain malformed peerInfo', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
				customConfig: () => ({
					invalidPeerListPenalty: 101,
				}),
			});

			p2pNodeList[0]['_peerBook'].addPeer({
				peerId: `'1.1.1.1:1000`,
				ipAddress: '1.1.1.1',
				wsPort: 1000,
				sharedState: {
					version: '1.1',
					protocolVersion: '1.'.repeat(10000),
				},
			});

			p2pNodeList[1].on(EVENT_BAN_PEER, peerId => {
				collectedEvents.set(EVENT_BAN_PEER, peerId);
			});

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it(`should fire ${EVENT_BAN_PEER} event`, async () => {
			expect(collectedEvents.get(EVENT_BAN_PEER)).to.be.equal('127.0.0.1:5000');
		});
	});
});
