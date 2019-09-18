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
import { platform } from 'os';

describe('Maximum payload', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let collectedMessages: Array<any> = [];
	let disconnectReasons: Array<any> = [];
	let dataLargerThanMaxPayload: Array<string>;
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;

	beforeEach(async () => {
		dataLargerThanMaxPayload = [];
		for (let i = 0; i < 6000; i++) {
			dataLargerThanMaxPayload.push(`message${i}`);
		}
		p2pNodeList = [...new Array(NETWORK_PEER_COUNT / 2).keys()].map(index => {
			const seedPeers = [
				{
					ipAddress: '127.0.0.1',
					wsPort: NETWORK_START_PORT + ((index - 2) % NETWORK_PEER_COUNT),
				},
			];

			const nodePort = NETWORK_START_PORT + index;

			return new P2P({
				blacklistedPeers: [],
				connectTimeout: 500,
				ackTimeout: 500,
				seedPeers,
				populatorInterval: 30,
				maxOutboundConnections: 10,
				maxInboundConnections: 30,
				wsEngine: 'ws',
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
				wsMaxPayload: 5000,
			});
		});

		await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
		await wait(300);
		collectedMessages = [];
		p2pNodeList.forEach(p2p => {
			p2p.on('messageReceived', message => {
				collectedMessages.push({
					nodePort: p2p.nodeInfo.wsPort,
					message,
				});
			});

			p2p.on('closeInbound', packet => {
				disconnectReasons.push({
					peerPort: packet.peerInfo.wsPort,
					code: packet.code,
					reason: packet.reason,
				});
			});

			p2p.on('closeOutbound', packet => {
				disconnectReasons.push({
					peerPort: packet.peerInfo.wsPort,
					code: packet.code,
					reason: packet.reason,
				});
			});
		});
	});

	afterEach(async () => {
		await Promise.all(
			p2pNodeList.filter(p2p => p2p.isActive).map(p2p => p2p.stop()),
		);
		await wait(100);
	});

	it('should not send a package larger than the ws max payload', async () => {
		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.send({
			event: 'maxPayload',
			data: dataLargerThanMaxPayload,
		});
		await wait(100);

		expect(collectedMessages).to.be.empty;
	});

	it('should disconnect the peer which has sent the message', async () => {
		const firstP2PNode = p2pNodeList[0];
		firstP2PNode.send({
			event: 'maxPayload',
			data: dataLargerThanMaxPayload,
		});

		await wait(300);

		const disconnectMaxPayload = disconnectReasons.filter(
			packet =>
				packet.reason === 'Message was too big to process' &&
				packet.code === 1009 &&
				packet.peerPort === 5000,
		);

		expect(disconnectMaxPayload).length.gt(0);
		expect(disconnectMaxPayload[0])
			.is.an('object')
			.has.property('code')
			.eql(1009);
		expect(disconnectMaxPayload[0])
			.has.property('reason')
			.eql('Message was too big to process');
	});
});
