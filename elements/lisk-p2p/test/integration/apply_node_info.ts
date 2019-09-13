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
import { P2P, EVENT_REQUEST_RECEIVED } from '../../src/index';
import { wait } from '../utils/helpers';
import { platform } from 'os';
import { createNetwork, destroyNetwork } from './setup';

describe.only('P2P.applyNodeInfo', () => {
	let p2pNodeList: P2P[] = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork({});

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on(EVENT_REQUEST_RECEIVED, request => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					request,
				});
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send the node info to peers', async () => {
		const firstP2PNode = p2pNodeList[0];
		const nodePortToMessagesMap: any = {};

		firstP2PNode.applyNodeInfo({
			os: platform(),
			nethash:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			version: firstP2PNode.nodeInfo.version,
			protocolVersion: '1.1',
			wsPort: firstP2PNode.nodeInfo.wsPort,
			height: 10,
			options: firstP2PNode.nodeInfo.options,
		});

		await wait(200);

		// Each peer of firstP2PNode should receive a message.
		expect(collectedMessages.length).to.equal(9);

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
				expect(receivedMessages.length).to.be.equal(1);
				expect(receivedMessages[0].request).to.have.property('data');
				expect(receivedMessages[0].request.data)
					.to.have.property('height')
					.which.equals(10);
			});

		// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
		for (let p2pNode of p2pNodeList.slice(1)) {
			const firstP2PNodePeerInfo = p2pNode
				.getConnectedPeers()
				.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);
			expect(firstP2PNodePeerInfo).to.exist;
			expect(firstP2PNodePeerInfo)
				.to.have.property('height')
				.which.equals(10);
		}
	});

	it('should update itself and reflect new node info', async () => {
		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.applyNodeInfo({
			os: platform(),
			nethash:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			version: firstP2PNode.nodeInfo.version,
			protocolVersion: '1.1',
			wsPort: firstP2PNode.nodeInfo.wsPort,
			height: 10,
			options: firstP2PNode.nodeInfo.options,
		});

		await wait(200);

		// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
		for (let p2pNode of p2pNodeList.slice(1)) {
			const firstNodeInConnectedPeer = p2pNode
				.getConnectedPeers()
				.find(peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort);

			const allPeersList = p2pNode['_peerBook'].getAllPeers();

			const firstNodeInAllPeersList = allPeersList.find(
				peerInfo => peerInfo.wsPort === firstP2PNode.nodeInfo.wsPort,
			);

			// Check if the peerinfo is updated in new peer list
			if (firstNodeInAllPeersList) {
				expect(firstNodeInAllPeersList)
					.to.have.property('height')
					.which.equals(10);
				expect(firstNodeInAllPeersList)
					.to.have.property('nethash')
					.which.equals(
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					);
			}

			// Check if the peerinfo is updated in connected peer list
			if (firstNodeInConnectedPeer) {
				expect(firstNodeInConnectedPeer)
					.to.have.property('height')
					.which.equals(10);
				expect(firstNodeInConnectedPeer)
					.to.have.property('nethash')
					.which.equals(
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
					);
			}
		}
	});
});
