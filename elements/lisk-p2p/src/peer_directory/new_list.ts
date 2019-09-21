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

import { CustomPeerInfo, PeerList, PeerListConfig } from './peer_list';

export interface NewListConfig extends PeerListConfig {
	readonly evictionThresholdTime?: number;
}

export class NewList extends PeerList {
	private readonly _evictionThresholdTime: number;

	public constructor({
		evictionThresholdTime,
		peerBucketCount,
		peerBucketSize,
		secret,
		peerType,
	}: NewListConfig) {
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

	public get newPeerConfig(): NewListConfig {
		return {
			...this.peerListConfig,
			evictionThresholdTime: this._evictionThresholdTime,
		};
	}

	// Extend eviction of NewPeers
	public evictPeers(bucketId: number): ReadonlyArray<CustomPeerInfo> {
		const peerList = this.peerMap.get(bucketId);

		if (!peerList) {
			throw new Error(`No Peer list for bucket Id: ${bucketId}`);
		}

		// First eviction strategy
		const evictedPeersBasedOnTime = this._evictPeersBasedOnTimeInBucket(
			bucketId,
		);

		if (evictedPeersBasedOnTime.length) {
			return evictedPeersBasedOnTime;
		}

		// Second eviction strategy: Default eviction based on base class
		const evictedPeer = this.evictRandomlyFromBucket(bucketId);
		if (evictedPeer) {
			return [evictedPeer];
		}

		return [];
	}

	// Evict a peer when a bucket is full based on the time of residence in a peerlist
	private _evictPeersBasedOnTimeInBucket(
		bucketId: number,
	): ReadonlyArray<CustomPeerInfo> {
		const bucket = this.peerMap.get(bucketId);
		if (!bucket) {
			return [];
		}
		const evictedPeers: CustomPeerInfo[] = [];

		[...bucket.keys()].forEach(peerId => {
			const peer = bucket.get(peerId) as CustomPeerInfo;

			const timeDifference = Math.round(
				Math.abs(peer.dateAdded.getTime() - new Date().getTime()),
			);

			if (timeDifference >= this._evictionThresholdTime) {
				bucket.delete(peerId);
				evictedPeers.push(peer);
			}
		});

		return evictedPeers;
	}
}
