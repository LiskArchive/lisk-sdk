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
import {
	DEFAULT_MAX_OUTBOUND_CONNECTIONS,
	DEFAULT_MAX_INBOUND_CONNECTIONS,
} from '../../src';
export const NETWORK_START_PORT = 5000;
export const NETWORK_PEER_COUNT = 10;
export const POPULATOR_INTERVAL = 50;
export const DEFAULT_CONNECTION_TIMEOUT = 500;
export const DEFAULT_ACK_TIMEOUT = 500;
export const RATE_CALCULATION_INTERVAL = 10000;
export const WEB_SOCKET_ENGINE = 'ws';
export const SEED_PEER_IP = '127.0.0.1';
export const NETWORK_CREATION_WAIT_TIME = 1000;
export const NETWORK_DESTROY_WAIT_TIME = 1000;

export const nodeInfoConstants = {
	nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
	version: '1.0.1',
	protocolVersion: '1.1',
	minVersion: '1.0.0',
	os: platform(),
	height: 0,
	nonce: `O2wTkjqplHII`,
};

interface TestNetworkConfig {
	networkSize?: number;
	startNodePort?: number;
	networkDiscoveryWaitTime?: number;
	customConfig?: (
		index: number,
		startPort: number,
		networkSize: number,
	) => object;
}

export const createNetwork = async ({
	networkSize,
	startNodePort,
	networkDiscoveryWaitTime,
	customConfig,
}: TestNetworkConfig = {}) => {
	const numberOfPeers = networkSize ? networkSize : NETWORK_PEER_COUNT;
	const startPort = startNodePort ? startNodePort : NETWORK_START_PORT;

	const p2pNodeList = [...new Array(numberOfPeers).keys()].map(index => {
		// Each node will have the previous node in the sequence as a seed peer except the first node.
		const defaultSeedPeers =
			index === 0
				? []
				: [
						{
							ipAddress: SEED_PEER_IP,
							wsPort: NETWORK_START_PORT + index - 1,
						},
				  ];

		const nodePort = NETWORK_START_PORT + index;
		// Extract the nodeInfo out of customConfig
		const { nodeInfo: customNodeInfo, ...customConfigObject } = customConfig
			? (customConfig(index, startPort, numberOfPeers) as any)
			: { nodeInfo: {} };

		const p2pConfig = {
			connectTimeout: DEFAULT_CONNECTION_TIMEOUT,
			ackTimeout: DEFAULT_ACK_TIMEOUT,
			rateCalculationInterval: RATE_CALCULATION_INTERVAL,
			seedPeers: defaultSeedPeers,
			wsEngine: WEB_SOCKET_ENGINE,
			populatorInterval:
				POPULATOR_INTERVAL +
				Math.floor((POPULATOR_INTERVAL / numberOfPeers) * index * 3), // Should be different for each Peer to avoid connection rebound
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
				nonce: `${nodeInfoConstants.nonce}${nodePort}`,
				...customNodeInfo,
			},
			...customConfigObject,
		};

		return new P2P(p2pConfig);
	});
	await Promise.all(p2pNodeList.map(p2p => p2p.start()));

	await wait(
		networkDiscoveryWaitTime
			? networkDiscoveryWaitTime
			: NETWORK_CREATION_WAIT_TIME,
	);

	return p2pNodeList;
};

export const destroyNetwork = async (
	p2pNodeList: ReadonlyArray<P2P>,
	networkDestroyWaitTime?: number,
) => {
	await Promise.all(
		p2pNodeList.filter(p2p => p2p.isActive).map(p2p => p2p.stop()),
	);
	await wait(
		networkDestroyWaitTime ? networkDestroyWaitTime : NETWORK_DESTROY_WAIT_TIME,
	);
};
