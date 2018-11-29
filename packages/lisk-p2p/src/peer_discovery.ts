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

export interface DiscoverPeersReturntype {
	readonly inbound: ReadonlyArray<Peer>;
	readonly outbound: ReadonlyArray<Peer>;
}

export interface PeersListType {
	readonly peer: Peer;
	readonly peerList: ReadonlyArray<Peer>;
}

export const discoverPeers = (
	peersList: ReadonlyArray<PeersListType>,
): DiscoverPeersReturntype => {
	// Make a list of all the peers
	const allPeers = peersList.reduce<ReadonlyArray<Peer>>(
		(allPeersArray, peer) => [...allPeersArray, ...peer.peerList],
		[],
	);
	// Get unique list of peers based on Id
	const uniquePeers = allPeers.reduce<ReadonlyArray<Peer>>(
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
