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
import { P2P, EVENT_MESSAGE_RECEIVED } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

describe('P2P.broadcast', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

		collectedMessages = [];
		for (let p2p of p2pNodeList) {
			p2p.on(EVENT_MESSAGE_RECEIVED, message => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					message,
				});
			});
		}
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send a message to every connected peer', async () => {
		const firstP2PNode = p2pNodeList[0];
		const nodePortToMessagesMap: any = {};

		firstP2PNode.broadcast({ event: 'bar', data: 'test' });
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
		for (let receivedMessages of Object.values(nodePortToMessagesMap) as any) {
			expect(receivedMessages)
				.to.be.an('array')
				.to.have.lengthOf(1);
		}
	});

	it('should receive a message in the correct format', async () => {
		const firstP2PNode = p2pNodeList[0];
		firstP2PNode.broadcast({ event: 'bar', data: 'test' });

		await wait(100);

		expect(collectedMessages).to.be.an('array');
		expect(collectedMessages.length).to.be.eql(9);
		expect(collectedMessages[0]).to.have.property('message');
		expect(collectedMessages[0].message)
			.to.have.property('event')
			.which.is.equal('bar');
		expect(collectedMessages[0].message)
			.to.have.property('data')
			.which.is.equal('test');
		expect(collectedMessages[0].message)
			.to.have.property('peerId')
			.which.is.equal(`127.0.0.1:${firstP2PNode.nodeInfo.wsPort}`);
	});
});
