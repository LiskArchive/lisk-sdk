/*
 * Copyright © 2018 Lisk Foundation
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
import {
	NetworkStatus,
	P2PMessagePacket,
	P2PNodeStatus,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';

import { Peer } from './peer';
import { PeerPool } from './peer_pool';

export class P2P {
	private readonly peerPool: PeerPool;

	public constructor(config: P2PConfig) {
		this.peerPool = new PeerPool({
			blacklistedPeers: config.blacklistedPeers,
			connectTimeout: config.connectTimeout,
			ipAddress: config.ipAddress,
			seedPeers: config.seedPeers,
			wsEngine: config.wsEngine,
			wsPort: config.wsPort,
		});
	}

	public applyPenalty = (penalty: IP2PPenalty): void => {
		penalty;
	};
	// TODO
	public getNetworkStatus = (): NetworkStatus => true;
	// TODO
	public getNodeStatus = (): P2PNodeStatus => true;
	// TODO
	public request = async (
		packet: P2PRequestPacket,
	): Promise<P2PResponsePacket> => {
		const response = packet;

		return Promise.resolve(response);
	};

	public send = (message: P2PMessagePacket): void => {
		message;
		// TODO
	};
	public setNodeStatus = (nodeStatus: P2PNodeStatus): void => {
		nodeStatus;
		// TODO
	};
	// TODO
	public start = async (): Promise<void> => {
		return this.peerPool.start();
	};
	// TODO
	public stop = async (): Promise<void> => {
		return this.peerPool.stop();
	};
}
