/*
 * Copyright © 2020 Lisk Foundation
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
 */

import { P2P, events } from '@liskhq/lisk-p2p';
import { ApplicationConfig } from '../../../src';

export const createProbe = async (config: ApplicationConfig): Promise<P2P> => {
	const p2p = new P2P({
		nodeInfo: {
			protocolVersion: config.protocolVersion,
			advertiseAddress: true,
			wsPort: 1111,
			networkId: config.networkId,
			height: 3,
			nonce: 'O2wTkjqplHII',
			os: 'test-os',
			version: config.version,
		},
		seedPeers: [
			{
				ipAddress: '127.0.0.1',
				wsPort: config.network.wsPort,
			},
		],
		populatorInterval: 50,
		maxInboundConnections: 0,
	});
	const networkReady = new Promise(resolve => {
		p2p.on(events.EVENT_NETWORK_READY, resolve);
	});
	await p2p.start();
	await networkReady;

	return p2p;
};
