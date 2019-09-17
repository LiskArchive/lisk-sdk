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
// tslint:disable-next-line no-require-imports
import shuffle = require('lodash.shuffle');
import {
	P2PDiscoveredPeerInfo,
	P2PPeerInfo,
	P2PPeerSelectionForConnectionInput,
	P2PPeerSelectionForRequestInput,
	P2PPeerSelectionForSendInput,
} from './p2p_types';

/* tslint:disable: readonly-keyword*/

export const getUniquePeersbyIp = (
	peerList: ReadonlyArray<P2PDiscoveredPeerInfo>,
): ReadonlyArray<P2PDiscoveredPeerInfo> => {
	const peerMap = new Map<string, P2PDiscoveredPeerInfo>();

	for (const peer of peerList) {
		const tempPeer = peerMap.get(peer.ipAddress);
		if (tempPeer) {
			if (peer.height > tempPeer.height) {
				peerMap.set(peer.ipAddress, peer);
			}
		} else {
			peerMap.set(peer.ipAddress, peer);
		}
	}

	return [...peerMap.values()];
};

/* tslint:enable: readonly-keyword */
export const selectPeersForRequest = (
	input: P2PPeerSelectionForRequestInput,
): ReadonlyArray<P2PDiscoveredPeerInfo> => {
	const { peers } = input;
	const peerLimit = input.peerLimit;

	if (peers.length === 0) {
		return [];
	}

	if (peerLimit === undefined) {
		return shuffle(peers);
	}

	return shuffle(peers).slice(0, peerLimit);
};

export const selectPeersForSend = (
	input: P2PPeerSelectionForSendInput,
): ReadonlyArray<P2PDiscoveredPeerInfo> => {
	const shuffledPeers = shuffle(input.peers);
	// tslint:disable: no-magic-numbers
	const halfPeerLimit = Math.round((input.peerLimit as number) / 2);

	// TODO: Get outbound string from constants.ts file.
	const selectedOutboundPeers = shuffledPeers
		.filter((peerInfo: P2PDiscoveredPeerInfo) => peerInfo.kind === 'outbound')
		.slice(0, halfPeerLimit);

	// TODO: Get inbound string from constants.ts file.
	const selectedInboundPeers = shuffledPeers
		.filter((peerInfo: P2PDiscoveredPeerInfo) => peerInfo.kind === 'inbound')
		.slice(0, halfPeerLimit);

	return selectedOutboundPeers.concat(selectedInboundPeers);
};

export const selectPeersForConnection = (
	input: P2PPeerSelectionForConnectionInput,
): ReadonlyArray<P2PPeerInfo> => {
	if (input.peerLimit && input.peerLimit < 0) {
		return [];
	}

	if (
		input.peerLimit === undefined ||
		input.peerLimit >= input.triedPeers.length + input.newPeers.length
	) {
		return [...input.newPeers, ...input.triedPeers];
	}

	if (input.triedPeers.length === 0 && input.newPeers.length === 0) {
		return [];
	}

	// LIP004 https://github.com/LiskHQ/lips/blob/master/proposals/lip-0004.md#peer-discovery-and-selection
	const x =
		input.triedPeers.length / (input.triedPeers.length + input.newPeers.length);
	const minimumProbability = 0.5;
	const r = Math.max(x, minimumProbability);

	const shuffledTriedPeers = shuffle(input.triedPeers);
	const shuffledNewPeers = shuffle(input.newPeers);

	return [...Array(input.peerLimit)].map(() => {
		if (shuffledTriedPeers.length !== 0) {
			if (Math.random() < r) {
				// With probability r
				return shuffledTriedPeers.pop() as P2PPeerInfo;
			}
		}

		if (shuffledNewPeers.length !== 0) {
			// With probability 1-r
			return shuffledNewPeers.pop() as P2PPeerInfo;
		}

		return shuffledTriedPeers.pop() as P2PPeerInfo;
	});
};
