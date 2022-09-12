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
import { createNetwork, destroyNetwork } from '../../utils/network_setup';
import { P2PConfig } from '../../../src/types';

const { EVENT_MESSAGE_RECEIVED, REMOTE_EVENT_POST_NODE_INFO } = events;

const customNodeInfoSchema = {
	$id: '/junk',
	type: 'object',
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		junk: {
			dataType: 'string',
			fieldNumber: 2,
		},
	},
};

describe('P2P.applyNodeInfo', () => {
	let p2pNodeList: P2P[] = [];
	let collectedMessages: Array<any> = [];

	beforeAll(async () => {
		const customConfig = (): Partial<P2PConfig> => ({
			customNodeInfoSchema,
			nodeInfo: {
				options: {
					height: 1,
					junk: 'some junk',
				},
			} as any,
		});

		p2pNodeList = await createNetwork({ customConfig, networkSize: 4 });

		collectedMessages = [];
		for (const p2p of p2pNodeList) {
			// eslint-disable-next-line no-loop-func
			p2p.on(EVENT_MESSAGE_RECEIVED, request => {
				if (request.event === REMOTE_EVENT_POST_NODE_INFO && request.peerId === '127.0.0.1:5000') {
					collectedMessages.push({
						nodePort: p2p.config.port,
						request,
					});
				}
			});
		}

		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.applyNodeInfo({
			chainID: Buffer.from('10000000', 'hex'),
			networkVersion: '1.1',
			advertiseAddress: true,
			options: {
				height: 10,
				junk: '',
			},
		});

		await wait(200);
	});

	afterAll(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should throw error when applying too large NodeInfo', () => {
		const firstP2PNode = p2pNodeList[0];

		expect(() =>
			firstP2PNode.applyNodeInfo({
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				advertiseAddress: true,
				options: {
					height: 0,
					junk: '1.'.repeat(130000),
				},
			}),
		).toThrow(InvalidNodeInfoError);
	});

	it('should send the node info to peers', () => {
		const firstP2PNode = p2pNodeList[0];
		const nodePortToMessagesMap: any = {};

		const connectedPeerCount = firstP2PNode.getConnectedPeers().length;
		// Each peer of firstP2PNode should receive a message.
		expect(collectedMessages).toHaveLength(connectedPeerCount);

		for (const receivedMessageData of collectedMessages) {
			if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
				nodePortToMessagesMap[receivedMessageData.nodePort] = [];
			}
			nodePortToMessagesMap[receivedMessageData.nodePort].push(receivedMessageData);
		}

		// Check that each message contains the updated P2PNodeInfo.
		Object.values(nodePortToMessagesMap)
			.filter(
				(receivedMessages: any) =>
					receivedMessages?.[0] && receivedMessages[0].nodePort !== firstP2PNode.config.port,
			)
			.forEach((receivedMessages: any) => {
				expect(receivedMessages).toHaveLength(1);

				expect(receivedMessages[0].request).toMatchObject({
					data: {
						chainID: Buffer.from('10000000', 'hex'),
						networkVersion: '1.1',
						nonce: firstP2PNode.nodeInfo.nonce,
						advertiseAddress: true,
					},
				});
			});

		// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
		for (const p2pNode of p2pNodeList.slice(1)) {
			const firstP2PNodePeerInfo = p2pNode
				.getConnectedPeers()
				.find(peerInfo => peerInfo.port === firstP2PNode.config.port);
			expect(firstP2PNodePeerInfo).toMatchObject({
				options: {
					height: 10,
					junk: '',
				},
				ipAddress: '127.0.0.1',
				chainID: Buffer.from('10000000', 'hex'),
				peerId: '127.0.0.1:5000',
				port: 5000,
			});
		}
	});

	it('should update itself and reflect new node info', () => {
		const firstP2PNode = p2pNodeList[0];

		// For each peer of firstP2PNode, check that the firstP2PNode's P2PPeerInfo was updated with the new height.
		for (const p2pNode of p2pNodeList.slice(1)) {
			const firstNodeInConnectedPeer = p2pNode
				.getConnectedPeers()
				.find(peerInfo => peerInfo.port === firstP2PNode.config.port);

			const allPeersList = p2pNode['_peerBook'].allPeers;

			const firstNodeInAllPeersList = allPeersList.find(
				peerInfo => peerInfo.port === firstP2PNode.config.port,
			);

			// Check if the peerinfo is updated in new peer list
			if (firstNodeInAllPeersList) {
				expect(firstNodeInAllPeersList).toMatchObject({
					sharedState: {
						chainID: Buffer.from('10000000', 'hex'),
						nonce: expect.any(String),
					},
					ipAddress: '127.0.0.1',
					port: 5000,
					peerId: '127.0.0.1:5000',
				});
			}

			// Check if the peerinfo is updated in connected peer list
			if (firstNodeInConnectedPeer) {
				expect(firstNodeInConnectedPeer).toMatchObject({
					chainID: Buffer.from('10000000', 'hex'),
					nonce: expect.any(String),
					ipAddress: '127.0.0.1',
					port: 5000,
					peerId: '127.0.0.1:5000',
				});
			}
		}
	});
});
