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

describe('penalty sending malformed Peer List', () => {
	describe('When Peer List is too long', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			const customConfig = (index: number) => ({
				peerDiscoveryResponseLength: index === 0 ? 10 : 100,
				maxPeerDiscoveryResponseLength: index === 1 ? 10 : 100,
			});

			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
				customConfig,
			});

			[...new Array(1000).keys()].map(() => {
				const generatedIP = `${Math.floor(Math.random() * 254) +
					1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(
					Math.random() * 254,
				) + 1}.${Math.floor(Math.random() * 254) + 1}`;

				p2pNodeList[0]['_peerBook'].addPeer({
					peerId: `${generatedIP}:5000`,
					ipAddress: generatedIP,
					wsPort: 1000,
					sharedState: {
						height: 0,
						protocolVersion: '1.1',
						version: '1.1',
					},
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

		it(`should not send malformed peerInfo`, async () => {
			expect(collectedEvents).to.be.empty;
		});
	});

	describe('When PeerBook contain malformed peerInfo', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
			});

			p2pNodeList[0]['_peerBook'].addPeer({
				peerId: `'1.1.1.1:1000`,
				ipAddress: '1.1.1.1',
				wsPort: 1000,
				sharedState: {
					version: '1.1',
					protocolVersion: '1.'.repeat(13000),
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

		it(`should not send malformed peerInfo`, async () => {
			expect(collectedEvents).to.be.empty;
		});
	});
});
