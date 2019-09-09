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

describe('P2P.applyNodeInfo', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
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
		await Promise.all(
			p2pNodeList
				.filter(p2p => p2p.isActive)
				.map(async p2p => await p2p.stop()),
		);
		await wait(1000);
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
