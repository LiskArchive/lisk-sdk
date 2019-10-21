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
import { P2P, EVENT_UPDATED_PEER_INFO } from '../../../src/index';
import {
	createNetwork,
	destroyNetwork,
	nodeInfoConstants,
	NETWORK_START_PORT,
	SEED_PEER_IP,
} from '../../utils/network_setup';
import { wait } from 'utils/helpers';

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

describe('NodeInfo actions', () => {
	let p2pNodeList: P2P[] = [];
	const collectedEvents = new Map();

	beforeEach(async () => {
		p2pNodeList = await createNetwork({ networkSize: 2 });

		const secondP2PNode = p2pNodeList[1];

		secondP2PNode.on(EVENT_UPDATED_PEER_INFO, peerInfo => {
			collectedEvents.set(EVENT_UPDATED_PEER_INFO, peerInfo);
		});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should create correct Nodeinfo at P2P construct()', async () => {
		const firstP2PNode = p2pNodeList[0];

		expect(firstP2PNode.nodeInfo)
			.to.have.property('os')
			.which.equals(nodeInfoConstants.os);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('nethash')
			.which.equals(nodeInfoConstants.nethash);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('broadhash')
			.which.equals(nodeInfoConstants.broadhash);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('version')
			.which.equals(nodeInfoConstants.version);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('protocolVersion')
			.which.equals(nodeInfoConstants.protocolVersion);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('minVersion')
			.which.equals(nodeInfoConstants.minVersion);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('wsPort')
			.which.equals(NETWORK_START_PORT);
		expect(firstP2PNode.nodeInfo)
			.to.have.property('height')
			.which.equals(nodeInfoConstants.height);
		expect(firstP2PNode.nodeInfo).to.not.have.property('options');
		expect(firstP2PNode.nodeInfo)
			.to.have.property('nonce')
			.which.equals(`${nodeInfoConstants.nonce}${NETWORK_START_PORT}`);
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

	it(`should fire ${EVENT_UPDATED_PEER_INFO} for connected peers`, async () => {
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

		await wait(300);

		console.log(collectedEvents.get(EVENT_UPDATED_PEER_INFO));

		expect(collectedEvents.get(EVENT_UPDATED_PEER_INFO)).to.have.property(
			'sharedState',
		);

		const sharedState = collectedEvents.get(EVENT_UPDATED_PEER_INFO)
			.sharedState;

		expect(sharedState)
			.to.have.property('os')
			.which.equals(NEW_OS);
		expect(sharedState)
			.to.have.property('nethash')
			.which.equals(NEW_NETHASH);
		expect(sharedState)
			.to.have.property('broadhash')
			.which.equals(NEW_BROADHASH);
		expect(sharedState)
			.to.have.property('version')
			.which.equals(NEW_VERSION);
		expect(sharedState)
			.to.have.property('protocolVersion')
			.which.equals(NEW_PROTOCOLVERSION);
		expect(sharedState)
			.to.have.property('minVersion')
			.which.equals(NEW_MIN_VERSION);
		expect(collectedEvents.get(EVENT_UPDATED_PEER_INFO))
			.to.have.property('wsPort')
			.which.equals(NETWORK_START_PORT);
		expect(sharedState)
			.to.have.property('height')
			.which.equals(NEW_HEIGHT);
		expect(sharedState)
			.to.have.property('nonce')
			.which.equals(NEW_NONCE);
		expect(collectedEvents.get(EVENT_UPDATED_PEER_INFO))
			.to.have.property('internalState')
			.which.equals(undefined);
		expect(collectedEvents.get(EVENT_UPDATED_PEER_INFO))
			.to.have.property('ipAddress')
			.which.equals(SEED_PEER_IP);
		expect(collectedEvents.get(EVENT_UPDATED_PEER_INFO))
			.to.have.property('peerId')
			.which.equals(`${SEED_PEER_IP}:${NETWORK_START_PORT}`);
	});
});
