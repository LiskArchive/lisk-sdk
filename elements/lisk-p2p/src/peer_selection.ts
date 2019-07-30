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
interface Histogram {
	[key: number]: number;
}
interface HistogramValues {
	height: number;
	histogram: Histogram;
	max: number;
}

/* tslint:enable: readonly-keyword */
export const selectPeersForRequest = (
	input: P2PPeerSelectionForRequestInput,
): ReadonlyArray<P2PDiscoveredPeerInfo> => {
	const { peers, nodeInfo } = input;
	const peerLimit = input.peerLimit;
	const nodeHeight = nodeInfo ? nodeInfo.height : 0;
	const filteredPeers = peers.filter(
		// Remove unreachable peers or heights below last block height
		(peer: P2PDiscoveredPeerInfo) => peer.height >= nodeHeight,
	);

	if (filteredPeers.length === 0) {
		return [];
	}

	// Order peers by descending height
	const sortedPeers = filteredPeers.sort((a, b) => b.height - a.height);

	const aggregation = 2;

	const calculatedHistogramValues = sortedPeers.reduce(
		(histogramValues: HistogramValues, peer: P2PDiscoveredPeerInfo) => {
			const val = Math.floor(peer.height / aggregation) * aggregation;
			histogramValues.histogram[val] =
				(histogramValues.histogram[val] ? histogramValues.histogram[val] : 0) +
				1;
			if (histogramValues.histogram[val] > histogramValues.max) {
				histogramValues.max = histogramValues.histogram[val];
				histogramValues.height = val;
			}

			return histogramValues;
		},
		{ height: 0, histogram: {}, max: -1 },
	);

	// Perform histogram cut of peers too far from histogram maximum
	const processedPeers = sortedPeers.filter(
		peer =>
			peer &&
			Math.abs(calculatedHistogramValues.height - peer.height) <
				aggregation + 1,
	);

	if (peerLimit === undefined) {
		return processedPeers;
	}

	if (peerLimit === 1) {
		const goodPeer: ReadonlyArray<P2PDiscoveredPeerInfo> = [
			processedPeers[Math.floor(Math.random() * processedPeers.length)],
		];

		return goodPeer;
	}

	return shuffle(processedPeers).slice(0, peerLimit);
};

export const selectPeersForSend = (
	input: P2PPeerSelectionForSendInput,
): ReadonlyArray<P2PDiscoveredPeerInfo> =>
	shuffle(input.peers).slice(0, input.peerLimit);

export const selectPeersForConnection = (
	input: P2PPeerSelectionForConnectionInput,
): ReadonlyArray<P2PPeerInfo> => {
	if (input.peerLimit && input.peerLimit < 0) {
		return [];
	}

	if (input.peerLimit === undefined) {
		return [...input.newPeers, ...input.triedPeers];
	}

	const x =
		input.triedPeers.length / (input.triedPeers.length + input.newPeers.length);
	// tslint:disable-next-line: no-magic-numbers
	const r = Math.max(x, 0.5);

	return [...Array(input.peerLimit)].map(() => {
		if (Math.random() < r) {
			// With probability r
			return shuffle(input.triedPeers)[0];
		}

		// With probability 1-r
		return shuffle(input.newPeers)[0];
	});
};
