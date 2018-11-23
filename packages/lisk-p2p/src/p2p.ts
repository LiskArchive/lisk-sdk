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
import {
	INetworkStatus,
	IP2PMessagePacket,
	IP2PNodeStatus,
	IP2PRequestPacket,
	IP2PResponsePacket,
} from './p2p_types';
import { Peer } from './peer';
/* tslint:disable: interface-name no-unused-expression */

export interface IPeerReturnType {
	readonly options: IPeerOptions;
	readonly peers: ReadonlyArray<Peer>;
}
export interface IPeerOptions {
	readonly [key: string]: string | number;
}
/* tslint:disable: readonly-keyword*/
interface IHistogram {
	[key: number]: number;
}
interface IHistogramValues {
	height: number;
	histogram: IHistogram;
	max: number;
}
/* tslint:enable: readonly-keyword */
export const selectPeers = (
	peers: ReadonlyArray<Peer>,
	options: IPeerOptions,
	numOfPeers?: number,
): IPeerReturnType => {
	const filteredPeers = peers.filter(
		// Remove unreachable peers or heights below last block height
		(peer: Peer) => peer.Height >= options.blockHeight,
	);

	if (filteredPeers.length === 0) {
		const optionsTemp = { ...options, blockHeight: 0 };

		return { options: optionsTemp, peers: [] };
	}

	// Order peers by descending height
	const sortedPeers = filteredPeers.sort((a, b) => b.Height - a.Height);

	const aggregation = 2;
	const returnType: IHistogramValues = { height: 0, histogram: {}, max: -1 };
	const calculatedHistogramValues = sortedPeers.reduce(
		(
			histogramValues: IHistogramValues = {
				height: 0,
				histogram: {},
				max: -1,
			},
			peer: Peer,
		) => {
			const val = (peer.Height / aggregation) * aggregation;
			histogramValues.histogram[val] =
				(histogramValues.histogram[val] ? histogramValues.histogram[val] : 0) +
				1;
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
					peer.Height,
			) <
				aggregation + 1,
	);

	// Select n number of peers
	if (numOfPeers) {
		if (numOfPeers > processedPeers.length) {
			throw new NotEnoughPeersError(
				`Requested no. of peers: '${numOfPeers}' is more than the available no. of good peers: '${
					processedPeers.length
				}'`,
			);
		}
		if (numOfPeers === processedPeers.length) {
			return { options, peers: processedPeers };
		}
		if (numOfPeers === 1) {
			const goodPeer: ReadonlyArray<Peer> = [
				processedPeers[Math.floor(Math.random() * processedPeers.length)],
			];

			return { options, peers: goodPeer };
		}
		const randomPeersArray = Array(numOfPeers).fill({});

		const selectedPeersList = randomPeersArray.reduce(
			(peerList: ReadonlyArray<Peer>) => {
				const peer =
					processedPeers[Math.floor(Math.random() * processedPeers.length)];

				if (peerList.indexOf(peer) > -1) {
					return peerList;
				}

				return [...peerList, peer];
			},
			[],
		);

		return { options, peers: selectedPeersList };
	}

	return { options, peers: processedPeers };
};

export class P2P {
	// TODO
	public getNetworkStatus = (): INetworkStatus => true;
	// TODO
	public getNodeStatus = (): IP2PNodeStatus => true;
	// TODO
	public request = async (
		packet: IP2PRequestPacket,
	): Promise<IP2PResponsePacket> => {
		const response = packet;

		return Promise.resolve(response);
	};

	public send = (message: IP2PMessagePacket): void => {
		message;
		// TODO
	};
	public setNodeStatus = (nodeStatus: IP2PNodeStatus): void => {
		nodeStatus;
		// TODO
	};
	// TODO
	public start = (): PromiseConstructorLike => Promise;
	// TODO
	public stop = (): PromiseConstructorLike => Promise;
}
