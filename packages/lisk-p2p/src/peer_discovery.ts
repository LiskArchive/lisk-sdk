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
import { Peer } from './peer';

export interface PeerConnectionSchema {
	readonly inbound: ReadonlyArray<Peer>;
	readonly outbound: ReadonlyArray<Peer>;
}
// Argument peersOfPeerList is a map with key as the peer id string and value as its peerslist
export const discoverPeers = (
	peersOfPeerList: Map<string, ReadonlyArray<Peer>>,
): PeerConnectionSchema => {
	// Make a list of peers from peer's peerlist
	const allPeersOfPeer = Array.from(peersOfPeerList.values()).reduce(
		(peerListArray: ReadonlyArray<Peer>, peerList) => [
			...peerListArray,
			...peerList,
		],
	);

	// Get unique list of peers based on peer id
	const uniquePeers = allPeersOfPeer.reduce<ReadonlyArray<Peer>>(
		(uniquePeersArray, peer) => {
			const found = uniquePeersArray.find(findPeer => findPeer.id === peer.id);

			if (found) {
				return uniquePeersArray;
			}

			return [...uniquePeersArray, peer];
		},
		[],
	);

	return {
		inbound: uniquePeers,
		outbound: uniquePeers,
	};
};
