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
import { evictPeerRandomlyFromBucket, getBucketId, PEER_TYPE } from '../utils';

export interface PeerListConfig {
	readonly peerBucketCount: number;
	readonly peerBucketSize: number;
	readonly secret: number;
	readonly peerType: PEER_TYPE;
}

interface PeerLookup {
	readonly peerInfo: P2PEnhancedPeerInfo;
	readonly bucket: Bucket;
}

type Bucket = Map<string, P2PEnhancedPeerInfo>;

const addDate = (peerInfo: P2PPeerInfo): P2PEnhancedPeerInfo => ({
	...peerInfo,
	dateAdded: new Date(),
});

const removeInternalFields = (peerInfo: P2PEnhancedPeerInfo): P2PPeerInfo => {
	const {
		dateAdded,
		numOfConnectionFailures,
		sourceAddress,
		...sharedPeerInfo
	} = peerInfo;

	return sharedPeerInfo;
};

// Base list class is covering a basic peer list that has all the functionality to handle buckets with default eviction strategy
export class BaseList {
	protected bucketIdToBucket: Map<number, Bucket>;
	/*
		Auxilliary map for peerInfo lookups
	*/
	protected peerIdToPeerLookup: Map<string, PeerLookup>;
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
		this.initPeerList(this.bucketIdToBucket);

		this.peerIdToPeerLookup = new Map();
	}

	public initPeerList(
		bucketToPeerListMap: Map<number, Map<string, P2PEnhancedPeerInfo>>,
	): void {
		// Init the Map with all the buckets
		for (const bucketId of [
			...new Array(this.peerListConfig.peerBucketCount).keys(),
		]) {
			bucketToPeerListMap.set(bucketId, new Map<string, P2PEnhancedPeerInfo>());
		}
	}

	public get peerList(): ReadonlyArray<P2PPeerInfo> {
		const peerListMap: P2PPeerInfo[] = [];

		for (const peerList of [...this.bucketIdToBucket.values()]) {
			for (const peer of [...peerList.values()]) {
				/*
					Remove internal fields before sharing
				*/
				peerListMap.push(removeInternalFields(peer));
			}
		}

		return peerListMap;
	}

	public calculateBucket(
		targetAddress: string,
		sourceAddress?: string,
	): Bucket {
		const bucketId = getBucketId({
			secret: this.peerListConfig.secret,
			peerType: this.peerListConfig.peerType,
			targetAddress,
			sourceAddress,
			bucketCount: this.peerListConfig.peerBucketCount,
		});

		return this.bucketIdToBucket.get(bucketId) as Bucket;
	}

	public getPeer(incomingPeerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const peerLookup = this.peerIdToPeerLookup.get(incomingPeerInfo.peerId);

		if (!(peerLookup && peerLookup.peerInfo)) {
			throw new Error('Peer not found in peer book.');
		}

		return peerLookup.peerInfo;
	}

	public addPeer(
		incomingPeerInfo: P2PEnhancedPeerInfo,
	): P2PEnhancedPeerInfo | undefined {
		if (this.getPeer(incomingPeerInfo)) {
			throw new ExistingPeerError(incomingPeerInfo);
		}
		const bucket = this.calculateBucket(
			incomingPeerInfo.ipAddress,
			incomingPeerInfo.sourceAddress
				? incomingPeerInfo.sourceAddress
				: undefined,
		);
		const incomingPeerId = incomingPeerInfo.peerId;
		const peerInfo = addDate(incomingPeerInfo);
		bucket.set(incomingPeerId, peerInfo);
		this.peerIdToPeerLookup.set(incomingPeerInfo.peerId, { peerInfo, bucket });

		const evictedPeer = this.makeSpace(incomingPeerInfo.peerId);

		// If a peer was evicted in order to make space for the new one, we return its info
		return evictedPeer;
	}

	public updatePeer(incomingPeerInfo: P2PPeerInfo): boolean {
		const peerLookup = this.peerIdToPeerLookup.get(incomingPeerInfo.peerId);

		if (!(peerLookup && peerLookup.bucket)) {
			return false;
		}

		const foundPeer = peerLookup.bucket.get(incomingPeerInfo.peerId);

		if (!foundPeer) {
			return false;
		}

		peerLookup.bucket.set(incomingPeerInfo.peerId, {
			...foundPeer,
			...incomingPeerInfo,
		});

		this.peerIdToPeerLookup.set(incomingPeerInfo.peerId, {
			peerInfo: {
				...foundPeer,
				...incomingPeerInfo,
			},
			bucket: peerLookup.bucket,
		});

		return true;
	}

	public removePeer(incomingPeerInfo: P2PPeerInfo): boolean {
		const peerLookup = this.peerIdToPeerLookup.get(incomingPeerInfo.peerId);

		if (!(peerLookup && peerLookup.bucket)) {
			return false;
		}

		if (peerLookup.bucket.get(incomingPeerInfo.peerId)) {
			const result = peerLookup.bucket.delete(incomingPeerInfo.peerId);

			return result;
		}

		return false;
	}

	public makeSpace(peerId: string): P2PEnhancedPeerInfo | undefined {
		const peerLookup = this.peerIdToPeerLookup.get(peerId);

		if (
			peerLookup &&
			peerLookup.bucket &&
			peerLookup.bucket.size === this.peerListConfig.peerBucketSize
		) {
			return evictPeerRandomlyFromBucket(peerLookup.bucket);
		}

		return undefined;
	}

	// This action is called when a peer is disconnected
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const result = this.removePeer(incomingPeerInfo);

		return result;
	}
}
