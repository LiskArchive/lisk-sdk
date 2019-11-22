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
import { ExistingPeerError } from '../errors';
import { P2PEnhancedPeerInfo, P2PPeerInfo } from '../p2p_types';
import {
	evictPeerRandomlyFromBucket,
	getBucketId,
	PEER_TYPE,
	sanitizeInternalPeerInfo,
} from '../utils';

export interface PeerListConfig {
	readonly peerBucketCount: number;
	readonly peerBucketSize: number;
	readonly secret: number;
	readonly peerType: PEER_TYPE;
}

type Bucket = Map<string, P2PEnhancedPeerInfo>;

export interface BucketInfo {
	readonly bucketId: number;
	readonly bucket: Bucket;
}
// Base list class is covering a basic peer list that has all the functionality to handle buckets with default eviction strategy
export class BaseList {
	protected bucketIdToBucket: Map<number, Bucket>;
	// Auxilliary data structure for peerInfo lookups
	protected peerIdToPeerInfo: Map<string, P2PEnhancedPeerInfo>;
	protected readonly peerListConfig: PeerListConfig;

	public constructor({
		peerBucketSize,
		peerBucketCount,
		secret,
		peerType,
	}: PeerListConfig) {
		this.peerListConfig = {
			peerBucketCount,
			peerBucketSize,
			peerType,
			secret,
		};
		this.bucketIdToBucket = new Map();
		this.initBuckets(this.bucketIdToBucket);
		this.peerIdToPeerInfo = new Map();
	}

	public initBuckets(bucketIdToBucket: Map<number, Bucket>): void {
		// Init the Map with all the buckets
		for (const bucketId of [
			...new Array(this.peerListConfig.peerBucketCount).keys(),
		]) {
			bucketIdToBucket.set(bucketId, new Map<string, P2PEnhancedPeerInfo>());
		}
	}

	public get peerList(): ReadonlyArray<P2PPeerInfo> {
		const peerListMap: P2PPeerInfo[] = [];

		for (const peerList of [...this.bucketIdToBucket.values()]) {
			for (const peer of [...peerList.values()]) {
				// Remove internal fields before sharing
				peerListMap.push(sanitizeInternalPeerInfo(peer));
			}
		}

		return peerListMap;
	}

	public calculateBucket(
		targetAddress: string,
		sourceAddress?: string,
	): BucketInfo {
		const bucketId = getBucketId({
			secret: this.peerListConfig.secret,
			peerType: this.peerListConfig.peerType,
			targetAddress,
			sourceAddress,
			bucketCount: this.peerListConfig.peerBucketCount,
		});

		return { bucketId, bucket: this.bucketIdToBucket.get(bucketId) as Bucket };
	}

	public getPeer(
		incomingPeerInfo: P2PPeerInfo,
	): P2PEnhancedPeerInfo | undefined {
		const peerInfo = this.peerIdToPeerInfo.get(incomingPeerInfo.peerId);

		if (!peerInfo) {
			return undefined;
		}

		return sanitizeInternalPeerInfo(peerInfo);
	}

	public addPeer(
		incomingPeerInfo: P2PEnhancedPeerInfo,
	): P2PEnhancedPeerInfo | undefined {
		if (this.getPeer(incomingPeerInfo)) {
			throw new ExistingPeerError(incomingPeerInfo);
		}
		const { bucketId, bucket } = this.calculateBucket(
			incomingPeerInfo.ipAddress,
			incomingPeerInfo.sourceAddress
				? incomingPeerInfo.sourceAddress
				: undefined,
		);
		const evictedPeer = this.makeSpace(incomingPeerInfo);
		const internalPeerInfo = {
			...incomingPeerInfo,
			dateAdded: new Date(),
			bucketId,
		};
		bucket.set(incomingPeerInfo.peerId, internalPeerInfo);
		this.peerIdToPeerInfo.set(incomingPeerInfo.peerId, internalPeerInfo);

		// If a peer was evicted in order to make space for the new one, we return its info
		return evictedPeer;
	}

	public updatePeer(incomingPeerInfo: P2PPeerInfo): boolean {
		const peerInfo = this.peerIdToPeerInfo.get(incomingPeerInfo.peerId);

		if (!(peerInfo && peerInfo.bucketId)) {
			return false;
		}

		const bucket = this.bucketIdToBucket.get(peerInfo.bucketId);

		if (!(bucket && bucket.get(incomingPeerInfo.peerId))) {
			return false;
		}

		const updatedPeerInfo = {
			...bucket.get(incomingPeerInfo.peerId),
			...incomingPeerInfo,
		};

		bucket.set(incomingPeerInfo.peerId, updatedPeerInfo);

		this.peerIdToPeerInfo.set(incomingPeerInfo.peerId, updatedPeerInfo);

		return true;
	}

	public removePeer(incomingPeerInfo: P2PPeerInfo): boolean {
		const peerInfo = this.peerIdToPeerInfo.get(incomingPeerInfo.peerId);

		if (!(peerInfo && peerInfo.bucketId)) {
			return false;
		}

		const bucket = this.bucketIdToBucket.get(peerInfo.bucketId);

		if (bucket && bucket.get(incomingPeerInfo.peerId)) {
			const removedFromBucket = bucket.delete(incomingPeerInfo.peerId);
			const removedFromPeerLookup = this.peerIdToPeerInfo.delete(
				incomingPeerInfo.peerId,
			);

			return removedFromBucket && removedFromPeerLookup;
		}

		return false;
	}

	public makeSpace(peerInfo: P2PEnhancedPeerInfo): P2PEnhancedPeerInfo | undefined {
		const { bucket } = this.calculateBucket(peerInfo.ipAddress, peerInfo.sourceAddress ? peerInfo.sourceAddress : undefined);

		if (bucket && bucket.size === this.peerListConfig.peerBucketSize) {
			return evictPeerRandomlyFromBucket(bucket);
		}

		return undefined;
	}

	// This action is called when a peer is disconnected
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const result = this.removePeer(incomingPeerInfo);

		return result;
	}
}
