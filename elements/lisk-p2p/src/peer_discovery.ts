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
import { P2PDiscoveredPeerInfo } from './p2p_types';
import { constructPeerIdFromPeerInfo, Peer } from './peer';
// For Lips, this will be used for fixed and white lists
export interface FilterPeerOptions {
	readonly blacklist: ReadonlyArray<string>;
}

// TODO later: Implement LIPS to handle fixed and white list
export const discoverPeers = async (
	knownPeers: ReadonlyArray<Peer>,
	filterPeerOptions: FilterPeerOptions = { blacklist: [] },
): Promise<ReadonlyArray<P2PDiscoveredPeerInfo>> => {
	const peersOfPeer: ReadonlyArray<
		ReadonlyArray<P2PDiscoveredPeerInfo>
	> = await Promise.all(
		knownPeers.map(async peer => {
			try {
				return await peer.fetchPeers();
			} catch (error) {
				return [];
			}
		}),
	);

	const peersOfPeerFlat = peersOfPeer.reduce(
		(flattenedPeersList: ReadonlyArray<P2PDiscoveredPeerInfo>, peersList) =>
			Array.isArray(peersList)
				? [...flattenedPeersList, ...peersList]
				: flattenedPeersList,
		[],
	);

	// Remove duplicates
	const discoveredPeers = peersOfPeerFlat.reduce(
		(
			uniquePeersArray: ReadonlyArray<P2PDiscoveredPeerInfo>,
			peer: P2PDiscoveredPeerInfo,
		) => {
			const found = uniquePeersArray.find(
				findPeer =>
					constructPeerIdFromPeerInfo(findPeer) ===
					constructPeerIdFromPeerInfo(peer),
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
		(peer: P2PDiscoveredPeerInfo) =>
			!filterPeerOptions.blacklist.includes(peer.ipAddress),
	);

	return discoveredPeersFiltered;
};
