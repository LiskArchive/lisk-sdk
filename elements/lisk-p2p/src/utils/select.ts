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
import { ConnectionKind, PeerKind } from '../constants';
// eslint-disable-next-line import/no-cycle
import {
	P2PPeerInfo,
	P2PPeerSelectionForConnectionInput,
	P2PPeerSelectionForRequestInput,
	P2PPeerSelectionForSendInput,
} from '../types';
// eslint-disable-next-line import/order
import shuffle = require('lodash.shuffle');
// eslint-disable-next-line @typescript-eslint/no-require-imports

const _removeCommonIPsFromLists = (
	peerList: ReadonlyArray<P2PPeerInfo>,
): ReadonlyArray<P2PPeerInfo> => {
	const peerMap = new Map<string, P2PPeerInfo>();

	for (const peer of peerList) {
		const { internalState } = peer;
		const peerReputation = internalState ? internalState.reputation : 0;

		const tempPeer = peerMap.get(peer.ipAddress);
		if (tempPeer) {
			const { internalState: tempInternalState } = tempPeer;
			const tempPeerReputation = tempInternalState ? tempInternalState.reputation : 0;

			if (peerReputation > tempPeerReputation) {
				peerMap.set(peer.ipAddress, peer);
			}
		} else {
			peerMap.set(peer.ipAddress, peer);
		}
	}

	return [...peerMap.values()];
};

export const selectPeersForRequest = (
	input: P2PPeerSelectionForRequestInput,
): ReadonlyArray<P2PPeerInfo> => {
	const { peers } = input;
	const { peerLimit } = input;

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
): ReadonlyArray<P2PPeerInfo> => {
	const shuffledPeers = shuffle(input.peers);
	const peerLimit = input.peerLimit as number;
	const halfPeerLimit = Math.round(peerLimit / 2);

	const outboundPeers = shuffledPeers.filter((peerInfo: P2PPeerInfo) =>
		peerInfo.internalState
			? peerInfo.internalState.connectionKind === ConnectionKind.OUTBOUND
			: false,
	);

	const inboundPeers = shuffledPeers.filter((peerInfo: P2PPeerInfo) =>
		peerInfo.internalState
			? peerInfo.internalState.connectionKind === ConnectionKind.INBOUND
			: false,
	);

	const fixedPeers = shuffledPeers.filter((peerInfo: P2PPeerInfo) =>
		peerInfo.internalState ? peerInfo.internalState.peerKind === PeerKind.FIXED_PEER : false,
	);

	let shortestPeersList;
	let longestPeersList;

	if (outboundPeers.length < inboundPeers.length) {
		shortestPeersList = outboundPeers;
		longestPeersList = inboundPeers;
	} else {
		shortestPeersList = inboundPeers;
		longestPeersList = outboundPeers;
	}

	const selectedFirstKindPeers = shortestPeersList.slice(0, halfPeerLimit);
	const remainingPeerLimit = peerLimit - selectedFirstKindPeers.length;
	const selectedSecondKindPeers = longestPeersList.slice(0, remainingPeerLimit);
	const selectedPeers = selectedFirstKindPeers.concat(selectedSecondKindPeers).concat(fixedPeers);
	const uniquePeerIds = [...new Set(selectedPeers.map(p => p.peerId))];
	const uniquePeers = uniquePeerIds.map(peerId =>
		selectedPeers.find(p => p.peerId === peerId),
	) as ReadonlyArray<P2PPeerInfo>;

	return uniquePeers;
};

export const selectPeersForConnection = (
	input: P2PPeerSelectionForConnectionInput,
): ReadonlyArray<P2PPeerInfo> => {
	if (
		(input.peerLimit && input.peerLimit < 0) ||
		(input.triedPeers.length === 0 && input.newPeers.length === 0)
	) {
		return [];
	}

	if (
		input.peerLimit === undefined ||
		input.peerLimit >= input.triedPeers.length + input.newPeers.length
	) {
		return _removeCommonIPsFromLists([...input.newPeers, ...input.triedPeers]);
	}

	// LIP004 https://github.com/LiskHQ/lips/blob/master/proposals/lip-0004.md#peer-discovery-and-selection
	const minimumProbability = 0.5;
	const x =
		input.triedPeers.length < 100
			? minimumProbability
			: input.triedPeers.length / (input.triedPeers.length + input.newPeers.length);
	const r = Math.max(x, minimumProbability);

	const shuffledTriedPeers = shuffle(input.triedPeers);
	const shuffledNewPeers = shuffle(input.newPeers);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const peerList = [...new Array(input.peerLimit)].map(() => {
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

	return _removeCommonIPsFromLists(peerList);
};
