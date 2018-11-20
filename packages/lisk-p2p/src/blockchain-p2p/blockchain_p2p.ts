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
import { IPeerOptions, IPeerReturnType, P2P } from '../generic-p2p/p2p';
import { BlockchainPeer } from './blockchain_peer';
/* tslint:disable:interface-name readonly-keyword no-empty-interface no-let*/

export interface IOptionsLiskPeer extends IPeerOptions {}

interface IHistogramType {
	[key: number]: number;
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
			(peer: BlockchainPeer) => peer.getHeight() >= options.blockHeight,
		);

		if (filteredPeers.length === 0) {
			const optionsTemp = { ...options, blockHeight: 0 };

			return { options: optionsTemp, peers: [] };
		}

		const sortedPeers = filteredPeers.sort(
			(a, b) => b.getHeight() - a.getHeight(),
		);
		const histogram: IHistogramType = {};
		let max = 0;
		let height: number;
		// Aggregate height by 2. TODO: To be changed if node latency increases?
		const aggregation = 2;

		sortedPeers.map((peer: BlockchainPeer) => {
			const val = (peer.getHeight() / aggregation) * aggregation;
			histogram[val] = (histogram[val] ? histogram[val] : 0) + 1;
			if (histogram[val] > max) {
				max = histogram[val];
				height = val;
			}
		});
		// Perform histogram cut of peers too far from histogram maximum
		const processedPeers = sortedPeers.filter(
			peer => peer && Math.abs(height - peer.getHeight()) < aggregation + 1,
		);

		return { options, peers: processedPeers };
	};
}
