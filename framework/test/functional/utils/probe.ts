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
import { customNodeInfoSchema } from '../../../src/application/network/schema';

export const createProbe = async (config: ApplicationConfig): Promise<P2P> => {
	const p2p = new P2P({
		port: 1111,
		customNodeInfoSchema,
		nodeInfo: {
			networkVersion: config.protocolVersion,
			advertiseAddress: true,
			networkId: config.networkId,
			nonce: 'O2wTkjqplHII',
			options: {
				height: 3,
			},
		},
		seedPeers: [
			{
				ipAddress: '127.0.0.1',
				port: config.network.port,
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
