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
import { IPeerOptions, IPeerReturnType, P2P } from '../generic-p2p';
import { BlockchainPeer } from './blockchain_peer';
/* tslint:disable:interface-name readonly-keyword no-empty-interface no-let*/

export interface IOptionsLiskPeer extends IPeerOptions {}

interface IHistogram {
	[key: number]: number;
}
interface IHistogramValues {
	height: number;
	histogram: IHistogram;
	max: number;
}
export class BlockchainP2P extends P2P {
	public constructor() {
		super();
	}

	public selectPeers = (
		peers: ReadonlyArray<BlockchainPeer>,
		options: IOptionsLiskPeer,
	): IPeerReturnType => {
		const filteredPeers = peers.filter(
			// Remove unreachable peers or heights below last block height
			(peer: BlockchainPeer) =>
				peer !== null && peer.getHeight() >= options.blockHeight,
		);

		if (filteredPeers.length === 0) {
			const optionsTemp = { ...options, blockHeight: 0 };

			return { options: optionsTemp, peers: [] };
		}

		// Order peers by descending height
		const sortedPeers = filteredPeers.sort(
			(a, b) => b.getHeight() - a.getHeight(),
		);

		const aggregation = 2;
		const returnType: IHistogramValues = { height: 0, histogram: {}, max: -1 };
		const calculatedHistogramValues = sortedPeers.reduce(
			(
				histogramValues: IHistogramValues = {
					height: 0,
					histogram: { 0: 0 },
					max: -1,
				},
				peer: BlockchainPeer,
			) => {
				const val = (peer.getHeight() / aggregation) * aggregation;
				histogramValues.histogram[val] =
					(histogramValues.histogram[val]
						? histogramValues.histogram[val]
						: 0) + 1;
				if (histogramValues.histogram[val] > histogramValues.max) {
					histogramValues.max = histogramValues.histogram[val];
					histogramValues.height = val;
				}

				return histogramValues;
			},
			returnType,
		);

		// Perform histogram cut of peers too far from histogram maximum
		const processedPeers = sortedPeers.filter(
			peer =>
				peer &&
				Math.abs(
					(calculatedHistogramValues ? calculatedHistogramValues.height : 0) -
						peer.getHeight(),
				) <
					aggregation + 1,
		);

		return { options, peers: processedPeers };
	};
}
