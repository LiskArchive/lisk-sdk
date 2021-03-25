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
// eslint-disable-next-line import/no-cycle
import { ExistingPeerError } from '../errors';
// eslint-disable-next-line import/no-cycle
import { P2PEnhancedPeerInfo, P2PPeerInfo } from '../types';
// eslint-disable-next-line import/no-cycle
import {
	evictPeerRandomlyFromBucket,
	getBucketId,
	PEER_TYPE,
	sanitizeEnhancedPeerInfo,
} from '../utils';

export interface PeerListConfig {
	readonly numOfBuckets: number;
	readonly bucketSize: number;
	readonly secret: number;
	readonly peerType: PEER_TYPE;
}

export type Bucket = Map<string, P2PEnhancedPeerInfo>;

export interface BucketInfo {
	readonly bucketId: number;
	readonly bucket: Bucket;
}

export class BaseList {
	protected bucketIdToBucket: Map<number, Bucket>;
	/*
		Auxillary map for direct peerId => peerInfo lookups
		Required because peerLists may be provided by discrete sources
	*/
	protected peerIdToPeerInfo: Map<string, P2PEnhancedPeerInfo>;
	protected type: PEER_TYPE | undefined;
	protected readonly peerListConfig: PeerListConfig;

	public constructor({ bucketSize, numOfBuckets, secret, peerType }: PeerListConfig) {
		this.peerListConfig = {
			bucketSize,
			numOfBuckets,
			peerType,
			secret,
		};
		this.bucketIdToBucket = new Map<number, Bucket>();
		this._initBuckets();
		this.peerIdToPeerInfo = new Map<string, P2PEnhancedPeerInfo>();
	}

	public get peerList(): ReadonlyArray<P2PPeerInfo> {
		const peerListMap: P2PPeerInfo[] = [];

		for (const peerList of [...this.bucketIdToBucket.values()]) {
			for (const peer of [...peerList.values()]) {
				// Remove internal fields before sharing
				peerListMap.push(sanitizeEnhancedPeerInfo(peer));
			}
		}

		return peerListMap;
	}

	public hasPeer(incomingPeerId: string): boolean {
		return this.peerIdToPeerInfo.has(incomingPeerId);
	}

	public addPeer(incomingPeerInfo: P2PEnhancedPeerInfo): P2PEnhancedPeerInfo | undefined {
		if (this.hasPeer(incomingPeerInfo.peerId)) {
			throw new ExistingPeerError(incomingPeerInfo);
		}

		const { bucketId, bucket } = this.calculateBucket(
			incomingPeerInfo.ipAddress,
			this.type === PEER_TYPE.NEW_PEER ? incomingPeerInfo.sourceAddress : undefined,
		);

		// If bucket is full, evict a peer to make space for incoming peer
		const evictedPeer =
			bucket.size >= this.peerListConfig.bucketSize ? this.makeSpace(bucket) : undefined;

		const internalPeerInfo = {
			...incomingPeerInfo,
			numOfConnectionFailures: 0,
			dateAdded: new Date(),
			bucketId,
		};
		bucket.set(incomingPeerInfo.peerId, internalPeerInfo);
		this.peerIdToPeerInfo.set(incomingPeerInfo.peerId, internalPeerInfo);

		return evictedPeer;
	}

	public getPeer(incomingPeerId: string): P2PPeerInfo | undefined {
		const peerInfo = this.peerIdToPeerInfo.get(incomingPeerId);

		if (!peerInfo) {
			return undefined;
		}

		return sanitizeEnhancedPeerInfo(peerInfo);
	}

	public updatePeer(incomingPeerInfo: P2PEnhancedPeerInfo): boolean {
		const bucket = this.getBucket(incomingPeerInfo.peerId);

		if (!bucket) {
			return false;
		}

		const updatedInternalPeerInfo = {
			...bucket.get(incomingPeerInfo.peerId),
			...incomingPeerInfo,
		};

		bucket.set(incomingPeerInfo.peerId, updatedInternalPeerInfo);
		this.peerIdToPeerInfo.set(incomingPeerInfo.peerId, updatedInternalPeerInfo);

		return true;
	}

	public removePeer(incomingPeerInfo: P2PPeerInfo): boolean {
		const bucket = this.getBucket(incomingPeerInfo.peerId);

		if (bucket?.has(incomingPeerInfo.peerId)) {
			const removedFromBucket = bucket.delete(incomingPeerInfo.peerId);
			const removedFromPeerLookup = this.peerIdToPeerInfo.delete(incomingPeerInfo.peerId);

			return removedFromBucket && removedFromPeerLookup;
		}

		return false;
	}

	public makeSpace(bucket: Bucket): P2PEnhancedPeerInfo | undefined {
		return evictPeerRandomlyFromBucket(bucket);
	}

	// This action is called when a peer is disconnected
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		return this.removePeer(incomingPeerInfo);
	}

	public calculateBucket(targetAddress: string, sourceAddress?: string): BucketInfo {
		const bucketId = getBucketId({
			secret: this.peerListConfig.secret,
			peerType: this.peerListConfig.peerType,
			targetAddress,
			sourceAddress: this.type === PEER_TYPE.NEW_PEER ? sourceAddress : undefined,
			bucketCount: this.peerListConfig.numOfBuckets,
		});

		return { bucketId, bucket: this.bucketIdToBucket.get(bucketId) as Bucket };
	}

	protected getBucket(peerId: string): Bucket | undefined {
		const internalPeerInfo = this.peerIdToPeerInfo.get(peerId);

		if (typeof internalPeerInfo?.bucketId !== 'number') {
			return undefined;
		}

		const bucket = this.bucketIdToBucket.get(internalPeerInfo.bucketId);

		if (!bucket) {
			return undefined;
		}

		return bucket;
	}

	private _initBuckets(): void {
		// Init the Map with all the buckets
		for (const bucketId of [...new Array(this.peerListConfig.numOfBuckets).keys()]) {
			this.bucketIdToBucket.set(bucketId, new Map<string, P2PEnhancedPeerInfo>());
		}
	}
}
