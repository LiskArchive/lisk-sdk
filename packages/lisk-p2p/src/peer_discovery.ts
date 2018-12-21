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
import { Peer, PeerInfo } from './peer';
// For Lips, this will be used for fixed and white lists
export interface FilterPeerOptions {
	readonly blacklist: ReadonlyArray<string>;
}
// TODO: Implement LIPS to handle fixed and white list
export const discoverPeers = async (
	peers: ReadonlyArray<Peer>,
	filterPeerOptions: FilterPeerOptions = { blacklist: [] },
): Promise<ReadonlyArray<PeerInfo>> => {
	const peersOfPeer: ReadonlyArray<ReadonlyArray<PeerInfo>> = await Promise.all(
		peers.map(peer => peer.fetchPeers()),
	);

	const peersOfPeerFlat = peersOfPeer.reduce(
		(flattenedPeersList: ReadonlyArray<PeerInfo>, peersList) =>
			Array.isArray(peersList)
				? [...flattenedPeersList, ...peersList]
				: flattenedPeersList,
		[],
	);

	// Remove duplicates
	const discoveredPeers = peersOfPeerFlat.reduce(
		(uniquePeersArray: ReadonlyArray<PeerInfo>, peer: PeerInfo) => {
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
		(peer: PeerInfo) => !filterPeerOptions.blacklist.includes(peer.ipAddress),
	);

	return discoveredPeersFiltered;
};
