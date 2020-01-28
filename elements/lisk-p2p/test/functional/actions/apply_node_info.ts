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
import { P2P, events } from '../../../src/index';
import { InvalidNodeInfoError } from '../../../src/errors';
import { wait } from '../../utils/helpers';
import { platform } from 'os';
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

const { EVENT_MESSAGE_RECEIVED, REMOTE_EVENT_POST_NODE_INFO } = events;

describe('P2P.applyNodeInfo', () => {
	let p2pNodeList: P2P[] = [];
	let collectedMessages: Array<any> = [];

	beforeAll(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on(EVENT_MESSAGE_RECEIVED, request => {
				if (request.event === REMOTE_EVENT_POST_NODE_INFO) {
					collectedMessages.push({
						nodePort: p2p.nodeInfo.wsPort,
						request,
					});
				}
			});
		}

		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.applyNodeInfo({
			os: platform(),
			networkId:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			version: firstP2PNode.nodeInfo.version,
			protocolVersion: '1.1',
			wsPort: firstP2PNode.nodeInfo.wsPort,
			height: 10,
			options: firstP2PNode.nodeInfo.options,
			nonce: 'nonce',
			advertiseAddress: true,
		});

		await wait(200);
	});

	afterAll(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should throw error when applying too large NodeInfo', async () => {
		const firstP2PNode = p2pNodeList[0];

		expect(() =>
			firstP2PNode.applyNodeInfo({
				os: platform(),
				networkId:
					'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
				version: firstP2PNode.nodeInfo.version,
				protocolVersion: '1.1',
				wsPort: firstP2PNode.nodeInfo.wsPort,
				options: firstP2PNode.nodeInfo.options,
				junk: '1.'.repeat(13000),
				nonce: 'nonce',
				advertiseAddress: true,
			}),
		).toThrowError(InvalidNodeInfoError);
	});

	it('should send the node info to peers', async () => {
		const firstP2PNode = p2pNodeList[0];
		const nodePortToMessagesMap: any = {};

		const connectedPeerCount = firstP2PNode.getConnectedPeers().length;

		// Each peer of firstP2PNode should receive a message.
		expect(collectedMessages.length).toBe(connectedPeerCount);

		for (let receivedMessageData of collectedMessages) {
			if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
				nodePortToMessagesMap[receivedMessageData.nodePort] = [];
			}
			nodePortToMessagesMap[receivedMessageData.nodePort].push(
				receivedMessageData,
			);
		}

		// Check that each message contains the updated P2PNodeInfo.
		Object.values(nodePortToMessagesMap)
			.filter(
				(receivedMessages: any) =>
					receivedMessages &&
					receivedMessages[0] &&
					receivedMessages[0].nodePort !== firstP2PNode.nodeInfo.wsPort,
			)
			.forEach((receivedMessages: any) => {
				expect(receivedMessages.length).toBe(1);

				expect(receivedMessages[0].request).toMatchObject({
					data: { height: 10 },
				});
			});

		// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
		for (let p2pNode of p2pNodeList.slice(1)) {
			const firstP2PNodePeerInfo = p2pNode
				.getConnectedPeers()
				.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);
			expect(firstP2PNodePeerInfo).toMatchObject({
				advertiseAddress: true,
				height: 10,
				ipAddress: '127.0.0.1',
				networkId:
					'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
				peerId: '127.0.0.1:5000',
				wsPort: 5000,
			});
		}
	});

	it('should update itself and reflect new node info', async () => {
		const firstP2PNode = p2pNodeList[0];

		// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
		for (let p2pNode of p2pNodeList.slice(1)) {
			const firstNodeInConnectedPeer = p2pNode
				.getConnectedPeers()
				.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);

			const allPeersList = p2pNode['_peerBook'].allPeers;

			const firstNodeInAllPeersList = allPeersList.find(
				peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
			);

			// Check if the peerinfo is updated in new peer list
			if (firstNodeInAllPeersList) {
				expect(firstNodeInAllPeersList).toMatchObject({
					sharedState: {
						height: 10,
						networkId:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						nonce: expect.any(String),
						advertiseAddress: true,
					},
					ipAddress: '127.0.0.1',
					wsPort: 5000,
					peerId: '127.0.0.1:5000',
				});
			}

			// Check if the peerinfo is updated in connected peer list
			if (firstNodeInConnectedPeer) {
				expect(firstNodeInConnectedPeer).toMatchObject({
					height: 10,
					networkId:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					nonce: expect.any(String),
					advertiseAddress: true,
					ipAddress: '127.0.0.1',
					wsPort: 5000,
					peerId: '127.0.0.1:5000',
				});
			}
		}
	});
});
