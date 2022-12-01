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

import { P2P } from '../../../src/index';
import { destroyNetwork } from '../../utils/network_setup';
import { wait } from '../../utils/helpers';
import {
	EVENT_BAN_PEER,
	EVENT_CLOSE_INBOUND,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_MESSAGE_RECEIVED,
	EVENT_NEW_INBOUND_PEER,
	EVENT_REMOVE_PEER,
	EVENT_REQUEST_RECEIVED,
} from '../../../src/events';
import { NetworkStats } from '../../../src/types';

describe('getNetworkStats', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let firstNode: P2P;
	let secondNode: P2P;
	let thirdNode: P2P;
	let networkStats: NetworkStats;

	beforeEach(async () => {
		// Only has incoming connection from second and third node
		firstNode = new P2P({
			port: 5000,
			maxOutboundConnections: 0,
			nodeInfo: {
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				options: {},
				nonce: 'nonce',
				advertiseAddress: true,
			},
		});

		secondNode = new P2P({
			port: 5001,
			seedPeers: [{ ipAddress: '127.0.0.1', port: 5000 }],
			nodeInfo: {
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				options: {},
				nonce: 'nonce',
				advertiseAddress: true,
			},
		});

		thirdNode = new P2P({
			port: 5002,
			seedPeers: [
				{ ipAddress: '127.0.0.1', port: 5000 },
				{ ipAddress: '127.0.0.1', port: 5001 },
			],
			nodeInfo: {
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				options: {},
				nonce: 'nonce',
				advertiseAddress: true,
			},
		});

		p2pNodeList = [firstNode, secondNode, thirdNode];

		networkStats = {
			startTime: Date.now(),
			incoming: {
				count: 0,
				connects: 0,
				disconnects: 0,
			},
			outgoing: {
				count: 0,
				connects: 0,
				disconnects: 0,
			},
			banning: {
				bannedPeers: {},
				count: 0,
			},
			totalConnectedPeers: 0,
			totalDisconnectedPeers: 0,
			totalErrors: 0,
			totalPeersDiscovered: 0,
			totalRemovedPeers: 0,
			totalMessagesReceived: {},
			totalRequestsReceived: {},
		};

		firstNode.on(EVENT_REQUEST_RECEIVED, request => {
			if (!networkStats.totalRequestsReceived[request.procedure]) {
				networkStats.totalRequestsReceived[request.procedure] = 0;
			}
			networkStats.totalRequestsReceived[request.procedure] += 1;
		});

		firstNode.on(EVENT_MESSAGE_RECEIVED, message => {
			if (!networkStats.totalMessagesReceived[message.event]) {
				networkStats.totalMessagesReceived[message.event] = 0;
			}
			networkStats.totalMessagesReceived[message.event] += 1;
		});

		firstNode.on(EVENT_CLOSE_INBOUND, () => {
			networkStats.incoming.disconnects += 1;
		});
		firstNode.on(EVENT_NEW_INBOUND_PEER, () => {
			networkStats.incoming.connects += 1;
		});

		firstNode.on(EVENT_CLOSE_OUTBOUND, () => {
			networkStats.outgoing.disconnects += 1;
		});
		firstNode.on(EVENT_CONNECT_OUTBOUND, () => {
			networkStats.outgoing.connects += 1;
		});

		firstNode.on(EVENT_REMOVE_PEER, () => {
			networkStats.totalRemovedPeers += 1;
		});
		firstNode.on(EVENT_DISCOVERED_PEER, () => {
			networkStats.totalPeersDiscovered += 1;
		});
		firstNode.on(EVENT_BAN_PEER, peerId => {
			networkStats.banning.count += 1;
			if (!networkStats.banning.bannedPeers[peerId]) {
				networkStats.banning.bannedPeers[peerId].banCount = 0;
			}

			networkStats.banning.bannedPeers[peerId].banCount += 1;
			networkStats.banning.bannedPeers[peerId].lastBanTime = Date.now();
		});

		for (const p2p of p2pNodeList) {
			await p2p.start();
			await wait(100);
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should return a valid networkStats object', async () => {
		const { inboundCount, outboundCount } = firstNode['_peerPool'].getPeersCountPerKind();
		const firstNodeStats = firstNode.getNetworkStats();

		// Incoming
		expect(inboundCount).toEqual(firstNodeStats.incoming.count);
		expect(firstNodeStats.incoming.connects).toEqual(networkStats.incoming.connects);
		expect(firstNodeStats.incoming.disconnects).toBe(0);

		// Outgoing
		expect(outboundCount).toEqual(firstNodeStats.outgoing.count);
		expect(firstNodeStats.outgoing.connects).toEqual(networkStats.outgoing.connects);
		expect(firstNodeStats.outgoing.disconnects).toBe(0);

		// Banning
		expect(firstNodeStats.banning.count).toEqual(networkStats.banning.count);
		expect(firstNodeStats.banning.bannedPeers).toEqual({});

		// totals
		expect(firstNodeStats.totalConnectedPeers).toEqual(firstNode.getConnectedPeers().length);
		expect(firstNodeStats.totalDisconnectedPeers).toEqual(firstNode.getDisconnectedPeers().length);
		expect(firstNodeStats.totalMessagesReceived).toEqual(networkStats.totalMessagesReceived);
		expect(firstNodeStats.totalRequestsReceived).toEqual(networkStats.totalRequestsReceived);
		expect(firstNodeStats.totalRemovedPeers).toEqual(networkStats.totalRemovedPeers);
		expect(firstNodeStats.totalPeersDiscovered).toEqual(networkStats.totalPeersDiscovered);

		// Shutdown third node
		await thirdNode.stop();
		await wait(50);

		// Should capture incoming disconnect count
		expect(firstNode.getNetworkStats().incoming.disconnects).toBe(1);
	});
});
