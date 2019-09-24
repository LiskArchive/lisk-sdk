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
	createNetwork,
	destroyNetwork,
	NETWORK_START_PORT,
	NETWORK_PEER_COUNT,
} from '../utils/network_setup';

describe('Cleanup unresponsive peers', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const ALL_NODE_PORTS: ReadonlyArray<number> = [
		...new Array(NETWORK_PEER_COUNT).keys(),
	].map(index => NETWORK_START_PORT + index);

	beforeEach(async () => {
		p2pNodeList = await createNetwork({});
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should remove crashed nodes from network status of other nodes', async () => {
		const initialPeerPorts = p2pNodeList[0]
			.getConnectedPeers()
			.map(peerInfo => peerInfo.wsPort)
			.sort();

		expect(initialPeerPorts).to.be.eql(
			ALL_NODE_PORTS.filter(port => port !== NETWORK_START_PORT),
		);

		await p2pNodeList[0].stop();
		await wait(100);
		await p2pNodeList[1].stop();
		await wait(100);

		const peerPortsAfterPeerCrash = p2pNodeList[2]
			.getConnectedPeers()
			.map(peerInfo => peerInfo.wsPort)
			.sort();

		const expectedPeerPortsAfterPeerCrash = ALL_NODE_PORTS.filter(port => {
			return (
				port !== NETWORK_START_PORT + 1 &&
				port !== NETWORK_START_PORT + 2 &&
				port !== NETWORK_START_PORT
			);
		});

		expect(peerPortsAfterPeerCrash).to.be.eql(expectedPeerPortsAfterPeerCrash);
	});
});
