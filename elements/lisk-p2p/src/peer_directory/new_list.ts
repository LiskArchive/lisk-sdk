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
import { DEFAULT_EVICTION_THRESHOLD_TIME } from '../constants';

import { BasePeerList, CustomPeerInfo, PeerListConfig } from './base_list';

export interface NewPeerConfig extends PeerListConfig {
	readonly evictionThresholdTime?: number;
}

export class NewPeers extends BasePeerList {
	private readonly _evictionThresholdTime: number;

	public constructor({
		evictionThresholdTime,
		peerBucketCount,
		peerBucketSize,
		secret,
		peerType,
	}: NewPeerConfig) {
		super({
			secret,
			peerBucketCount,
			peerBucketSize,
			peerType,
		});

		this._evictionThresholdTime = evictionThresholdTime
			? evictionThresholdTime
			: DEFAULT_EVICTION_THRESHOLD_TIME;
	}

	public get newPeerConfig(): NewPeerConfig {
		return {
			...this.peerListConfig,
			evictionThresholdTime: this._evictionThresholdTime,
		};
	}

	// Extend eviction of NewPeers
	public evictPeer(bucketId: number): CustomPeerInfo {
		const peerList = this.peerMap.get(bucketId);

		if (!peerList) {
			throw new Error(`No Peer list for bucket Id: ${bucketId}`);
		}

		// First eviction strategy
		const evictedPeerBasedOnTime = this._evictionBasedOnTimeInBucket(
			bucketId,
			peerList,
		);

		if (evictedPeerBasedOnTime) {
			return evictedPeerBasedOnTime;
		}

		// Second eviction strategy: Default eviction based on base class
		return this.evictRandomlyFromBucket(bucketId);
	}
	// Evict a peer when a bucket is full based on the time of residence in a peerlist
	private _evictionBasedOnTimeInBucket(
		bucketId: number,
		peerList: Map<string, CustomPeerInfo>,
	): CustomPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let evictedPeer: CustomPeerInfo | undefined;

		[...this.peerMap.values()].forEach(peersMap => {
			[...peersMap.keys()].forEach(peerId => {
				const peer = peersMap.get(peerId);

				if (!peer) {
					return;
				}

				const timeDifference = Math.round(
					Math.abs(peer.dateAdded.getTime() - new Date().getTime()),
				);

				if (timeDifference >= this._evictionThresholdTime) {
					peerList.delete(peerId);
					this.peerMap.set(bucketId, peerList);
					evictedPeer = peer;
				}
			});
		});

		return evictedPeer;
	}
}
