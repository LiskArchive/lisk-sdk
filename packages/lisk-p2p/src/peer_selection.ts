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
import { NotEnoughPeersError } from './errors';
import { Peer, PeerInfo } from './peer';

export interface PeerOptions {
	readonly [key: string]: string | number;
}
/* tslint:disable: readonly-keyword*/
interface Histogram {
	[key: number]: number;
}
interface HistogramValues {
	height: number;
	histogram: Histogram;
	max: number;
}


// TODO ASAP: Only select peers which have all available PeerInfo properties.
/* tslint:enable: readonly-keyword */
export const selectPeers = (
	peers: ReadonlyArray<Peer>,
	selectionParams: PeerOptions = { lastBlockHeight: 0 },
	numOfPeers: number = 0,
): ReadonlyArray<Peer> => {
	const filteredPeers = peers.filter(
		// Remove unreachable peers or heights below last block height
		(peer: Peer) => peer.height >= selectionParams.lastBlockHeight,
	);

	if (filteredPeers.length === 0) {
		return [];
	}

	// Order peers by descending height
	const sortedPeers = filteredPeers.sort((a, b) => b.height - a.height);

	const aggregation = 2;

	const calculatedHistogramValues = sortedPeers.reduce(
		(histogramValues: HistogramValues, peer: Peer) => {
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
		peer => {
			const isTriedPeer: boolean = !!(peer.peerInfo && peer.peerInfo.isTriedPeer);

			return peer &&
				Math.abs(
					calculatedHistogramValues.height - peer.height
				) < aggregation + 1 &&
				isTriedPeer;
		}
	);

	if (numOfPeers <= 0) {
		return processedPeers;
	}

	// Select n number of peers
	if (numOfPeers > processedPeers.length) {
		throw new NotEnoughPeersError(
			`Requested number of peers: '${numOfPeers}' is more than the available number of good peers: '${
				processedPeers.length
			}'`,
		);
	}

	if (numOfPeers === processedPeers.length) {
		return processedPeers;
	}

	if (numOfPeers === 1) {
		const goodPeer: ReadonlyArray<Peer> = [
			processedPeers[Math.floor(Math.random() * processedPeers.length)],
		];

		return goodPeer;
	}

	const { peerList } = new Array(numOfPeers).fill(0).reduce(
		peerListObject => {
			const index = Math.floor(
				Math.random() * peerListObject.processedPeersArray.length,
			);
			const peer = peerListObject.processedPeersArray[index];
			// This will ensure that the selected peer is not choosen again by the random function above
			const tempProcessedPeers = peerListObject.processedPeersArray.filter(
				(findPeer: Peer) => findPeer !== peer,
			);

			return {
				peerList: [...peerListObject.peerList, peer],
				processedPeersArray: tempProcessedPeers,
			};
		},
		{ peerList: [], processedPeersArray: processedPeers },
	);

	return peerList;
};

export const selectForConnection = (peerInfoList: ReadonlyArray<PeerInfo>) =>
	peerInfoList;
