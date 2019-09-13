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
import { P2P, EVENT_CLOSE_OUTBOUND } from '../../src/index';
import { wait } from '../utils/helpers';
import { InboundPeer, OutboundPeer, ConnectionState } from '../../src/peer';
import { createNetwork, destroyNetwork } from './setup';

describe('Disconnect duplicate peers', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let firstP2PNodeCloseEvents: Array<any> = [];
	let firstPeerCloseEvents: Array<any> = [];
	let firstPeerErrors: Array<any> = [];
	let firstPeerDuplicate: OutboundPeer;
	let firstP2PNode: P2P;
	let existingPeer: InboundPeer;

	beforeEach(async () => {
		p2pNodeList = await createNetwork({});

		firstP2PNode = p2pNodeList[0];
		firstPeerCloseEvents = [];
		existingPeer = firstP2PNode['_peerPool'].getPeers(
			InboundPeer,
		)[0] as InboundPeer;
		firstPeerDuplicate = new OutboundPeer(
			existingPeer.peerInfo,
			firstP2PNode['_peerPool'].peerConfig,
		);

		firstPeerDuplicate.on(EVENT_CLOSE_OUTBOUND, (event: any) => {
			firstPeerCloseEvents.push(event);
		});

		try {
			// This will create a connection.
			await firstPeerDuplicate.applyNodeInfo(firstP2PNode.nodeInfo);
		} catch (error) {
			firstPeerErrors.push(error);
		}

		firstP2PNode.on(EVENT_CLOSE_OUTBOUND, event => {
			firstP2PNodeCloseEvents.push(event);
		});
		await wait(100);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);

		firstPeerDuplicate.removeAllListeners(EVENT_CLOSE_OUTBOUND);
		firstP2PNode.removeAllListeners(EVENT_CLOSE_OUTBOUND);
		firstPeerDuplicate.disconnect();
	});

	// Simulate legacy behaviour where the node tries to connect back to an inbound peer.
	it('should remove a peer if they try to connect but they are already connected', async () => {
		expect(firstPeerErrors).to.have.length(1);
		expect(firstPeerErrors[0])
			.to.have.property('name')
			.which.equals('BadConnectionError');
		expect(firstPeerErrors[0])
			.to.have.property('name')
			.which.equals('BadConnectionError');
		expect(firstPeerDuplicate)
			.to.have.property('state')
			.which.equals(ConnectionState.CLOSED);
		// Disconnecting our new outbound socket should not cause the existing inbound peer instance to be removed.
		expect(firstP2PNodeCloseEvents).to.be.empty;
	});
});
