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
	EVENT_FAILED_TO_SEND_MESSAGE,
	EVENT_INVALID_MESSAGE_RECEIVED,
} from '../../../src/index';
import { createNetwork, destroyNetwork } from 'utils/network_setup';
import { wait } from 'utils/helpers';

const MSG_EVENT = 'foo';
const MSG_DATA = 'bar';

describe('Message', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 2 });

		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.on(EVENT_MESSAGE_RECEIVED, msg => {
			collectedEvents.set(EVENT_MESSAGE_RECEIVED, msg);
		});

		firstP2PNode.on(EVENT_FAILED_TO_SEND_MESSAGE, resp => {
			collectedEvents.set(EVENT_FAILED_TO_SEND_MESSAGE, resp);
		});

		firstP2PNode.on(EVENT_INVALID_MESSAGE_RECEIVED, resp => {
			collectedEvents.set(EVENT_INVALID_MESSAGE_RECEIVED, resp);
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should send a message to the network; it should reach atleast a single peer', async () => {
		const secondP2PNode = p2pNodeList[1];

		secondP2PNode.send({
			event: MSG_EVENT,
			data: MSG_DATA,
		});

		await wait(300);

		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('event')
			.which.is.equal(MSG_EVENT);
		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('data')
			.which.is.equal(MSG_DATA);
		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('peerId')
			.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('rate')
			.which.is.equal(0);
	});

	it('should send a message to a given peer', async () => {
		const secondP2PNode = p2pNodeList[1];

		const FirstPeer = secondP2PNode.getConnectedPeers()[0];
		const PeerId = `${FirstPeer.ipAddress}:${FirstPeer.wsPort}`;

		secondP2PNode.sendToPeer(
			{
				event: MSG_EVENT,
				data: MSG_DATA,
			},
			PeerId,
		);

		await wait(300);

		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('event')
			.which.is.equal(MSG_EVENT);
		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('data')
			.which.is.equal(MSG_DATA);
		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('peerId')
			.which.is.equal(`127.0.0.1:${secondP2PNode.nodeInfo.wsPort}`);
		expect(collectedEvents.get(EVENT_MESSAGE_RECEIVED))
			.to.have.property('rate')
			.which.is.equal(0);
	});
});
