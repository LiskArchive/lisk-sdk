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
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork, NETWORK_START_PORT } from '../utils/network_setup';

describe('Maximum transactions', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
	const disconnectReasons: Array<any> = [];
	let dataLargerThanMaxPayload: Array<string>;

	beforeEach(async () => {
		dataLargerThanMaxPayload = [];
		for (let i = 0; i < 1000; i += 1) {
			dataLargerThanMaxPayload.push(`message${i}`);
		}

		const customConfig = (_index: number) => ({
			wsMaxPayload: 5000,
		});
		p2pNodeList = await createNetwork({ customConfig });

		collectedMessages = [];

		p2pNodeList.forEach(p2p => {
			p2p.on('EVENT_MESSAGE_RECEIVED', message => {
				if (message.event === 'maxPayload') {
					collectedMessages.push({
						nodePort: p2p.config.port,
						message,
					});
				}
			});

			p2p.on('EVENT_CLOSE_INBOUND', packet => {
				disconnectReasons.push({
					peerPort: packet.peerInfo.port,
					code: packet.code,
					reason: packet.reason,
				});
			});

			p2p.on('EVENT_CLOSE_OUTBOUND', packet => {
				disconnectReasons.push({
					peerPort: packet.peerInfo.port,
					code: packet.code,
					reason: packet.reason,
				});
			});
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should not send a package larger than the ws max transactions', async () => {
		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.send({
			event: 'maxPayload',
			data: dataLargerThanMaxPayload,
		});
		await wait(100);

		expect(Object.keys(collectedMessages)).toHaveLength(0);
	});

	it('should disconnect the peer which has sent the message', async () => {
		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.send({
			event: 'maxPayload',
			data: dataLargerThanMaxPayload,
		});

		await wait(100);

		const disconnectMaxPayload = disconnectReasons.filter(
			packet =>
				packet.reason === 'Message was too big to process' &&
				packet.code === 1009 &&
				packet.peerPort === NETWORK_START_PORT,
		);

		expect(disconnectMaxPayload.length).toBeGreaterThan(0);

		expect(disconnectMaxPayload[0]).toMatchObject({
			code: 1009,
			reason: 'Message was too big to process',
		});
	});
});
