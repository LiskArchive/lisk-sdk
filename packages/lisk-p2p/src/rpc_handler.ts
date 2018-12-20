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
import { instantiatePeerFromResponse } from './response_handler';
import { P2PResponsePacket } from './p2p_types';
import { RPCResponseError } from './errors';

const GET_ALL_PEERS_LIST_RPC = 'list';

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

export const processPeerListFromResponse = (
	response: unknown,
): ReadonlyArray<PeerConfig> => {
	if (!response) {
		return [];
	}

	const { peers } = response as RPCPeerListResponse;
	try {
		if (Array.isArray(peers)) {
			const peerList = peers.map<PeerConfig>(instantiatePeerFromResponse);
			return peerList;
		}
	} catch (error) {
		throw error;
	}

	// Ignores any other value of response that is not an array
	return [];
};

export const getAllPeers = async (peers: ReadonlyArray<Peer>) =>
	Promise.all(
		peers.map(async peer =>
			peer
				.request<void>({ procedure: GET_ALL_PEERS_LIST_RPC })
				.then((response: P2PResponsePacket) =>
					processPeerListFromResponse(response.data),
				)
				// This will be used to log errors
				.catch(
					(error: Error) =>
						new RPCResponseError(
							`Error when fetching peerlist of peer with peer ip ${
								peer.ipAddress
							} and port ${peer.wsPort}`,
							error,
							peer.ipAddress,
							peer.wsPort,
						),
				),
		),
	);
