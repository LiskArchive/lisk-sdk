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
 *
 */
import { Channel, NodeInfo, NetworkStats, PeerInfo } from './types';

export class Node {
	private readonly _channel: Channel;

	public constructor(channel: Channel) {
		this._channel = channel;
	}

	public async getNodeInfo(): Promise<NodeInfo> {
		return this._channel.invoke('system_getNodeInfo');
	}

	public async getNetworkStats(): Promise<NetworkStats> {
		return this._channel.invoke('network_getStats');
	}

	public async getConnectedPeers(): Promise<PeerInfo[]> {
		return this._channel.invoke('network_getConnectedPeers');
	}

	public async getDisconnectedPeers(): Promise<PeerInfo[]> {
		return this._channel.invoke('network_getDisconnectedPeers');
	}
}
