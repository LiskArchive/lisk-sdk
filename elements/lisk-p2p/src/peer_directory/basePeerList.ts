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
import { P2PPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo, getBucket, PEER_TYPE } from '../utils';

export const DEFAULT_PEER_BUCKET_COUNT = 128;
export const DEFAULT_PEER_BUCKET_SIZE = 32;

export interface PeerListConfig {
	readonly peerBucketCount?: number;
	readonly peerBucketSize?: number;
	readonly secret: number;
}
interface CustomPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}

export interface AddPeerOutcome {
	readonly success: boolean;
	readonly isEvicted: boolean;
	readonly evictedPeer?: P2PPeerInfo;
}
// Base peer list class is covering a basic peer list that has all the functionality to handle buckets with default eviction strategy
export class BasePeerList {
	private readonly _peerMap: Map<number, Map<string, CustomPeerInfo>>;
	private readonly _peerBucketCount: number;
	private readonly _peerBucketSize: number;
	private readonly _secret: number;

	public constructor({
		peerBucketSize,
		peerBucketCount,
		secret,
	}: PeerListConfig) {
		this._peerBucketSize = peerBucketSize
			? peerBucketSize
			: DEFAULT_PEER_BUCKET_SIZE;
		this._peerBucketCount = peerBucketCount
			? peerBucketCount
			: DEFAULT_PEER_BUCKET_COUNT;

		this._secret = secret;
		this._peerMap = new Map();
		// Initialize the Map with all the buckets
		for (const bucketId of [...new Array(this._peerBucketCount).keys()]) {
			this._peerMap.set(bucketId, new Map<string, CustomPeerInfo>());
		}
	}

	public get peerConfig(): PeerListConfig {
		return {
			peerBucketSize: this._peerBucketSize,
			peerBucketCount: this._peerBucketCount,
			secret: this._secret,
		};
	}

	public peersList(): ReadonlyArray<P2PPeerInfo> {
		const peersListMap: P2PPeerInfo[] = [];

		for (const peerMap of [...this._peerMap.values()]) {
			for (const peer of [...peerMap.values()]) {
				peersListMap.push(peer.peerInfo);
			}
		}

		return peersListMap;
	}

	public getBucketId(ipAddress: string): number {
		return getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: ipAddress,
		});
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._peerMap.get(bucketId);

		if (!bucket) {
			return false;
		}
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		const foundPeer = bucket.get(incomingPeerId);

		if (!foundPeer) {
			return false;
		}
		const updatedPeerInfo: CustomPeerInfo = {
			peerInfo: { ...foundPeer.peerInfo, ...peerInfo },
			dateAdded: foundPeer.dateAdded,
		};

		bucket.set(incomingPeerId, updatedPeerInfo);
		this._peerMap.set(bucketId, bucket);

		return true;
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._peerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (bucket && bucket.get(incomingPeerId)) {
			const success = bucket.delete(incomingPeerId);
			this._peerMap.set(bucketId, bucket);

			return success;
		}

		return false;
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._peerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (!bucket) {
			return undefined;
		}
		const peer = bucket.get(incomingPeerId);

		return peer ? peer.peerInfo : undefined;
	}

	// Addition of peer can also result in peer eviction if the bucket of the incoming peer is already full based on evection strategy.
	public addPeer(peerInfo: P2PPeerInfo): AddPeerOutcome {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._peerMap.get(bucketId);
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

		const newPeer = {
			peerInfo,
			numOfConnectionFailures: 0,
			dateAdded: new Date(),
		};

		if (bucket.size < this._peerBucketSize) {
			bucket.set(incomingPeerId, newPeer);
			this._peerMap.set(bucketId, bucket);

			return {
				success: true,
				isEvicted: false,
			};
		}

		const evictedPeer = this._evictionRandom(bucketId);
		bucket.set(incomingPeerId, newPeer);
		this._peerMap.set(bucketId, bucket);

		return {
			success: true,
			isEvicted: true,
			evictedPeer: evictedPeer.peerInfo,
		};
	}

	// This action is called when a peer is disconnected
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const success = this.removePeer(incomingPeerInfo);

		return success;
	}
	// If there are no peers which are old enough to be evicted based on number of days then pick a peer randomly and evict.
	private _evictionRandom(bucketId: number): CustomPeerInfo {
		const peerList = this._peerMap.get(bucketId);
		if (!peerList) {
			throw new Error(`No Peers exist for bucket Id: ${bucketId}`);
		}

		const randomPeerIndex = Math.floor(Math.random() * this._peerBucketSize);
		const randomPeerId = Array.from(peerList.keys())[randomPeerIndex];
		const randomPeer = Array.from(peerList.values())[randomPeerIndex];
		peerList.delete(randomPeerId);
		this._peerMap.set(bucketId, peerList);

		return randomPeer;
	}
}
