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
import { Peer, RPCRequest, RPCResponse } from './peer';

const rpcRequestHandler = async (
	seedNodes: ReadonlyArray<Peer>,
	rpcRequest: RPCRequest<void>,
) =>
	Promise.all(
		seedNodes.map(async seedNode =>
			seedNode
				.request(rpcRequest)
				.then((response: RPCResponse<ReadonlyArray<Peer>>) => response.data)
				.catch((err: Error) => {
					throw err;
				}),
		),
	);

export const discoverPeers = async (
	seedNodes: ReadonlyArray<Peer>,
	blacklist: ReadonlyArray<Peer>,
): Promise<ReadonlyArray<Peer>> => {
	const rpcRequest: RPCRequest<void> = {
		procedure: 'getPeers',
	};
	const peersOfSeedNodes = await rpcRequestHandler(seedNodes, rpcRequest);

	const peersOfSeedNodesFlat: ReadonlyArray<Peer> = peersOfSeedNodes.reduce(
		(flattenedPeersList: ReadonlyArray<Peer>, peersList) => [
			...flattenedPeersList,
			...peersList,
		],
	);

	// Create list of blacklist peer ids
	const blackListIds = blacklist.reduce(
		(blacklistIdsArray: ReadonlyArray<string>, blacklistPeer: Peer) => [
			...blacklistIdsArray,
			blacklistPeer.id,
		],
		[],
	);

	// Create new Peers array, filter by blacklist and triedPeers and remove duplicates
	const discoveredPeers = peersOfSeedNodesFlat
		.filter((peer: Peer) => !blackListIds.includes(peer.id))
		.reduce((uniquePeersArray: ReadonlyArray<Peer>, peer: Peer) => {
			const found = uniquePeersArray.find(findPeer => findPeer.id === peer.id);

			if (found) {
				return uniquePeersArray;
			}

			return [...uniquePeersArray, peer];
		}, []);

	return Promise.resolve(discoveredPeers);
};
