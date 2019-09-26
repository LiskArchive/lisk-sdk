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
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';
import {
	EVENT_BAN_PEER,
	EVENT_UNBAN_PEER,
	EVENT_CLOSE_INBOUND,
} from '../../src/index';

describe('Peer banning mechanism', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();
	const POPULATOR_INTERVAL = 100;
	const PEER_BAN_TIME = 100;

	beforeEach(async () => {
		const customSeedPeers = (
			index: number,
			startPort: number,
			networkSize: number,
		) => [
			{
				ipAddress: '127.0.0.1',
				wsPort: startPort + ((index + 1) % networkSize),
			},
		];

		const customConfig = (
			index: number,
			startPort: number,
			networkSize: number,
		) => ({
			populatorInterval: POPULATOR_INTERVAL,
			peerBanTime: PEER_BAN_TIME,
			seedPeers: customSeedPeers(index, startPort, networkSize),
		});

		p2pNodeList = await createNetwork({ customConfig });

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
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should not ban a bad peer for a 10 point penalty', async () => {
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

	it('should ban a bad peer for a 100 point penalty', async () => {
		const firstP2PNode = p2pNodeList[0];
		const badPeer = firstP2PNode.getConnectedPeers()[2];
		const peerPenalty = {
			peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
			penalty: 100,
		};
		firstP2PNode.applyPenalty(peerPenalty);
		const updatedConnectedPeers = firstP2PNode.getConnectedPeers();

		expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.not.include(
			badPeer.wsPort,
		);
	});

	it(`should fire ${EVENT_BAN_PEER} event`, async () => {
		expect(collectedEvents.get('EVENT_BAN_PEER')).to.exist;
	});

	it('should emit peerId of banned peer', async () => {
		expect(collectedEvents.get('EVENT_BAN_PEER')).to.eql('127.0.0.1:5002');
	});

	it('should unban a peer after the ban period', async () => {
		const firstP2PNode = p2pNodeList[0];
		const badPeer = firstP2PNode.getConnectedPeers()[2];
		const peerPenalty = {
			peerId: `${badPeer.ipAddress}:${badPeer.wsPort}`,
			penalty: 100,
		};
		firstP2PNode.applyPenalty(peerPenalty);
		// Wait for ban time to expire and peer to be re-discovered
		await wait(1000);
		const updatedConnectedPeers = firstP2PNode.getConnectedPeers();

		expect(updatedConnectedPeers.map(peer => peer.wsPort)).to.include(
			badPeer.wsPort,
		);
		expect(collectedEvents.get('EVENT_UNBAN_PEER')).to.exist;
	});
});
