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
import cloneDeep = require('lodash.clonedeep');
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import { createNetwork, destroyNetwork } from 'utils/network_setup';
import { OutboundPeer } from '../../src/peer';
import { uniq } from 'lodash';

describe('Outbound IP limit', () => {
	const serverSocketPrototypeBackup = cloneDeep(SCServerSocket.prototype);
	let p2pNodeList: ReadonlyArray<P2P> = [];

	before(async () => {
		const serverSocketPrototype = SCServerSocket.prototype as any;
		const realResetPongTimeoutFunction =
			serverSocketPrototype._resetPongTimeout;
		serverSocketPrototype._resetPongTimeout = function() {
			const queryObject = url.parse(this.request.url, true).query as any;
			let ipSuffix = queryObject.wsPort - 5000;
			this.remoteAddress = `127.0.0.${~~(ipSuffix / 2) + 1}`;
			return realResetPongTimeoutFunction.apply(this, arguments);
		};
	});

	beforeEach(async () => {
		const customSeedPeers = (index: number, startPort: number) =>
			index !== 0
				? [
						{
							ipAddress: '127.0.0.1',
							wsPort: startPort,
						},
				  ]
				: [];

		const customConfig = (index: number, startPort: number) => ({
			hostIp: '127.0.0.' + ~~((index + 3) / 2),
			seedPeers: customSeedPeers(index, startPort),
		});

		p2pNodeList = await createNetwork({ networkSize: 9, customConfig });
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should not have multiple Outbound connection for same IP addresses', async () => {
		for (let p2p of p2pNodeList) {
			const outboundIPs = p2p['_peerPool']
				.getPeers(OutboundPeer)
				.map(peer => peer.ipAddress);

			expect(uniq(outboundIPs).length).to.equal(
				p2p['_peerPool'].getPeers(OutboundPeer).length,
			);
		}
	});

	after(async () => {
		SCServerSocket.prototype = serverSocketPrototypeBackup;
	});
});
