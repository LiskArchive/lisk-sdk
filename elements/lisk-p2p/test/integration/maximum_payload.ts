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

describe('Maximum payload', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let dataLargerThanMaxPayload: Array<string>;
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;

	before(async () => {
		sandbox.restore();
	});

	beforeEach(async () => {
		dataLargerThanMaxPayload = [];
		for (let i = 0; i < 6000; i++) {
			dataLargerThanMaxPayload.push(`message${i}`);
		}
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
			const seedPeers = [
				{
					ipAddress: '127.0.0.1',
					wsPort: NETWORK_START_PORT + ((index - 1) % NETWORK_PEER_COUNT),
				},
			];

			const nodePort = NETWORK_START_PORT + index;

			return new P2P({
				blacklistedPeers: [],
				connectTimeout: 200,
				ackTimeout: 200,
				seedPeers,
				populatorInterval: 30,
				maxOutboundConnections: 10,
				maxInboundConnections: 30,
				wsEngine: 'ws',
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
				wsMaxPayload: 5000,
			});
		});

		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(300);
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(100);
	});

	describe('P2P.send', () => {
		let collectedMessages: Array<any> = [];
		let closedPeers: Map<number, any>;

		beforeEach(() => {
			collectedMessages = [];
			closedPeers = new Map();
			p2pNodeList.forEach(p2p => {
				p2p.on('messageReceived', message => {
					collectedMessages.push({
						nodePort: p2p.nodeInfo.wsPort,
						message,
					});
				});

				p2p.on('closeInbound', packet => {
					let peers = [];
					if (closedPeers.has(p2p.nodeInfo.wsPort)) {
						peers = closedPeers.get(p2p.nodeInfo.wsPort);
					}
					peers.push(packet.peerInfo);
					closedPeers.set(p2p.nodeInfo.wsPort, peers);
				});

				p2p.on('closeOutbound', packet => {
					let peers = [];
					if (closedPeers.has(p2p.nodeInfo.wsPort)) {
						peers = closedPeers.get(p2p.nodeInfo.wsPort);
					}
					peers.push(packet.peerInfo);
					closedPeers.set(p2p.nodeInfo.wsPort, peers);
				});
			});
		});

		it('should not send a package larger than the ws max payload', async () => {
			const firstP2PNode = p2pNodeList[0];

			firstP2PNode.send({
				event: 'maxPayload',
				data: dataLargerThanMaxPayload,
			});
			await wait(100);

			expect(collectedMessages).to.be.empty;
		});

		it('should disconnect the peer which has sent the message', async () => {
			const firstP2PNode = p2pNodeList[0];
			firstP2PNode.send({
				event: 'maxPayload',
				data: dataLargerThanMaxPayload,
			});

			await wait(300);

			const firstPeerDisconnectedList =
				closedPeers.get(firstP2PNode.nodeInfo.wsPort) || [];
			for (const p2pNode of p2pNodeList) {
				const disconnectedList = closedPeers.get(p2pNode.nodeInfo.wsPort) || [];
				const wasFirstPeerDisconnected =
					disconnectedList.some((peerInfo: any) => peerInfo.wsPort === 5000) ||
					firstPeerDisconnectedList.some(
						(peerInfo: any) => peerInfo.wsPort === p2pNode.nodeInfo.wsPort,
					);
				if (p2pNode.nodeInfo.wsPort === 5000) {
					expect(disconnectedList.length).to.be.gte(9);
				} else {
					expect(wasFirstPeerDisconnected).to.be.true;
				}
			}
		});
	});
});
