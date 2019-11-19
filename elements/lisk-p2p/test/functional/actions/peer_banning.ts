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
import { P2P, ProtocolPeerInfo } from '../../../src/index';
import { wait } from '../../utils/helpers';
import {
	createNetwork,
	destroyNetwork,
	SEED_PEER_IP,
} from 'utils/network_setup';
import {
	EVENT_BAN_PEER,
	EVENT_UNBAN_PEER,
	EVENT_CLOSE_INBOUND,
} from '../../../src/index';

describe('Peer banning mechanism', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();
	const PEER_BAN_TIME = 100;

	beforeEach(async () => {
		const customConfig = () => ({
			peerBanTime: PEER_BAN_TIME,
		});

		p2pNodeList = await createNetwork({ customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	describe('when penalty is under 100', () => {
		it('should not ban any peer', async () => {
			const firstP2PNode = p2pNodeList[0];
			const badPeer = firstP2PNode.getConnectedPeers()[1];
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
				penalty: 10,
			};
			firstP2PNode.applyPenalty(peerPenalty);
			const updatedConnectedPeers = firstP2PNode.getConnectedPeers();
			expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.include(
				badPeer.wsPort,
			);
		});
	});

	describe('when penalty is 100 or more', () => {
		let badPeer: ProtocolPeerInfo;

		beforeEach(async () => {
			const firstNode = p2pNodeList[0];
			firstNode.on(EVENT_BAN_PEER, peerId => {
				collectedEvents.set('EVENT_BAN_PEER', peerId);
			});
			firstNode.on(EVENT_UNBAN_PEER, peerId => {
				collectedEvents.set('EVENT_UNBAN_PEER', peerId);
			});
			firstNode.on(EVENT_CLOSE_INBOUND, packet => {
				collectedEvents.set('EVENT_CLOSE_INBOUND', packet);
			});
			badPeer = { ipAddress: SEED_PEER_IP, wsPort: 5001 };
			const peerPenalty = {
				peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
				penalty: 100,
			};
			firstNode.applyPenalty(peerPenalty);
		});

		it('should ban the peer', async () => {
			const updatedConnectedPeers = p2pNodeList[0].getConnectedPeers();
			expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.not.include(
				badPeer.wsPort,
			);
		});

		it(`should fire ${EVENT_BAN_PEER} event`, async () => {
			expect(collectedEvents.get('EVENT_BAN_PEER')).to.exist;
		});

		it(`should fire ${EVENT_BAN_PEER} event with peerId`, async () => {
			expect(collectedEvents.get('EVENT_BAN_PEER')).to.eql(
				`${badPeer.ipAddress}:${badPeer.wsPort}`,
			);
		});

		it(`should fire ${EVENT_CLOSE_INBOUND} event`, async () => {
			expect(collectedEvents.get('EVENT_CLOSE_INBOUND')).to.exist;
		});

		it('should unban a peer after the ban period', async () => {
			// Wait for ban time to expire and peer to be re-discovered
			await wait(200);

			const updatedConnectedPeers = p2pNodeList[0].getConnectedPeers();

			expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.include(
				badPeer.wsPort,
			);
			expect(collectedEvents.get('EVENT_UNBAN_PEER')).to.exist;
		});
	});
});
