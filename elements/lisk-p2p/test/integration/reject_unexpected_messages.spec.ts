/*
 * Copyright © 2020 Lisk Foundation
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
 */

import { P2P, events } from '../../src/index';

import {
	createNetwork,
	destroyNetwork,
	NETWORK_CREATION_WAIT_TIME,
	SEED_PEER_IP,
} from '../utils/network_setup';
import { wait } from '../utils/helpers';
import { constructPeerId } from '../../src/utils';

import { Peer } from '../../src/peer';

describe('Reject control messages', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let bannedPeers: any[] = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork({
			networkDiscoveryWaitTime: 0,
			networkSize: 3,
		});

		bannedPeers = [];
		for (const p2p of p2pNodeList) {
			// eslint-disable-next-line no-loop-func
			p2p.on(events.EVENT_BAN_PEER, peerId => {
				bannedPeers.push(peerId);
			});
		}

		await Promise.all(p2pNodeList.map(async p2p => p2p.start()));

		await wait(NETWORK_CREATION_WAIT_TIME);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	describe('#ping', () => {
		it('should ban peer when receive ping message on an outgoing connection', async () => {
			// Arrange & Act
			const firstNode = p2pNodeList[0];
			const secondNode = p2pNodeList[1];

			const peer = firstNode['_peerPool'].getPeer(
				constructPeerId(SEED_PEER_IP, secondNode.config.port),
			) as Peer;
			// Send ping to the inbound peer
			(peer['_socket'] as any).socket.ping();

			await wait(100);
			// Assert
			expect(secondNode.getConnectedPeers().map(p => p.port)).not.toContain(firstNode.config.port);
			expect(bannedPeers.length).toBeGreaterThan(0);
		});

		it('should ban peer when receive ping message on an incoming connection', async () => {
			// Arrange & Act
			const secondNode = p2pNodeList[1];
			const thirdNode = p2pNodeList[2];

			const peer = thirdNode['_peerPool']['_peerMap'].get(
				`${SEED_PEER_IP}:${secondNode.config.port}`,
			) as Peer;
			// Send ping to the outbound peer
			(peer['_socket'] as any).transport.socket.ping();

			await wait(100);
			// // Assert
			expect(secondNode.getConnectedPeers().map(p => p.port)).not.toContain(thirdNode.config.port);
			expect(bannedPeers.length).toBeGreaterThan(0);
		});
	});

	describe('#pong', () => {
		it('should ban peer when receive pong message on an outgoing connection', async () => {
			// Arrange & Act
			const firstNode = p2pNodeList[0];
			const secondNode = p2pNodeList[1];

			const peer = firstNode['_peerPool'].getPeer(
				constructPeerId(SEED_PEER_IP, secondNode.config.port),
			) as Peer;
			// Send pong to the inbound peer
			(peer['_socket'] as any).socket.pong();

			await wait(200);
			// Assert
			expect(secondNode.getConnectedPeers().map(p => p.port)).not.toContain(firstNode.config.port);
			expect(bannedPeers.length).toBeGreaterThan(0);
		});

		it('should ban peer when receive pong message on an incoming connection', async () => {
			// Arrange & Act
			const secondNode = p2pNodeList[1];
			const thirdNode = p2pNodeList[2];

			const peer = thirdNode['_peerPool']['_peerMap'].get(
				`${SEED_PEER_IP}:${secondNode.config.port}`,
			) as Peer;
			// Send pong to the outbound peer
			(peer['_socket'] as any).transport.socket.pong();

			await wait(100);
			// // Assert
			expect(secondNode.getConnectedPeers().map(p => p.port)).not.toContain(thirdNode.config.port);
			expect(bannedPeers.length).toBeGreaterThan(0);
		});
	});
});
