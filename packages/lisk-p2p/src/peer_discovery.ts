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
import { RPCGetPeersFailedError } from './errors';
import { Peer, RPCRequest, RPCResponse } from './peer';

export interface Options {
	readonly blacklistIds: ReadonlyArray<string>;
}

const rpcRequestHandler = async (
	peers: ReadonlyArray<Peer>,
	rpcRequest: RPCRequest<void>,
) =>
	Promise.all(
		peers.map(async peer =>
			peer
				.request(rpcRequest)
				.then((response: RPCResponse<ReadonlyArray<Peer>>) => response.data)
				.catch((error: Error) => {
					throw new RPCGetPeersFailedError(
						`Error when fetching peerlist of peer with peer id ${peer.id}`,
						error,
						peer.id,
					);
				}),
		),
	);

export const discoverPeers = async (
	peers: ReadonlyArray<Peer>,
	options: Options = { blacklistIds: [] },
): Promise<ReadonlyArray<Peer>> => {
	const rpcRequest: RPCRequest<void> = {
		procedure: 'getPeers',
	};
	const peersOfPeer = await rpcRequestHandler(peers, rpcRequest);

	const peersOfPeerFlat: ReadonlyArray<Peer> = peersOfPeer.reduce(
		(flattenedPeersList: ReadonlyArray<Peer>, peersList) => [
			...flattenedPeersList,
			...peersList,
		],
		[],
	);

	const discoveredPeers = peersOfPeerFlat.reduce(
		(uniquePeersArray: ReadonlyArray<Peer>, peer: Peer) => {
			const found = uniquePeersArray.find(findPeer => findPeer.id === peer.id);

			if (found) {
				return uniquePeersArray;
			}

			return [...uniquePeersArray, peer];
		},
		[],
	);

	if (options.blacklistIds.length === 0) {
		return Promise.resolve(discoveredPeers);
	}

	const discoveredPeersFiltered = discoveredPeers.filter(
		(peer: Peer) => !options.blacklistIds.includes(peer.id),
	);

	return Promise.resolve(discoveredPeersFiltered);
};
