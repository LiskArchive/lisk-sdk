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
import {
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
} from 'utils/network_setup';

describe('Message rate limit', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
	let messageRates: Map<number, Array<number>> = new Map();
	const removedPeers = new Map();

	beforeEach(async () => {
		const customConfig = (index: number) => ({
			// For the third node, make the message rate limit higher.
			wsMaxMessageRate: index == 2 ? 100000 : 110,
			rateCalculationInterval: 100,
		});
		p2pNodeList = await createNetwork({ customConfig });

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
		await destroyNetwork(p2pNodeList);
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
