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
import { Peer, PeerConfig } from './peer';
import { getAllPeers } from './rpc_handler';

// For Lips, this will be used for fixed and white lists
export interface FilterPeerOptions {
	readonly blacklist: ReadonlyArray<string>;
}

export const discoverPeers = async (
	peers: ReadonlyArray<Peer>,
	filterPeerOptions: FilterPeerOptions = { blacklist: [] },
): Promise<ReadonlyArray<PeerConfig>> => {
	const peersOfPeer: ReadonlyArray<
		ReadonlyArray<PeerConfig> | RPCResponseError
	> = await getAllPeers(peers);
	// Flatten 2-d array of peerlists and ignore errors
	const peersOfPeerFlat: ReadonlyArray<PeerConfig> = peersOfPeer.reduce(
		(flattenedPeersList: ReadonlyArray<PeerConfig>, peersList) =>
			Array.isArray(peersList)
				? [...flattenedPeersList, ...peersList]
				: flattenedPeersList,
		[],
	);
	// Remove duplicates
	const discoveredPeers = peersOfPeerFlat.reduce(
		(uniquePeersArray: ReadonlyArray<PeerConfig>, peer: PeerConfig) => {
			const found = uniquePeersArray.find(
				findPeer => findPeer.ipAddress === peer.ipAddress,
			);

			return found ? uniquePeersArray : [...uniquePeersArray, peer];
		},
		[],
	);

	if (filterPeerOptions.blacklist.length === 0) {
		return discoveredPeers;
	}
	// Remove blacklist ids
	const discoveredPeersFiltered = discoveredPeers.filter(
		(peer: PeerConfig) => !filterPeerOptions.blacklist.includes(peer.ipAddress),
	);

	return discoveredPeersFiltered;
};
