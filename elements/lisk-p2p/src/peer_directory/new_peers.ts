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
import {
	DEFAULT_EVICTION_THRESHOLD_TIME,
	DEFAULT_NEW_PEER_BUCKET_COUNT,
	DEFAULT_NEW_PEER_BUCKET_SIZE,
} from '../constants';
import { P2PPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo } from '../utils';
import { AddPeerOutcome, BasePeerList, PeerListConfig } from './basePeerList';

interface NewPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}
type NewPeerMap = Map<number, Map<string, NewPeerInfo>>;
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

		this.initializePeerList(this.peerMap as NewPeerMap);
	}

	public initializePeerList(
		peerMap: Map<number, Map<string, NewPeerInfo>>,
	): void {
		// Initialize the Map with all the buckets
		for (const bucketId of [
			...new Array(this.peerListConfig.peerBucketCount).keys(),
		]) {
			peerMap.set(bucketId, new Map<string, NewPeerInfo>());
		}
	}

	public get newPeerConfig(): NewPeerConfig {
		return {
			...this.peerListConfig,
			evictionThresholdTime: this._evictionThresholdTime,
		};
	}

	// Addition of peer can also result in peer eviction if the bucket of the incoming peer is already full based on evection strategy.
	public addPeer(peerInfo: P2PPeerInfo): AddPeerOutcome {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this.peerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (!bucket) {
			return {
				success: false,
				isEvicted: false,
			};
		}

		if (bucket && bucket.get(incomingPeerId)) {
			return {
				success: false,
				isEvicted: false,
			};
		}

		const newPeerInfo = {
			peerInfo,
			numOfConnectionFailures: 0,
			dateAdded: new Date(),
		};

		if (bucket.size < this.peerListConfig.peerBucketSize) {
			bucket.set(incomingPeerId, newPeerInfo);
			this.peerMap.set(bucketId, bucket);

			return {
				success: true,
				isEvicted: false,
			};
		}

		const evictedPeer = this._evictPeer(bucketId);
		bucket.set(incomingPeerId, newPeerInfo);
		this.peerMap.set(bucketId, bucket);

		return {
			success: true,
			isEvicted: true,
			evictedPeer: evictedPeer.peerInfo,
		};
	}

	private _evictPeer(bucketId: number): NewPeerInfo {
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
		return this.evictionRandom(bucketId);
	}
	// Evict a peer when a bucket is full based on the time of residence in a peerlist
	private _evictionBasedOnTimeInBucket(
		bucketId: number,
		peerList: Map<string, NewPeerInfo>,
	): NewPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let evictedPeer: NewPeerInfo | undefined;

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
