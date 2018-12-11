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
import { RPCResponseError } from './errors';
import { P2PResponsePacket, Peer } from './peer';
import { getPeersRPCHandler } from './rpc_handler';

// For Lips, this will be used for fixed and white lists
export interface FilterPeerOptions {
	readonly blacklist: ReadonlyArray<string>;
}

export const rpcRequestHandler = async (
	peers: ReadonlyArray<Peer>,
	procedure: string,
) =>
	Promise.all(
		peers.map(async peer =>
			peer
				.request<void>({ procedure })
				.then((response: P2PResponsePacket) =>
					getPeersRPCHandler(response.data),
				)
				// This will be used to log errors
				.catch(
					(error: Error) =>
						new RPCResponseError(
							`Error when fetching peerlist of peer with peer id ${peer.id}`,
							error,
							peer.id,
						),
				),
		),
	);

export const discoverPeers = async (
	peers: ReadonlyArray<Peer>,
	filterPeerOptions: FilterPeerOptions = { blacklist: [] },
): Promise<ReadonlyArray<Peer>> => {
	const peersOfPeer: ReadonlyArray<
		ReadonlyArray<Peer> | RPCResponseError
	> = await rpcRequestHandler(peers, 'getPeers');
	// Flatten 2-d array of peerlists and ignore errors
	const peersOfPeerFlat: ReadonlyArray<Peer> = peersOfPeer.reduce(
		(flattenedPeersList: ReadonlyArray<Peer>, peersList) =>
			Array.isArray(peersList)
				? [...flattenedPeersList, ...peersList]
				: flattenedPeersList,
		[],
	);
	// Remove duplicates
	const discoveredPeers = peersOfPeerFlat.reduce(
		(uniquePeersArray: ReadonlyArray<Peer>, peer: Peer) => {
			const found = uniquePeersArray.find(findPeer => findPeer.id === peer.id);

			return found ? uniquePeersArray : [...uniquePeersArray, peer];
		},
		[],
	);

	if (filterPeerOptions.blacklist.length === 0) {
		return discoveredPeers;
	}
	// Remove blacklist ids
	const discoveredPeersFiltered = discoveredPeers.filter(
		(peer: Peer) => !filterPeerOptions.blacklist.includes(peer.id),
	);

	return discoveredPeersFiltered;
};
