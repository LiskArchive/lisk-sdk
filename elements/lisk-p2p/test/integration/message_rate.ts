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
import {
	P2P,
	EVENT_MESSAGE_RECEIVED,
	EVENT_REMOVE_PEER,
} from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';

describe('Message rate limit', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
	let messageRates: Map<number, Array<number>> = new Map();
	const removedPeers = new Map();
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
	const POPULATOR_INTERVAL = 50;
	const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
	const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;

	before(async () => {
		sandbox.restore();
	});

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
				seedPeers,
				wsEngine: 'ws',
				populatorInterval: POPULATOR_INTERVAL,
				maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
				maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
				rateCalculationInterval: 100,
				// For the third node, make the message rate limit higher.
				wsMaxMessageRate: index == 2 ? 100000 : 110,
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

		for (let p2p of p2pNodeList) {
			p2p.on(EVENT_MESSAGE_RECEIVED, message => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					message,
				});
				let peerRates = messageRates.get(p2p.nodeInfo.wsPort) || [];
				peerRates.push(message.rate);
				messageRates.set(p2p.nodeInfo.wsPort, peerRates);
			});
		}

		const secondP2PNode = p2pNodeList[1];
		secondP2PNode.on(EVENT_REMOVE_PEER, peerId => {
			const peerWsPort = peerId.split(':')[1];
			const localRemovedNodes = [];
			if (removedPeers.get(secondP2PNode.nodeInfo.wsPort)) {
				localRemovedNodes.push(
					...removedPeers.get(secondP2PNode.nodeInfo.wsPort),
				);
			}
			localRemovedNodes.push(peerWsPort);
			removedPeers.set(secondP2PNode.nodeInfo.wsPort, localRemovedNodes);
		});
		const thirdP2PNode = p2pNodeList[2];
		thirdP2PNode.on(EVENT_REMOVE_PEER, peerId => {
			const peerWsPort = peerId.split(':')[1];
			const localRemovedNodes = [];
			if (removedPeers.get(thirdP2PNode.nodeInfo.wsPort)) {
				localRemovedNodes.push(
					...removedPeers.get(thirdP2PNode.nodeInfo.wsPort),
				);
			}
			localRemovedNodes.push(peerWsPort);
			removedPeers.set(thirdP2PNode.nodeInfo.wsPort, localRemovedNodes);
		});
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(100);
	});

	describe('P2P.sendToPeer', () => {
		beforeEach(() => {
			collectedMessages = [];
			messageRates = new Map();
		});

		it('should track the message rate correctly when receiving messages', async () => {
			const TOTAL_SENDS = 100;
			const firstP2PNode = p2pNodeList[0];
			const ratePerSecondLowerBound = 70;
			const ratePerSecondUpperBound = 130;

			const targetPeerPort = NETWORK_START_PORT + 3;
			const targetPeerId = `127.0.0.1:${targetPeerPort}`;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				await wait(10);
				try {
					firstP2PNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
				} catch (e) {}
			}

			await wait(50);
			const secondPeerRates = messageRates.get(targetPeerPort) || [];
			const lastRate = secondPeerRates[secondPeerRates.length - 1];

			expect(lastRate).to.be.gt(ratePerSecondLowerBound);
			expect(lastRate).to.be.lt(ratePerSecondUpperBound);
		});

		it('should disconnect the peer if it tries to send messages at a rate above wsMaxMessageRate', async () => {
			const TOTAL_SENDS = 300;
			const firstP2PNode = p2pNodeList[0];
			const secondP2PNode = p2pNodeList[1];
			const targetPeerId = `127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				await wait(1);
				try {
					firstP2PNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
				} catch (error) {}
			}

			await wait(10);

			expect(removedPeers.get(secondP2PNode.nodeInfo.wsPort)).to.contain(
				firstP2PNode.nodeInfo.wsPort.toString(),
			);
		});
	});

	describe('P2P.requestFromPeer', () => {
		let collectedMessages: Array<any> = [];
		let requestRates: Map<number, Array<number>> = new Map();

		beforeEach(() => {
			collectedMessages = [];
			requestRates = new Map();
			for (let p2p of p2pNodeList) {
				p2p.on('requestReceived', request => {
					collectedMessages.push({
						nodePort: p2p.nodeInfo.wsPort,
						request,
					});
					if (request.procedure === 'getGreeting') {
						request.end(
							`Hello ${request.data} from peer ${p2p.nodeInfo.wsPort}`,
						);
					} else {
						if (!request.wasResponseSent) {
							request.end(456);
						}
					}
					let peerRates = requestRates.get(p2p.nodeInfo.wsPort) || [];
					peerRates.push(request.rate);
					requestRates.set(p2p.nodeInfo.wsPort, peerRates);
				});
			}
		});

		it('should track the request rate correctly when receiving requests', async () => {
			const TOTAL_SENDS = 100;
			const firstP2PNode = p2pNodeList[0];
			const ratePerSecondLowerBound = 70;
			const ratePerSecondUpperBound = 130;

			const targetPeerPort = NETWORK_START_PORT + 3;
			const targetPeerId = `127.0.0.1:${targetPeerPort}`;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				await wait(10);
				firstP2PNode.requestFromPeer(
					{
						procedure: 'proc',
						data: 123456,
					},
					targetPeerId,
				);
			}

			await wait(50);
			const secondPeerRates = requestRates.get(targetPeerPort) || [];
			const lastRate = secondPeerRates[secondPeerRates.length - 1];

			expect(lastRate).to.be.gt(ratePerSecondLowerBound);
			expect(lastRate).to.be.lt(ratePerSecondUpperBound);
		});

		it('should disconnect the peer if it tries to send responses at a rate above wsMaxMessageRate', async () => {
			const TOTAL_SENDS = 300;
			const firstP2PNode = p2pNodeList[0];
			const thirdP2PNode = p2pNodeList[2];

			const targetPeerId = `127.0.0.1:${thirdP2PNode.nodeInfo.wsPort}`;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				await wait(1);
				(async () => {
					try {
						await firstP2PNode.requestFromPeer(
							{
								procedure: 'proc',
								data: 123456,
							},
							targetPeerId,
						);
					} catch (error) {}
				})();
			}

			await wait(10);

			expect(removedPeers.get(thirdP2PNode.nodeInfo.wsPort)).to.contain(
				firstP2PNode.nodeInfo.wsPort.toString(),
			);
		});
	});
});
