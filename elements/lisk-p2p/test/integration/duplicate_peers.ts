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
import { platform } from 'os';
import { InboundPeer, OutboundPeer, ConnectionState } from '../../src/peer';

describe('Disconnect duplicate peers', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let firstP2PNodeCloseEvents: Array<any> = [];
	let firstPeerCloseEvents: Array<any> = [];
	let firstPeerErrors: Array<any> = [];
	let firstPeerDuplicate: OutboundPeer;
	let firstP2PNode: P2P;
	let existingPeer: InboundPeer;
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;

	beforeEach(async () => {
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
			// Each node will have the previous node in the sequence as a seed peer except the first node.
			const seedPeers =
				index === 0
					? []
					: [
							{
								ipAddress: '127.0.0.1',
								wsPort: NETWORK_START_PORT + index - 1,
							},
					  ];

			const nodePort = NETWORK_START_PORT + index;
			return new P2P({
				connectTimeout: 100,
				ackTimeout: 200,
				rateCalculationInterval: 10000,
				seedPeers,
				wsEngine: 'ws',
				populatorInterval: POPULATOR_INTERVAL,
				maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
				maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
				nodeInfo: {
					wsPort: nodePort,
					nethash:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					version: '1.0.1',
					protocolVersion: '1.1',
					minVersion: '1.0.0',
					os: platform(),
					height: 0,
					broadhash:
						'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
					nonce: `O2wTkjqplHII${nodePort}`,
				},
			});
		});
		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));

		await wait(1000);

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
		await Promise.all(
			p2pNodeList.filter(p2p => p2p.isActive).map(p2p => p2p.stop()),
		);
		await wait(1000);

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
