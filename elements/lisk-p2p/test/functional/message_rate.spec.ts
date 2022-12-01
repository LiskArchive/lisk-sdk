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
import { P2P, events } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork, NETWORK_START_PORT } from '../utils/network_setup';
import { REMOTE_EVENT_RPC_GET_PEERS_LIST, REMOTE_EVENT_RPC_GET_NODE_INFO } from '../../src/events';

const { EVENT_MESSAGE_RECEIVED, EVENT_REMOVE_PEER } = events;

describe('Message rate limit', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
	let messageRates: Map<number, Array<number>> = new Map();
	const removedPeers = new Map();

	beforeEach(async () => {
		const customConfig = (index: number) => ({
			// For the third node, make the message rate limit higher.
			wsMaxMessageRate: index === 2 ? 100000 : 110,
			rateCalculationInterval: 100,
			fallbackSeedPeerDiscoveryInterval: 10000,
		});
		p2pNodeList = await createNetwork({ customConfig });

		for (const p2p of p2pNodeList) {
			// eslint-disable-next-line no-loop-func
			p2p.on(EVENT_MESSAGE_RECEIVED, message => {
				collectedMessages.push({
					nodePort: p2p.config.port,
					message,
				});
				const peerRates = messageRates.get(p2p.config.port) ?? [];
				peerRates.push(message.rate);
				messageRates.set(p2p.config.port, peerRates);
			});
		}

		const secondP2PNode = p2pNodeList[1];
		secondP2PNode.on(EVENT_REMOVE_PEER, peerId => {
			const peerport = peerId.split(':')[1];
			const localRemovedNodes = [];
			if (removedPeers.get(secondP2PNode.config.port)) {
				localRemovedNodes.push(...removedPeers.get(secondP2PNode.config.port));
			}
			localRemovedNodes.push(peerport);
			removedPeers.set(secondP2PNode.config.port, localRemovedNodes);
		});
		const thirdP2PNode = p2pNodeList[2];
		thirdP2PNode.on(EVENT_REMOVE_PEER, peerId => {
			const peerport = peerId.split(':')[1];
			const localRemovedNodes = [];
			if (removedPeers.get(thirdP2PNode.config.port)) {
				localRemovedNodes.push(...removedPeers.get(thirdP2PNode.config.port));
			}
			localRemovedNodes.push(peerport);
			removedPeers.set(thirdP2PNode.config.port, localRemovedNodes);
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
			const ratePerSecondLowerBound = 60;
			const ratePerSecondUpperBound = 130;

			const targetPeerPort = NETWORK_START_PORT + 3;
			const targetPeerId = `127.0.0.1:${targetPeerPort}`;

			for (let i = 0; i < TOTAL_SENDS; i += 1) {
				await wait(10);
				try {
					firstP2PNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
					// eslint-disable-next-line no-empty
				} catch (error) {}
			}

			await wait(50);
			const secondPeerRates = messageRates.get(targetPeerPort) ?? [];
			const lastRate = secondPeerRates[secondPeerRates.length - 1];

			expect(lastRate).toBeGreaterThan(ratePerSecondLowerBound);
			expect(lastRate).toBeLessThan(ratePerSecondUpperBound);
		});

		it('should disconnect the peer if it tries to send messages at a rate above wsMaxMessageRate', async () => {
			const TOTAL_SENDS = 300;
			const firstP2PNode = p2pNodeList[0];
			const secondP2PNode = p2pNodeList[1];
			const targetPeerId = `127.0.0.1:${secondP2PNode.config.port}`;

			for (let i = 0; i < TOTAL_SENDS; i += 1) {
				await wait(1);
				try {
					firstP2PNode.sendToPeer(
						{
							event: 'foo',
							data: i,
						},
						targetPeerId,
					);
					// eslint-disable-next-line no-empty
				} catch (error) {}
			}

			await wait(10);

			expect(removedPeers.get(secondP2PNode.config.port)).toEqual(
				expect.arrayContaining([firstP2PNode.config.port.toString()]),
			);
		});
	});

	describe('P2P.requestFromPeer', () => {
		let requestRates: Map<number, Array<number>> = new Map();

		beforeEach(() => {
			collectedMessages = [];
			requestRates = new Map();
			for (const p2p of p2pNodeList) {
				// eslint-disable-next-line no-loop-func
				p2p.on('EVENT_REQUEST_RECEIVED', request => {
					collectedMessages.push({
						nodePort: p2p.config.port,
						request,
					});
					if (request.procedure === 'getGreeting') {
						request.end(
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							`Hello ${request.data} from peer ${p2p.config.port}`,
						);
					} else if (!request.wasResponseSent) {
						request.end(456);
					}
					const peerRates = requestRates.get(p2p.config.port) ?? [];
					peerRates.push(request.rate);
					requestRates.set(p2p.config.port, peerRates);
				});
			}
		});

		it('should track the request rate correctly when receiving requests', async () => {
			const TOTAL_SENDS = 100;
			const requesterP2PNode = p2pNodeList[1];
			const ratePerSecondLowerBound = 60;
			const ratePerSecondUpperBound = 130;

			const targetPeerPort = NETWORK_START_PORT;
			const targetPeerId = `127.0.0.1:${targetPeerPort}`;

			for (let i = 0; i < TOTAL_SENDS; i += 1) {
				await wait(10);
				await requesterP2PNode.requestFromPeer(
					{
						procedure: 'proc',
						data: 123456,
					},
					targetPeerId,
				);
			}

			await wait(50);
			const secondPeerRates = requestRates.get(targetPeerPort) ?? [];
			const lastRate = secondPeerRates[secondPeerRates.length - 1];

			expect(lastRate).toBeGreaterThan(ratePerSecondLowerBound);
			expect(lastRate).toBeLessThan(ratePerSecondUpperBound);
		});

		it('should disconnect the peer if it tries to send responses at a rate above wsMaxMessageRate', async () => {
			const TOTAL_SENDS = 300;
			const requesterP2PNode = p2pNodeList[0];
			const targetP2PNode = p2pNodeList[1];

			const targetPeerId = `127.0.0.1:${targetP2PNode.config.port}`;

			for (let i = 0; i < TOTAL_SENDS; i += 1) {
				await wait(1);
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				(async () => {
					try {
						await requesterP2PNode.requestFromPeer(
							{
								procedure: 'proc',
								data: 123456,
							},
							targetPeerId,
						);
						// eslint-disable-next-line no-empty
					} catch (error) {}
				})();
			}

			await wait(10);

			expect(removedPeers.get(targetP2PNode.config.port)).toEqual(
				expect.arrayContaining([requesterP2PNode.config.port.toString()]),
			);
		});
	});

	describe('Post node info message rate limit', () => {
		it('should not ban the attacker node if it sends only 4 nodeInfo messages in 10 seconds', async () => {
			// Arrange
			const attackerNode = p2pNodeList[0];
			const targetNode = p2pNodeList[1];

			// Act
			// Send nodeInfo message 3 times, so total of 4 messages of max allowed and not get ban score
			for (let i = 0; i < 3; i += 1) {
				attackerNode.applyNodeInfo(attackerNode.nodeInfo);
			}

			await wait(10);

			// Assert
			expect(targetNode['_peerBook'].triedPeers[0].internalState?.reputation).toBe(100);
		});

		it('should add a ban score of peer when it sends postNodeInfo messages more than 4 within 10 seconds', async () => {
			// Arrange
			const attackerNode = p2pNodeList[0];
			const targetNode = p2pNodeList[1];

			// Act
			// Send nodeInfo message 4 times and once its send on connection to get a ban score
			for (let i = 0; i < 4; i += 1) {
				attackerNode.applyNodeInfo(attackerNode.nodeInfo);
			}

			await wait(10);

			// Assert
			expect(targetNode['_peerBook'].triedPeers[0].internalState?.reputation).toBe(90);
		});

		it('should ban a peer when it sends postNodeInfo messages more than 4 + 10 times within 10 seconds', async () => {
			// Arrange
			const attackerNode = p2pNodeList[0];
			const targetNode = p2pNodeList[1];

			// Act
			// Send nodeInfo message 14 times and once its send on connection (total of 15 messages to get banned)
			for (let i = 0; i < 14; i += 1) {
				attackerNode.applyNodeInfo(attackerNode.nodeInfo);
			}

			await wait(10);

			// Assert
			expect(removedPeers.get(targetNode.config.port)).toEqual(
				expect.arrayContaining([attackerNode.config.port.toString()]),
			);
		});
	});

	describe('Request peerList or nodeInfo more than once', () => {
		it('should ban a peer when it requests getPeers RPC explicitly for more than 10 times', async () => {
			// Arrange
			const attackerNode = p2pNodeList[0];
			const targetNode = p2pNodeList[1];

			const targetPeerId = `127.0.0.1:${targetNode.config.port}`;

			// Act
			// With every getPeers RPC request apply penalty of 10, 10 * 10 times will result in banning
			for (let i = 0; i < 10; i += 1) {
				await wait(1);
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				(async () => {
					try {
						await attackerNode.requestFromPeer(
							{
								procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
							},
							targetPeerId,
						);
						// eslint-disable-next-line no-empty
					} catch (error) {}
				})();
			}

			await wait(10);

			// Assert
			expect(removedPeers.get(targetNode.config.port)).toEqual(
				expect.arrayContaining([attackerNode.config.port.toString()]),
			);
		});

		it('should ban a peer when it requests RPC getNodeInfo explicitly for more than 10 times', async () => {
			// Arrange
			const attackerNode = p2pNodeList[0];
			const targetNode = p2pNodeList[1];

			const targetPeerId = `127.0.0.1:${targetNode.config.port}`;

			// Act
			// With every getNodeInfo RPC request apply penalty of 10, 10 * 10 times will result in banning
			for (let i = 0; i < 10; i += 1) {
				await wait(1);
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				(async () => {
					try {
						await attackerNode.requestFromPeer(
							{
								procedure: REMOTE_EVENT_RPC_GET_NODE_INFO,
							},
							targetPeerId,
						);
						// eslint-disable-next-line no-empty
					} catch (error) {}
				})();
			}

			await wait(10);

			// Assert
			expect(removedPeers.get(targetNode.config.port)).toEqual(
				expect.arrayContaining([attackerNode.config.port.toString()]),
			);
		});
	});
});
