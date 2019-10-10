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
import { constructPeerIdFromPeerInfo, PEER_TYPE } from '../utils';
import { evictPeerRandomlyFromBucket, getBucketId } from './utils';

export interface PeerListConfig {
	readonly peerBucketCount: number;
	readonly peerBucketSize: number;
	readonly secret: number;
	readonly peerType: PEER_TYPE;
}

export interface CustomPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}

// Base list class is covering a basic peer list that has all the functionality to handle buckets with default eviction strategy
export class BaseList {
	protected peerMap: Map<number, Map<string, CustomPeerInfo>>;
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
		this.peerMap = new Map();
		this.initPeerList(this.peerMap);
	}

	public initPeerList(peerMap: Map<number, Map<string, CustomPeerInfo>>): void {
		// Init the Map with all the buckets
		for (const bucketId of [
			...new Array(this.peerListConfig.peerBucketCount).keys(),
		]) {
			peerMap.set(bucketId, new Map<string, CustomPeerInfo>());
		}
	}

	public get peersList(): ReadonlyArray<P2PPeerInfo> {
		const peersListMap: P2PPeerInfo[] = [];

		for (const peerMap of [...this.peerMap.values()]) {
			for (const peer of [...peerMap.values()]) {
				peersListMap.push(peer.peerInfo);
			}
		}

		return peersListMap;
	}

	public initPeerInfo = (peerInfo: P2PPeerInfo): CustomPeerInfo => ({
		peerInfo,
		dateAdded: new Date(),
	});

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const bucket = this.getBucket(peerInfo.ipAddress);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		const peer = bucket.get(incomingPeerId);

		return peer ? peer.peerInfo : undefined;
	}

	public addPeer(peerInfo: P2PPeerInfo): CustomPeerInfo | undefined {
		if (this.getPeer(peerInfo)) {
			throw new Error('Peer already exists');
		}
		const bucket = this.getBucket(peerInfo.ipAddress);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		const newPeer = this.initPeerInfo(peerInfo);
		const evictedPeer = this.makeSpace(peerInfo.ipAddress);
		bucket.set(incomingPeerId, newPeer);

		// If a peer was evicted in order to make space for the new one, we return its info
		return evictedPeer;
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		const bucket = this.getBucket(peerInfo.ipAddress);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		const foundPeer = bucket.get(incomingPeerId);

		if (!foundPeer) {
			return false;
		}
		const updatedPeerInfo: CustomPeerInfo = {
			...foundPeer,
			peerInfo: { ...foundPeer.peerInfo, ...peerInfo },
		};

		bucket.set(incomingPeerId, updatedPeerInfo);

		return true;
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		const bucket = this.getBucket(peerInfo.ipAddress);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (bucket.get(incomingPeerId)) {
			const result = bucket.delete(incomingPeerId);

			return result;
		}

		return false;
	}

	public getBucket(ipAddress: string): Map<string, CustomPeerInfo> {
		const bucketId = getBucketId({
			secret: this.peerListConfig.secret,
			peerType: this.peerListConfig.peerType,
			targetAddress: ipAddress,
			bucketCount: this.peerListConfig.peerBucketCount,
		});

		return this.peerMap.get(bucketId) as Map<string, CustomPeerInfo>;
	}

	public makeSpace(ipAddress: string): CustomPeerInfo | undefined {
		const bucket = this.getBucket(ipAddress);

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
