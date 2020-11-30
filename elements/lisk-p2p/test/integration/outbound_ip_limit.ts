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
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import { P2P } from '../../src/index';
import { createNetwork, destroyNetwork } from '../utils/network_setup';
import { OutboundPeer } from '../../src/peer';
// eslint-disable-next-line import/order
import cloneDeep = require('lodash.clonedeep');

describe('Outbound IP limit', () => {
	const serverSocketPrototypeBackup = cloneDeep(SCServerSocket.prototype);
	let p2pNodeList: ReadonlyArray<P2P> = [];

	beforeAll(() => {
		const serverSocketPrototype = SCServerSocket.prototype as any;
		const realResetPongTimeoutFunction = serverSocketPrototype._resetPongTimeout;
		// eslint-disable-next-line func-names
		serverSocketPrototype._resetPongTimeout = function () {
			const queryObject = url.parse(this.request.url, true).query as any;
			const ipSuffix = queryObject.port - 5000;
			// eslint-disable-next-line no-bitwise
			this.remoteAddress = `127.0.0.${~~(ipSuffix / 2) + 1}`;
			// eslint-disable-next-line prefer-rest-params
			return realResetPongTimeoutFunction.apply(this, arguments);
		};
	});

	beforeEach(async () => {
		const customSeedPeers = (index: number, startPort: number) =>
			index !== 0
				? [
						{
							ipAddress: '127.0.0.1',
							port: startPort,
						},
				  ]
				: [];

		const customConfig = (index: number, startPort: number) => ({
			// eslint-disable-next-line no-bitwise
			hostIp: `127.0.0.${~~((index + 3) / 2)}`,
			seedPeers: customSeedPeers(index, startPort),
		});

		/*
		Network setup:
		IP  , Port , ConnectedPeers
		127.0.0.1 5000 8 <-- Only Seed Peer for every Node
		127.0.0.2 5001 5
		127.0.0.2 5002 5
		127.0.0.3 5003 5
		127.0.0.3 5004 5
		127.0.0.4 5005 5
		127.0.0.4 5006 5
		127.0.0.5 5007 5
		127.0.0.5 5008 5
		*/

		p2pNodeList = await createNetwork({ networkSize: 9, customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should not have multiple Outbound connection for same IP addresses', () => {
		for (const p2p of p2pNodeList) {
			const uniqIpAddresses: Array<string> = [];
			p2p['_peerPool'].getPeers(OutboundPeer).map(peer => uniqIpAddresses.push(peer.ipAddress));

			expect([...new Set(uniqIpAddresses)]).toHaveLength(
				p2p['_peerPool'].getPeers(OutboundPeer).length,
			);
		}
	});

	afterAll(() => {
		SCServerSocket.prototype = serverSocketPrototypeBackup;
	});
});
