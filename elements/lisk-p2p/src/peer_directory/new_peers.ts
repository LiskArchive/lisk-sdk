/*
 * Copyright © 2018 Lisk Foundation
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

const DEFAULT_NEW_PEER_LIST_SIZE = 128;
const DEFAULT_NEW_PEER_BUCKET_SIZE = 32;
const MILLISECONDS_IN_ONE_DAY = 86400000; // Formula hours*minutes*seconds*milliseconds;
const ELIGIBLE_DAYS_FOREVICTION = 30;

export interface NewPeerConfig {
	readonly newPeerListSize?: number;
	readonly newPeerBucketSize?: number;
	readonly secret: number;
}
interface NewPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}

export interface AddPeerOutcome {
	readonly success: boolean;
	readonly evicted: boolean;
	readonly evictedPeer?: P2PPeerInfo;
}
export class NewPeers {
	private readonly _newPeerMap: Map<number, Map<string, NewPeerInfo>>;
	private readonly _newPeerListSize: number;
	private readonly _newPeerBucketSize: number;
	private readonly _secret: number;

	public constructor(newPeerConfig: NewPeerConfig) {
		this._newPeerBucketSize = newPeerConfig.newPeerBucketSize
			? newPeerConfig.newPeerBucketSize
			: DEFAULT_NEW_PEER_BUCKET_SIZE;
		this._newPeerListSize = newPeerConfig.newPeerListSize
			? newPeerConfig.newPeerListSize
			: DEFAULT_NEW_PEER_LIST_SIZE;
		this._secret = newPeerConfig.secret;
		// Initialize the Map with all the buckets
		this._newPeerMap = new Map();
		[...Array(this._newPeerListSize).keys()]
			.map(x => x + 1)
			.forEach(bucketNumber => {
				this._newPeerMap.set(bucketNumber, new Map<string, NewPeerInfo>());
			});
	}

	public get newPeerConfig(): NewPeerConfig {
		return {
			newPeerBucketSize: this._newPeerBucketSize,
			newPeerListSize: this._newPeerListSize,
			secret: this._secret,
		};
	}

	public get newPeerMap(): Map<number, Map<string, NewPeerInfo>> {
		return this._newPeerMap;
	}

	public getNewPeersList(): ReadonlyArray<P2PPeerInfo> {
		const peers = [...this._newPeerMap.values()].map(newPeerMap =>
			[...newPeerMap.values()].map(newPeerInfo => newPeerInfo.peerInfo),
		);

		return peers.reduce(
			(flattenedPeerList, peerList) => [...peerList, ...flattenedPeerList],
			[],
		);
	}

	public findPeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: peerInfo.ipAddress,
		});

		const bucket = this._newPeerMap.get(bucketId);
		if (bucket && bucket.get(constructPeerIdFromPeerInfo(peerInfo))) {
			return true;
		}

		return false;
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: peerInfo.ipAddress,
		});

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
		const bucketId = getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: peerInfo.ipAddress,
		});

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
		const bucketId = getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: peerInfo.ipAddress,
		});

		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		if (bucket) {
			const newPeer = bucket.get(incomingPeerId);

			return newPeer ? newPeer.peerInfo : undefined;
		}

		return undefined;
	}

	public addPeer(peerInfo: P2PPeerInfo): AddPeerOutcome {
		const bucketId = getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.NEW_PEER,
			targetAddress: peerInfo.ipAddress,
		});
		const bucket = this._newPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		if (bucket && bucket.get(incomingPeerId)) {
			return {
				success: false,
				evicted: false,
			};
		}

		if (bucket) {
			const newTriedPeerInfo = {
				peerInfo,
				numOfConnectionFailures: 0,
				dateAdded: new Date(),
			};

			if (bucket.size < this._newPeerBucketSize) {
				bucket.set(incomingPeerId, newTriedPeerInfo);
				this._newPeerMap.set(bucketId, bucket);

				return {
					success: true,
					evicted: false,
				};
			} else {
				const evictedPeer = this._evictPeer(bucketId);
				bucket.set(incomingPeerId, newTriedPeerInfo);
				this._newPeerMap.set(bucketId, bucket);

				return {
					success: true,
					evicted: true,
					evictedPeer: evictedPeer.peerInfo,
				};
			}
		}

		return {
			success: false,
			evicted: false,
		};
	}

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
					if (diffDays >= ELIGIBLE_DAYS_FOREVICTION) {
						peerList.delete(peerId);
						this._newPeerMap.set(bucketId, peerList);
						evictedPeer = peer;
					}
				}
			});
		});

		return evictedPeer;
	}

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
