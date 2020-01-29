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
import { P2P, constants } from '../../src/index';
import { wait } from '../utils/helpers';
import {
	P2PPeerSelectionForSendFunction,
	P2PPeerSelectionForRequestFunction,
	P2PPeerSelectionForConnectionFunction,
	P2PPeerSelectionForSendInput,
	P2PPeerSelectionForRequestInput,
	P2PPeerSelectionForConnectionInput,
} from '../../src/p2p_types';

const { ConnectionKind } = constants;

import {
	createNetwork,
	destroyNetwork,
	NETWORK_PEER_COUNT,
} from '../utils/network_setup';

describe('Custom peer selection', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];

	// Custom selection function that finds peers having common values for modules field for example.
	const peerSelectionForSendRequest:
		| P2PPeerSelectionForSendFunction
		| P2PPeerSelectionForRequestFunction = (
		input: P2PPeerSelectionForSendInput | P2PPeerSelectionForRequestInput,
	) => {
		const { peers: peersList, nodeInfo } = input;

		peersList.forEach(peerInfo => {
			if (
				peerInfo.internalState &&
				peerInfo.internalState.connectionKind !== ConnectionKind.INBOUND &&
				peerInfo.internalState.connectionKind !== ConnectionKind.OUTBOUND
			) {
				throw new Error(
					`Invalid peer kind: ${peerInfo.internalState.connectionKind}`,
				);
			}
		});

		const filteredPeers = peersList.filter(peer => {
			const { sharedState } = peer;
			const peerHeight = sharedState ? (sharedState.height as number) : 0;
			if (
				nodeInfo &&
				peer.sharedState &&
				(nodeInfo.height as number) <= peerHeight
			) {
				const nodesModules = nodeInfo.modules
					? (nodeInfo.modules as ReadonlyArray<string>)
					: undefined;
				const peerModules = peer.sharedState.modules
					? (peer.sharedState.modules as ReadonlyArray<string>)
					: undefined;

				if (
					nodesModules &&
					peerModules &&
					nodesModules.filter(value => peerModules.includes(value)).length > 0
				) {
					return true;
				}
			}

			return false;
		});

		// In case there are no peers with same modules or less than 30% of the peers are selected then use only height to select peers
		if (
			filteredPeers.length === 0 ||
			(filteredPeers.length / peersList.length) * 100 < 30
		) {
			return peersList.filter(
				peer =>
					peer.sharedState &&
					(peer.sharedState.height as number) >=
						(nodeInfo ? (nodeInfo.height as number) : 0),
			);
		}

		return filteredPeers;
	};
	// Custom Peer selection for connection that returns all the peers
	const peerSelectionForConnection: P2PPeerSelectionForConnectionFunction = (
		input: P2PPeerSelectionForConnectionInput,
	) => [...input.newPeers, ...input.triedPeers];

	beforeEach(async () => {
		const customNodeInfo = (index: number) => ({
			modules: index % 2 === 0 ? ['fileTransfer'] : ['socialSite'],
			height: 1000 + (index % 2),
		});

		const customConfig = (index: number) => ({
			peerSelectionForSend: peerSelectionForSendRequest as P2PPeerSelectionForSendFunction,
			peerSelectionForRequest: peerSelectionForSendRequest as P2PPeerSelectionForRequestFunction,
			peerSelectionForConnection: peerSelectionForConnection as P2PPeerSelectionForConnectionFunction,
			nodeInfo: customNodeInfo(index),
		});

		p2pNodeList = await createNetwork({
			customConfig,
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should start all the nodes with custom selection functions without fail', async () => {
		for (let p2p of p2pNodeList) {
			expect(p2p).toHaveProperty('isActive', true);
		}
	});

	describe('Peer Discovery', () => {
		it('should run peer discovery successfully', async () => {
			for (let p2p of p2pNodeList) {
				expect(p2p.isActive).toBe(true);
				expect(p2p.getConnectedPeers().length).toBeGreaterThan(1);
			}
		});
	});

	describe('P2P.request', () => {
		beforeEach(() => {
			for (let p2p of p2pNodeList) {
				// Collect port numbers to check which peer handled which request.
				p2p.on('requestReceived', request => {
					if (!request.wasResponseSent) {
						request.end({
							nodePort: p2p.nodeInfo.wsPort,
							requestProcedure: request.procedure,
							requestData: request.data,
						});
					}
				});
			}
		});

		it('should make a request to the network; it should reach a single peer based on custom selection function', async () => {
			const middleP2PNode = p2pNodeList[NETWORK_PEER_COUNT / 2];
			const response = await middleP2PNode.request({
				procedure: 'foo',
				data: 'bar',
			});

			expect(response).toHaveProperty('data');

			expect(response).toMatchObject({
				data: {
					nodePort: expect.any(Number),
					requestProcedure: expect.any(String),
					requestData: 'bar',
				},
			});
		});
	});

	describe('P2P.send', () => {
		let collectedMessages: Array<any> = [];

		beforeEach(() => {
			collectedMessages = [];
			for (let p2p of p2pNodeList) {
				p2p.on('messageReceived', message => {
					collectedMessages.push({
						nodePort: p2p.nodeInfo.wsPort,
						message,
					});
				});
			}
		});

		// TODO: #3389 Improve network test to be fast and stable, it can fail randomly depend on network shuffle
		it('should send a message to peers; should reach multiple peers with even distribution', async () => {
			const TOTAL_SENDS = 100;
			const middleP2PNode = p2pNodeList[NETWORK_PEER_COUNT / 2];
			const nodePortToMessagesMap: any = {};

			const expectedAverageMessagesPerNode = TOTAL_SENDS;
			const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
			const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				middleP2PNode.send({ event: 'bar', data: i });
			}

			await wait(100);

			expect(Object.keys(collectedMessages)).not.toBeEmpty;
			for (let receivedMessageData of collectedMessages) {
				if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
					nodePortToMessagesMap[receivedMessageData.nodePort] = [];
				}
				nodePortToMessagesMap[receivedMessageData.nodePort].push(
					receivedMessageData,
				);
			}

			expect(Object.keys(nodePortToMessagesMap)).toHaveLength(
				NETWORK_PEER_COUNT / 2 - 1,
			);
			for (let receivedMessages of Object.values(
				nodePortToMessagesMap,
			) as any) {
				expect(receivedMessages).toEqual(expect.any(Array));
				expect(receivedMessages.length).toBeGreaterThan(
					expectedMessagesLowerBound,
				);
				expect(receivedMessages.length).toBeLessThan(
					expectedMessagesUpperBound,
				);
			}
		});
	});
});
