/*
 * Copyright © 2018 Lisk Foundation
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
import { PeerPool } from '../../src/peer_pool';
import {
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
} from '../../src/peer_selection';
import { Peer, ConnectionState } from '../../src/peer';
import { initializePeerList } from '../utils/peers';
import { P2PDiscoveredPeerInfo } from '../../src/p2p_types';

describe.only('peerPool', () => {
	const peerPool = new PeerPool({
		peerSelectionForConnection: selectPeersForConnection,
		peerSelectionForRequest: selectPeersForRequest,
		peerSelectionForSend: selectPeersForSend,
		sendPeerLimit: 25,
	});

	describe('#constructor', () => {
		it('should be an object and instance of PeerPool', () => {
			return expect(peerPool)
				.to.be.an('object')
				.and.be.instanceof(PeerPool);
		});
	});

	describe('#getConnectedPeers', () => {
		const peerList: ReadonlyArray<Peer> = initializePeerList();

		let activePeersInfoList: ReadonlyArray<P2PDiscoveredPeerInfo>;
		beforeEach(async () => {
			sandbox.stub(peerList[0], 'state').get(() => {
				return {
					inbound: ConnectionState.CONNECTED,
					outbound: ConnectionState.CONNECTED,
				};
			});
			sandbox.stub(peerList[1], 'state').get(() => {
				return {
					inbound: ConnectionState.CONNECTED,
					outbound: ConnectionState.CONNECTED,
				};
			});
			activePeersInfoList = [peerList[0], peerList[1]].map(
				peer => peer.peerInfo,
			);

			sandbox.stub(peerPool, 'getAllPeers').returns(peerList);
		});

		it('should return active peers', async () => {
			expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql(
				activePeersInfoList,
			);
		});
	});

	describe('#getAllConnectedPeerInfos', () => {
		const peerList: ReadonlyArray<Peer> = initializePeerList();

		let activePeersInfoList: ReadonlyArray<P2PDiscoveredPeerInfo>;
		beforeEach(async () => {
			sandbox.stub(peerList[0], 'state').get(() => {
				return {
					inbound: ConnectionState.CONNECTED,
					outbound: ConnectionState.CONNECTED,
				};
			});
			sandbox.stub(peerList[1], 'state').get(() => {
				return {
					inbound: ConnectionState.CONNECTED,
					outbound: ConnectionState.CONNECTED,
				};
			});

			sandbox
				.stub(peerPool, 'getConnectedPeers')
				.returns(
					peerList.filter(
						peer => peer.state.inbound === 1 || peer.state.outbound === 1,
					),
				);
			activePeersInfoList = [peerList[0].peerInfo, peerList[1].peerInfo];
		});

		it('should returns list of peerInfos of active peers', async () => {
			expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
		});
	});
});
