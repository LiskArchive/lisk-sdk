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
import { wait } from './helpers';
import { platform } from 'os';
export const NETWORK_START_PORT = 5000;
export const NETWORK_PEER_COUNT = 10;
export const POPULATOR_INTERVAL = 50;
export const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
export const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
export const DEFAULT_CONNECTION_TIMEOUT = 100;
export const DEFAULT_ACK_TIMEOUT = 200;
export const RATE_CALCULATION_INTERVAL = 10000;
export const WEB_SOCKET_ENGINE = 'ws';
export const SEED_PEER_IP = '127.0.0.1';

export const nodeInfoConstants = {
	nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
	version: '1.0.1',
	protocolVersion: '1.1',
	minVersion: '1.0.0',
	os: platform(),
	height: 0,
	broadhash: '2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
	nonce: `O2wTkjqplHII`,
};

interface TestNetworkConfig {
	networkSize?: number;
	startNodePort?: number;
	customConfig?: (
		index: number,
		startPort: number,
		networkSize: number,
	) => object;
	customNodeInfo?: (
		index: number,
		startPort: number,
		networkSize: number,
	) => object;
	customSeedPeers?: (
		index: number,
		startPort: number,
		networkSize: number,
	) => any[];
}

export const createNetwork = async ({
	networkSize,
	startNodePort,
	customConfig,
	customNodeInfo,
	customSeedPeers,
}: TestNetworkConfig) => {
	const numberOfPeers = networkSize ? networkSize : NETWORK_PEER_COUNT;
	const startPort = startNodePort ? startNodePort : NETWORK_START_PORT;

	const p2pNodeList = [...new Array(numberOfPeers).keys()].map(index => {
		// Each node will have the previous node in the sequence as a seed peer except the first node.
		const seedPeers = customSeedPeers
			? customSeedPeers(index, startPort, numberOfPeers)
			: index === 0
			? []
			: [
					{
						ipAddress: SEED_PEER_IP,
						wsPort: NETWORK_START_PORT + index - 1,
					},
			  ];

		const nodePort = NETWORK_START_PORT + index;
		const customNodeInfoObject = customNodeInfo
			? customNodeInfo(index, startPort, numberOfPeers)
			: {};
		const customConfigObject = customConfig
			? customConfig(index, startPort, numberOfPeers)
			: {};

		const p2pConfig = {
			connectTimeout: DEFAULT_CONNECTION_TIMEOUT,
			ackTimeout: DEFAULT_ACK_TIMEOUT,
			rateCalculationInterval: RATE_CALCULATION_INTERVAL,
			seedPeers,
			wsEngine: WEB_SOCKET_ENGINE,
			populatorInterval: POPULATOR_INTERVAL,
			maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
			maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
			nodeInfo: {
				wsPort: nodePort,
				nethash: nodeInfoConstants.nethash,
				version: nodeInfoConstants.version,
				protocolVersion: nodeInfoConstants.protocolVersion,
				minVersion: nodeInfoConstants.minVersion,
				os: nodeInfoConstants.os,
				height: nodeInfoConstants.height,
				broadhash: nodeInfoConstants.broadhash,
				nonce: `${nodeInfoConstants.nonce}${nodePort}`,
				...customNodeInfoObject,
			},
			...customConfigObject,
		};

		return new P2P(p2pConfig);
	});
	await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));

	await wait(1000);

	return p2pNodeList;
};

export const destroyNetwork = async (p2pNodeList: ReadonlyArray<P2P>) => {
	await Promise.all(
		p2pNodeList.filter(p2p => p2p.isActive).map(async p2p => await p2p.stop()),
	);
	await wait(1000);
};
