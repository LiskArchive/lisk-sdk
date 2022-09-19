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
import { platform } from 'os';
import { P2P, constants } from '../../src/index';
import { wait } from './helpers';

const { DEFAULT_MAX_OUTBOUND_CONNECTIONS, DEFAULT_MAX_INBOUND_CONNECTIONS } = constants;

export const NETWORK_START_PORT = 5000;
export const NETWORK_PEER_COUNT = 10;
export const POPULATOR_INTERVAL = 50;
export const DEFAULT_CONNECTION_TIMEOUT = 500;
export const DEFAULT_ACK_TIMEOUT = 500;
export const RATE_CALCULATION_INTERVAL = 10000;
export const SEED_PEER_IP = '127.0.0.1';
export const NETWORK_CREATION_WAIT_TIME = 1000;
export const NETWORK_DESTROY_WAIT_TIME = 1000;
export const FALLBACK_PEER_DISCOVER_INTERVAL = 800;

export const nodeInfoConstants = {
	chainID: Buffer.from('10000000', 'hex'),
	version: '1.0.1',
	networkVersion: '1.1',
	minVersion: '1.0.0',
	os: platform(),
	height: 0,
	nonce: 'O2wTkjqplHII',
};

interface TestNetworkConfig {
	networkSize?: number;
	startNodePort?: number;
	networkDiscoveryWaitTime?: number;
	customConfig?: (index: number, startPort: number, networkSize: number) => object;
	initNodeInfo?: object;
}

export const createNetwork = async ({
	networkSize,
	startNodePort,
	networkDiscoveryWaitTime,
	customConfig,
	initNodeInfo,
}: TestNetworkConfig = {}): Promise<P2P[]> => {
	const numberOfPeers = networkSize ?? NETWORK_PEER_COUNT;
	const startPort = startNodePort ?? NETWORK_START_PORT;

	const p2pNodeList = [...new Array(numberOfPeers).keys()].map(index => {
		// Each node will have the previous node in the sequence as a seed peer except the first node.
		const defaultSeedPeers =
			index === 0
				? []
				: [
						{
							ipAddress: SEED_PEER_IP,
							port: NETWORK_START_PORT + index - 1,
						},
				  ];

		const nodePort = NETWORK_START_PORT + index;
		// Extract the nodeInfo out of customConfig
		const { nodeInfo: customNodeInfo, ...customConfigObject } = customConfig
			? (customConfig(index, startPort, numberOfPeers) as any)
			: { nodeInfo: {} };

		const p2pConfig = {
			port: nodePort,
			connectTimeout: DEFAULT_CONNECTION_TIMEOUT,
			ackTimeout: DEFAULT_ACK_TIMEOUT,
			rateCalculationInterval: RATE_CALCULATION_INTERVAL,
			seedPeers: defaultSeedPeers,
			populatorInterval:
				POPULATOR_INTERVAL + Math.floor((POPULATOR_INTERVAL / NETWORK_PEER_COUNT) * index), // Should be different for each Peer to avoid connection debounce
			maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
			maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
			fallbackSeedPeerDiscoveryInterval: FALLBACK_PEER_DISCOVER_INTERVAL,
			nodeInfo: {
				chainID: nodeInfoConstants.chainID,
				networkVersion: nodeInfoConstants.networkVersion,
				nonce: `${nodeInfoConstants.nonce}${nodePort}`,
				options: initNodeInfo ?? {},
				...customNodeInfo,
			},
			...customConfigObject,
		};

		return new P2P(p2pConfig);
	});

	if (networkDiscoveryWaitTime !== 0) {
		await Promise.all(p2pNodeList.map(async p2p => p2p.start()));

		await wait(networkDiscoveryWaitTime ?? NETWORK_CREATION_WAIT_TIME);
	}

	return p2pNodeList;
};

export const destroyNetwork = async (
	p2pNodeList: ReadonlyArray<P2P>,
	networkDestroyWaitTime?: number,
): Promise<void> => {
	await Promise.all(p2pNodeList.filter(p2p => p2p.isActive).map(async p2p => p2p.stop()));
	await wait(networkDestroyWaitTime ?? NETWORK_DESTROY_WAIT_TIME);
};
