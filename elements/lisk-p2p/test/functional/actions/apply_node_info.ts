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
import { P2P, EVENT_REQUEST_RECEIVED } from '../../../src/index';
import { createNetwork, destroyNetwork } from '../../utils/network_setup';

const NEW_OS = 'TestOS';
const NEW_NETHASH =
	'NEWda3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158';
const NEW_BROADHASH =
	'NEW2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e5';
const NEW_VERSION = '0.0.0';
const NEW_PROTOCOLVERSION = '0.0';
const NEW_MIN_VERSION = '0.1';
const NEW_WSPORT = 6000;
const NEW_HEIGHT = 10;
const NEW_OPTIONS = { testOption: 'foo' };
const NEW_NONCE = `abcdefghijklmnop`;

describe('ApplyNodeInfo', () => {
	let p2pNodeList: P2P[] = [];
	let collectedMessages: Array<any> = [];

	beforeEach(async () => {
		p2pNodeList = await createNetwork();

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

	it('should update every node info field itself', async () => {
		const firstP2PNode = p2pNodeList[0];

		firstP2PNode.applyNodeInfo({
			os: NEW_OS,
			nethash: NEW_NETHASH,
			broadhash: NEW_BROADHASH,
			version: NEW_VERSION,
			protocolVersion: NEW_PROTOCOLVERSION,
			minVersion: NEW_MIN_VERSION,
			wsPort: NEW_WSPORT,
			height: NEW_HEIGHT,
			options: NEW_OPTIONS,
			nonce: NEW_NONCE,
		});

		expect(firstP2PNode.nodeInfo)
			.to.have.property('os')
			.which.equals(NEW_OS);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('nethash')
			.which.equals(NEW_NETHASH);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('broadhash')
			.which.equals(NEW_BROADHASH);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('version')
			.which.equals(NEW_VERSION);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('protocolVersion')
			.which.equals(NEW_PROTOCOLVERSION);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('minVersion')
			.which.equals(NEW_MIN_VERSION);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('wsPort')
			.which.equals(NEW_WSPORT);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('height')
			.which.equals(NEW_HEIGHT);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('options')
			.which.equals(NEW_OPTIONS);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('nonce')
			.which.equals(NEW_NONCE);
	});
});
