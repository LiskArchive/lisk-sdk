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

export const DEFAULT_NEW_PEER_BUCKET_COUNT = 128;
export const DEFAULT_NEW_PEER_BUCKET_SIZE = 32;
export const DEFAULT_ELIGIBLE_DAYS_FOR_EVICTION = 30;

const MILLISECONDS_IN_ONE_DAY = 86400000; // Formula hours*minutes*seconds*milliseconds;

export interface NewPeerConfig {
	readonly eligibleDaysForEviction?: number;
	readonly newPeerBucketCount?: number;
	readonly newPeerBucketSize?: number;
	readonly secret: number;
}
interface NewPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}

export interface AddPeerOutcome {
	readonly success: boolean;
	readonly isEvicted: boolean;
	readonly evictedPeer?: P2PPeerInfo;
}
export class NewPeers {
	private readonly _newPeerMap: Map<number, Map<string, NewPeerInfo>>;
	private readonly _newPeerBucketCount: number;
	private readonly _newPeerBucketSize: number;
	private readonly _eligibleDaysForEviction: number;
	private readonly _secret: number;

	public constructor({
		eligibleDaysForEviction,
		newPeerBucketSize,
		newPeerBucketCount,
		secret,
	}: NewPeerConfig) {
		this._newPeerBucketSize = newPeerBucketSize
			? newPeerBucketSize
			: DEFAULT_NEW_PEER_BUCKET_SIZE;
		this._newPeerBucketCount = newPeerBucketCount
			? newPeerBucketCount
			: DEFAULT_NEW_PEER_BUCKET_COUNT;
		this._eligibleDaysForEviction = eligibleDaysForEviction
			? eligibleDaysForEviction
			: DEFAULT_ELIGIBLE_DAYS_FOR_EVICTION;
		this._secret = secret;
		// Initialize the Map with all the buckets
		this._newPeerMap = new Map();
		[...new Array(this._newPeerBucketCount).keys()].forEach(bucketNumber => {
			this._newPeerMap.set(bucketNumber, new Map<string, NewPeerInfo>());
		});
	}

	public get newPeerConfig(): NewPeerConfig {
		return {
			newPeerBucketSize: this._newPeerBucketSize,
			newPeerBucketCount: this._newPeerBucketCount,
			secret: this._secret,
		};
	}

	public newPeersList(): ReadonlyArray<P2PPeerInfo> {
		const peersListMap: P2PPeerInfo[] = [];

		[...this._newPeerMap.values()].forEach(peerMap => {
			peerMap.forEach(peer => peersListMap.push(peer.peerInfo));
		});

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
		const bucket = this._newPeerMap.get(bucketId);
		if (bucket) {
			const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
			const foundPeer = bucket.get(incomingPeerId);
			if (foundPeer) {
				const updatedNewPeerInfo: NewPeerInfo = {
					peerInfo: { ...foundPeer.peerInfo, ...peerInfo },
					dateAdded: foundPeer.dateAdded,
				};

				bucket.set(incomingPeerId, updatedNewPeerInfo);
				this._newPeerMap.set(bucketId, bucket);

				return true;
			}
		}

		return false;
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		if (bucket && bucket.get(incomingPeerId)) {
			const success = bucket.delete(incomingPeerId);
			this._newPeerMap.set(bucketId, bucket);

			return success;
		}

		return false;
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		if (bucket) {
			const newPeer = bucket.get(incomingPeerId);

			return newPeer ? newPeer.peerInfo : undefined;
		}

		return undefined;
	}

	// Addition of peer can also result in peer eviction if the bucket of the incoming peer is already full based on evection strategy.
	public addPeer(peerInfo: P2PPeerInfo): AddPeerOutcome {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (bucket && bucket.get(incomingPeerId)) {
			return {
				success: false,
				isEvicted: false,
			};
		}

		if (bucket) {
			const newPeerInfo = {
				peerInfo,
				numOfConnectionFailures: 0,
				dateAdded: new Date(),
			};

			if (bucket.size < this._newPeerBucketSize) {
				bucket.set(incomingPeerId, newPeerInfo);
				this._newPeerMap.set(bucketId, bucket);

				return {
					success: true,
					isEvicted: false,
				};
			} else {
				const evictedPeer = this._evictPeer(bucketId);
				bucket.set(incomingPeerId, newPeerInfo);
				this._newPeerMap.set(bucketId, bucket);

				return {
					success: true,
					isEvicted: true,
					evictedPeer: evictedPeer.peerInfo,
				};
			}
		}

		return {
			success: false,
			isEvicted: false,
		};
	}

	// This action is called when a peer is disconnected
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const success = this.removePeer(incomingPeerInfo);

		return success;
	}

	private _evictPeer(bucketId: number): NewPeerInfo {
		const peerList = this._newPeerMap.get(bucketId);

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

		// Second eviction strategy
		return this._evictionRandom(bucketId);
	}
	// Evict a peer when a bucket is full based on the time of residence in a peerlist
	private _evictionBasedOnTimeInBucket(
		bucketId: number,
		peerList: Map<string, NewPeerInfo>,
	): NewPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let evictedPeer: NewPeerInfo | undefined;

		[...this._newPeerMap.values()].forEach(peersMap => {
			[...peersMap.keys()].forEach(peerId => {
				const peer = peersMap.get(peerId);
				if (peer) {
					const diffDays = Math.round(
						Math.abs(
							(peer.dateAdded.getTime() - new Date().getTime()) /
								MILLISECONDS_IN_ONE_DAY,
						),
					);
					if (diffDays >= this._eligibleDaysForEviction) {
						peerList.delete(peerId);
						this._newPeerMap.set(bucketId, peerList);
						evictedPeer = peer;
					}
				}
			});
		});

		return evictedPeer;
	}
	// If there are no peers which are old enough to be evicted based on number of days then pick a peer randomly and evict.
	private _evictionRandom(bucketId: number): NewPeerInfo {
		const peerList = this._newPeerMap.get(bucketId);
		if (!peerList) {
			throw new Error(`No Peers exist for bucket Id: ${bucketId}`);
		}

		const randomPeerIndex = Math.floor(Math.random() * this._newPeerBucketSize);
		const randomPeerId = Array.from(peerList.keys())[randomPeerIndex];
		const randomPeer = Array.from(peerList.values())[randomPeerIndex];
		peerList.delete(randomPeerId);
		this._newPeerMap.set(bucketId, peerList);

		return randomPeer;
	}
}
