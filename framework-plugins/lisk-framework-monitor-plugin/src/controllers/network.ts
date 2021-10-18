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
import { BasePlugin } from 'lisk-sdk';
import { PeerInfo } from '../types';

export interface NetworkStats {
	[key: string]: unknown;
}

const getMajorityHeight = (peers: PeerInfo[]): { height: number; count: number } => {
	const heightHistogram = {} as { [key: number]: number };
	const majority = {
		height: 0,
		count: 0,
	};
	for (const { options } of peers) {
		const height = options.height as number;
		heightHistogram[height] = heightHistogram[height] + 1 || 1;
		if (heightHistogram[height] > majority.count) {
			majority.count = heightHistogram[height];
			majority.height = height;
		}
	}

	return majority;
};

export const getNetworkStats = async (channel: BasePlugin['apiClient']): Promise<NetworkStats> => {
	const networkStats = await channel.invoke('app_getNetworkStats');
	const connectedPeers = await channel.invoke<PeerInfo[]>('app_getConnectedPeers');
	const disconnectedPeers = await channel.invoke<PeerInfo[]>('app_getDisconnectedPeers');
	const majorityHeight = getMajorityHeight(connectedPeers);
	const totalPeers = {
		connected: connectedPeers.length,
		disconnected: disconnectedPeers.length,
	};

	return { ...networkStats, majorityHeight, totalPeers };
};
