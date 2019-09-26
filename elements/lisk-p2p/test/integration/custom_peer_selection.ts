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
import {
	P2PPeerSelectionForSendFunction,
	P2PPeerSelectionForRequestFunction,
	P2PPeerSelectionForConnectionFunction,
	P2PPeerSelectionForSendInput,
	P2PPeerSelectionForRequestInput,
	P2PPeerSelectionForConnectionInput,
} from '../../src/p2p_types';
import { PEER_KIND_OUTBOUND, PEER_KIND_INBOUND } from '../../src/constants';

import {
	POPULATOR_INTERVAL,
	createNetwork,
	SEED_PEER_IP,
	destroyNetwork,
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
				peerInfo.kind !== PEER_KIND_INBOUND &&
				peerInfo.kind !== PEER_KIND_OUTBOUND
			) {
				throw new Error(`Invalid peer kind: ${peerInfo.kind}`);
			}
		});

		const filteredPeers = peersList.filter(peer => {
			if (nodeInfo && nodeInfo.height <= peer.height) {
				const nodesModules = nodeInfo.modules
					? (nodeInfo.modules as ReadonlyArray<string>)
					: undefined;
				const peerModules = peer.modules
					? (peer.modules as ReadonlyArray<string>)
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
				peer => peer.height >= (nodeInfo ? nodeInfo.height : 0),
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
			height: 1000 + index,
		});

		const customSeedPeers = (
			index: number,
			startPort: number,
			networkSize: number,
		) =>
			[...new Array(networkSize / 2).keys()]
				.map(index => ({
					ipAddress: SEED_PEER_IP,
					wsPort: startPort + ((index + 2) % networkSize),
				}))
				.filter(seedPeer => seedPeer.wsPort !== startPort + index);

		const customConfig = (
			index: number,
			startPort: number,
			networkSize: number,
		) => ({
			peerSelectionForSend: peerSelectionForSendRequest as P2PPeerSelectionForSendFunction,
			peerSelectionForRequest: peerSelectionForSendRequest as P2PPeerSelectionForRequestFunction,
			peerSelectionForConnection,
			populatorInterval: POPULATOR_INTERVAL,
			maxOutboundConnections: 5,
			maxInboundConnections: 5,
			nodeInfo: customNodeInfo(index),
			seedPeers: customSeedPeers(index, startPort, networkSize),
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
			expect(p2p).to.have.property('isActive', true);
		}
	});

	describe('Peer Discovery', () => {
		it('should run peer discovery successfully', async () => {
			for (let p2p of p2pNodeList) {
				expect(p2p.isActive).to.be.true;
				expect(p2p.getConnectedPeers().length).to.gt(1);
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
			const secondP2PNode = p2pNodeList[1];
			const response = await secondP2PNode.request({
				procedure: 'foo',
				data: 'bar',
			});

			expect(response).to.have.property('data');
			expect(response.data)
				.to.have.property('nodePort')
				.which.is.a('number');
			expect(response.data)
				.to.have.property('requestProcedure')
				.which.is.a('string');
			expect(response.data)
				.to.have.property('requestData')
				.which.is.equal('bar');
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

		it('should send a message to peers; should reach multiple peers with even distribution', async () => {
			const TOTAL_SENDS = 100;
			const firstP2PNode = p2pNodeList[0];
			const nodePortToMessagesMap: any = {};

			const expectedAverageMessagesPerNode = TOTAL_SENDS;
			const expectedMessagesLowerBound = expectedAverageMessagesPerNode * 0.5;
			const expectedMessagesUpperBound = expectedAverageMessagesPerNode * 1.5;

			for (let i = 0; i < TOTAL_SENDS; i++) {
				firstP2PNode.send({ event: 'bar', data: i });
			}

			await wait(100);

			expect(collectedMessages).to.not.to.be.empty;
			for (let receivedMessageData of collectedMessages) {
				if (!nodePortToMessagesMap[receivedMessageData.nodePort]) {
					nodePortToMessagesMap[receivedMessageData.nodePort] = [];
				}
				nodePortToMessagesMap[receivedMessageData.nodePort].push(
					receivedMessageData,
				);
			}

			expect(nodePortToMessagesMap).to.not.to.be.empty;
			for (let receivedMessages of Object.values(
				nodePortToMessagesMap,
			) as any) {
				expect(receivedMessages).to.be.an('array');
				expect(receivedMessages.length).to.be.greaterThan(
					expectedMessagesLowerBound,
				);
				expect(receivedMessages.length).to.be.lessThan(
					expectedMessagesUpperBound,
				);
			}
		});
	});
});
