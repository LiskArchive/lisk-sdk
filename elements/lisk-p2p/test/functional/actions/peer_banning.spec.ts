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
import { wait } from '../../utils/helpers';
import { createNetwork, destroyNetwork, SEED_PEER_IP } from '../../utils/network_setup';
import { P2P, events, p2pTypes } from '../../../src/index';
import { P2PConfig } from '../../../src/types';

const { EVENT_BAN_PEER, EVENT_CLOSE_INBOUND } = events;

describe('Peer banning mechanism', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();
	const PEER_BAN_TIME = 100;

	beforeEach(async () => {
		const customConfig = (index: number): Partial<P2PConfig> => ({
			peerBanTime: PEER_BAN_TIME,
			fixedPeers:
				index === 1
					? [
							{
								ipAddress: SEED_PEER_IP,
								port: 5001,
							},
					  ]
					: [],
		});
		p2pNodeList = await createNetwork({ customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	describe('when penalty is under 100', () => {
		it('should not ban any peer', () => {
			const firstP2PNode = p2pNodeList[0];
			const badPeer = firstP2PNode.getConnectedPeers()[1];
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.port}`,
				penalty: 10,
			};
			firstP2PNode.applyPenalty(peerPenalty);
			const updatedConnectedPeers = firstP2PNode.getConnectedPeers();
			expect(updatedConnectedPeers.map(peer => peer.port)).toEqual(
				expect.arrayContaining([badPeer.port]),
			);
		});
	});

	describe('when penalty is 100 or more', () => {
		let badPeer: p2pTypes.ProtocolPeerInfo;

		beforeEach(() => {
			const firstNode = p2pNodeList[0];
			firstNode.on(EVENT_BAN_PEER, peerId => {
				collectedEvents.set('EVENT_BAN_PEER', peerId);
			});
			firstNode.on(EVENT_CLOSE_INBOUND, packet => {
				collectedEvents.set('EVENT_CLOSE_INBOUND', packet);
			});
			badPeer = { ipAddress: SEED_PEER_IP, port: 5001 };
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.port}`,
				penalty: 100,
			};
			firstNode.applyPenalty(peerPenalty);
		});

		it('should ban the peer', () => {
			const updatedConnectedPeers = p2pNodeList[0].getConnectedPeers();
			expect(updatedConnectedPeers.map(peer => peer.port)).toEqual(
				expect.not.arrayContaining([badPeer.port]),
			);
		});

		it(`should fire ${EVENT_BAN_PEER} event`, () => {
			expect(collectedEvents.get('EVENT_BAN_PEER')).toBeDefined();
		});

		it(`should fire ${EVENT_BAN_PEER} event with peerId`, () => {
			expect(collectedEvents.get('EVENT_BAN_PEER')).toBe(`${badPeer.ipAddress}:${badPeer.port}`);
		});

		it('should add Peer IP address into PeerBook BannedIPs', () => {
			expect((p2pNodeList[0] as any)._peerBook.bannedIPs).toEqual(new Set([badPeer.ipAddress]));
		});

		it('should unbanTimer into PeerBook', () => {
			expect((p2pNodeList[0] as any)._peerBook._unbanTimers).toHaveLength(1);
		});

		it(`should fire ${EVENT_CLOSE_INBOUND} event`, () => {
			expect(collectedEvents.get('EVENT_CLOSE_INBOUND')).toBeDefined();
		});

		it('should unban a peer after the ban period', async () => {
			// Wait for ban time to expire and peer to be re-discovered
			await wait(200);

			const updatedConnectedPeers = p2pNodeList[0].getConnectedPeers();

			expect(updatedConnectedPeers.map(peer => peer.port)).toEqual(
				expect.arrayContaining([badPeer.port]),
			);

			await wait(200);

			expect(p2pNodeList[0].getConnectedPeers().map(peer => peer.port)).toEqual(
				expect.arrayContaining([badPeer.port]),
			);
		});
	});
});
