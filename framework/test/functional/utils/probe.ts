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
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209

// import { P2P, events } from '@liskhq/lisk-p2p';
// import { customNodeInfoSchema } from '../../../src/node/network/schema';

// export const createProbe = async (config: {
// 	networkVersion: string;
// 	chainID: string;
// 	port: number;
// }): Promise<P2P> => {
// 	const p2p = new P2P({
// 		port: 1111,
// 		customNodeInfoSchema,
// 		nodeInfo: {
// 			networkVersion: config.networkVersion,
// 			advertiseAddress: true,
// 			chainID: config.chainID,
// 			nonce: 'O2wTkjqplHII',
// 			options: {
// 				height: 3,
// 			},
// 		},
// 		seedPeers: [
// 			{
// 				ipAddress: '127.0.0.1',
// 				port: config.port,
// 			},
// 		],
// 		populatorInterval: 50,
// 		maxInboundConnections: 0,
// 	});
// 	const networkReady = new Promise(resolve => {
// 		p2p.on(events.EVENT_NETWORK_READY, resolve);
// 	});
// 	await p2p.start();
// 	await networkReady;

// 	return p2p;
// };
