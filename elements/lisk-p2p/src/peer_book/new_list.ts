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
// eslint-disable-next-line import/no-cycle
import { P2PEnhancedPeerInfo } from '../types';
// eslint-disable-next-line import/no-cycle
import { evictPeerRandomlyFromBucket, expirePeerFromBucket, PEER_TYPE } from '../utils';
// eslint-disable-next-line import/no-cycle
import { BaseList, Bucket, PeerListConfig } from './base_list';

export interface NewListConfig extends PeerListConfig {
	readonly evictionThresholdTime?: number;
}

export class NewList extends BaseList {
	private readonly _evictionThresholdTime: number;

	public constructor({
		evictionThresholdTime,
		numOfBuckets,
		bucketSize,
		secret,
		peerType,
	}: NewListConfig) {
		super({
			secret,
			numOfBuckets,
			bucketSize,
			peerType,
		});
		this.type = PEER_TYPE.NEW_PEER;
		this._evictionThresholdTime = evictionThresholdTime ?? DEFAULT_EVICTION_THRESHOLD_TIME;
	}

	public get newPeerConfig(): NewListConfig {
		return {
			...this.peerListConfig,
			evictionThresholdTime: this._evictionThresholdTime,
		};
	}

	public makeSpace(bucket: Bucket): P2PEnhancedPeerInfo | undefined {
		// First eviction strategy: expire older peers
		const evictedPeer = expirePeerFromBucket(bucket, this._evictionThresholdTime);
		if (evictedPeer) {
			return evictedPeer;
		}

		// Second eviction strategy: Select random peer and evict
		return evictPeerRandomlyFromBucket(bucket);
	}
}
