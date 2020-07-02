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

import { P2P } from '../../src';
import { createNetwork, destroyNetwork } from '../utils/network_setup';
import { constructPeerId } from '../../src/utils';
import { EVENT_BAN_PEER } from '../../src/events';

describe('Peer banning mechanism', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let P2PNode: P2P;

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 1 });
		[P2PNode] = p2pNodeList;
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	describe('#PeerServer', () => {
		describe('Peer Banning', () => {
			const peerId = constructPeerId('127.0.0.1', 6000);

			it(`should Re-emit ${EVENT_BAN_PEER} Event`, () => {
				// Arrange
				const bannedPeerId: string[] = [];
				P2PNode.on(EVENT_BAN_PEER, id => {
					bannedPeerId.push(id);
				});

				// Act
				(P2PNode as any)._peerServer.emit(EVENT_BAN_PEER, peerId);

				// Assert
				expect(bannedPeerId[0]).toBe(peerId);
			});

			it('should call removePeer from PeerPool', () => {
				// Arrange
				const bannedPeerId: string[] = [];
				P2PNode.on(EVENT_BAN_PEER, id => {
					bannedPeerId.push(id);
				});

				jest.spyOn((P2PNode as any)._peerPool, 'hasPeer').mockReturnValue(true);
				jest.spyOn((P2PNode as any)._peerPool, 'removePeer');

				// Act
				(P2PNode as any)._peerServer.emit(EVENT_BAN_PEER, peerId);

				// Assert
				expect((P2PNode as any)._peerPool.hasPeer).toHaveBeenCalled();
				expect((P2PNode as any)._peerPool.removePeer).toHaveBeenCalled();
			});

			it('should add unbanTimer into PeerBook', () => {
				// Act
				(P2PNode as any)._peerServer.emit(EVENT_BAN_PEER, peerId);

				// Assert
				expect((P2PNode as any)._peerBook._unbanTimers).toHaveLength(1);
			});
		});
	});
});
