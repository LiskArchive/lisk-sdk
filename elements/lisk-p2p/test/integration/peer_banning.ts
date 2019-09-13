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
import { platform } from 'os';
import {
	EVENT_BAN_PEER,
	EVENT_UNBAN_PEER,
	EVENT_CLOSE_INBOUND,
} from '../../src/index';

describe('Peer banning mechanism', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;

	before(async () => {
		sandbox.restore();
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
			// Each node will have the next node in the sequence as a seed peer.
			const seedPeers = [
				{
					ipAddress: '127.0.0.1',
					wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
				},
			];

			const nodePort = NETWORK_START_PORT + index;

			return new P2P({
				seedPeers,
				wsEngine: 'ws',
				connectTimeout: 100,
				ackTimeout: 100,
				peerBanTime: 100,
				populatorInterval: 100,
				maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
				maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
				nodeInfo: {
					wsPort: nodePort,
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					minVersion: '1.0.1',
					version: '1.0.1',
					protocolVersion: '1.1',
					os: platform(),
					height: 0,
					broadhash:
						'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
					nonce: `O2wTkjqplHII${nodePort}`,
				},
			});
		});
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(200);

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

	after(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
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
