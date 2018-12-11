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
import { Peer, PeerConfig } from './peer';

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

export const getPeersRPCHandler = (response: unknown): ReadonlyArray<Peer> => {
	if (!response) {
		return [];
	}

	const { peers } = response as RPCPeerListResponse;

	if (Array.isArray(peers)) {
		const peerList = peers.map(peer => {
			const peerConfig: PeerConfig = {
				ipAddress: peer.ip,
				height: peer.height,
				wsPort: peer.wsPort,
				os: peer.os,
				id: `${peer.ip}:${peer.wsPort}`,
			};

			return new Peer(peerConfig);
		});

		return peerList;
	}

	// Ignores any other value of response that is not an array
	return [];
};
