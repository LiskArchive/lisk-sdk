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

import { P2P, EVENT_INBOUND_SOCKET_ERROR } from '../../src/index';
import {
	createNetwork,
	destroyNetwork,
	SEED_PEER_IP,
	NETWORK_START_PORT,
} from 'utils/network_setup';
import { wait } from 'utils/helpers';
import expect = require('expect');
const INVALID_MESSAGE_1 = '#1';

describe(`Detect ${INVALID_MESSAGE_1} messages and ban the peer`, () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let countPingMessages = 0;
	let collectInboundErrorMessages: any[] = [];
	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 2 });

		const firstNode = p2pNodeList[0];
		const secondNode = p2pNodeList[1];

		secondNode.on(EVENT_INBOUND_SOCKET_ERROR, error => {
			collectInboundErrorMessages.push(error);
		});

		const connectedPeerOfNode2 = secondNode.getConnectedPeers()[0];
		const peerOfNode2 = secondNode['_peerPool']['_peerMap'].get(
			`${SEED_PEER_IP}:${connectedPeerOfNode2.wsPort}`,
		);
		if (peerOfNode2 && peerOfNode2['_socket']) {
			peerOfNode2['_socket'].on('message', (_data: any) => {
				countPingMessages++;
			});
		}

		for (const p2p of p2pNodeList) {
			if (p2p.nodeInfo.wsPort === connectedPeerOfNode2.wsPort) {
				const peerOfNode1 = firstNode['_peerPool']['_peerMap'].get(
					`127.0.0.2:${secondNode.nodeInfo.wsPort}`,
				);
				if (peerOfNode1 && peerOfNode1['_socket']) {
					for (let num = 0; num < 50; num++) {
						peerOfNode1['_socket'].send(INVALID_MESSAGE_1, {});
					}
				}
			}
		}

		await wait(500);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should set the isActive property to true for all nodes', async () => {
		expect(countPingMessages).toEqual(1);
		expect(collectInboundErrorMessages.length).toEqual(1);
		expect((collectInboundErrorMessages as any[])[0]).toEqual(
			`Peer ${SEED_PEER_IP}:${NETWORK_START_PORT} was disconnected due to unwanted to messages`,
		);
	});
});
