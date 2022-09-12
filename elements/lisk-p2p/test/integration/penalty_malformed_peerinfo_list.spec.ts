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
import { createNetwork, destroyNetwork, SEED_PEER_IP } from '../utils/network_setup';
import { wait } from '../utils/helpers';
import { constructPeerId } from '../../src/utils';

const { EVENT_BAN_PEER } = events;

describe('penalty sending malformed Peer List', () => {
	describe('When Peer List is too long', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			const customConfig = (index: number) => ({
				maxPeerDiscoveryResponseLength: index === 1 ? 10 : 100,
			});

			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
				customConfig,
			});

			for (let i = 0; i < 1000; i += 1) {
				const generatedIP = `${Math.floor(Math.random() * 254) + 1}.${
					Math.floor(Math.random() * 254) + 1
				}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;

				p2pNodeList[0]['_peerBook'].addPeer({
					peerId: `${generatedIP}:5000`,
					ipAddress: generatedIP,
					port: 1000,
					sharedState: {
						networkVersion: '1.1',
						chainID: Buffer.from('', 'hex'),
						nonce: '',
						options: {},
					},
				});
			}

			p2pNodeList[1].on(EVENT_BAN_PEER, peerId => {
				collectedEvents.set(EVENT_BAN_PEER, peerId);
			});

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should ban the emitter', () => {
			expect(collectedEvents.get(EVENT_BAN_PEER)).toEqual(
				constructPeerId(SEED_PEER_IP, p2pNodeList[0].config.port),
			);
		});
	});

	// No longer valid as no custom fields are allowed
	describe.skip('When PeerBook contain malformed peerInfo', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Map();

		beforeEach(async () => {
			p2pNodeList = await createNetwork({
				networkSize: 2,
				networkDiscoveryWaitTime: 1,
				customConfig: () => ({}),
			});

			p2pNodeList[0]['_peerBook'].addPeer({
				peerId: "'1.1.1.1:1000",
				ipAddress: '1.1.1.1',
				port: 1000,
				sharedState: {
					networkVersion: '1.'.repeat(13000),
					chainID: Buffer.from('', 'hex'),
					nonce: '',
					options: { networkVersion: '1.'.repeat(13000) },
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

		it('should ban the emitter', () => {
			expect(collectedEvents.get(EVENT_BAN_PEER)).toEqual(
				constructPeerId(SEED_PEER_IP, p2pNodeList[0].config.port),
			);
		});
	});
});
