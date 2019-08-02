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
import { P2PDiscoveredPeerInfo, P2PPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo, getBucket, PEER_TYPE } from '../utils';

export const DEFAULT_TRIED_PEER_LIST_SIZE = 64;
export const DEFAULT_TRIED_PEER_BUCKET_SIZE = 32;
export const DEFAULT_MAX_RECONNECT_TRIES = 3;

export interface TriedPeerConfig {
	readonly triedPeerListSize?: number;
	readonly triedPeerBucketSize?: number;
	readonly maxReconnectTries?: number;
	readonly secret: number;
}

interface TriedPeerInfo {
	readonly peerInfo: P2PDiscoveredPeerInfo;
	// tslint:disable-next-line:readonly-keyword
	numOfConnectionFailures: number;
	readonly dateAdded: Date;
}

export interface AddPeerOutcome {
	readonly success: boolean;
	readonly evicted: boolean;
	readonly evictedPeer?: P2PPeerInfo;
}

export class TriedPeers {
	private readonly _triedPeerMap: Map<number, Map<string, TriedPeerInfo>>;
	private readonly _triedPeerListSize: number;
	private readonly _triedPeerBucketSize: number;
	private readonly _maxReconnectTries: number;
	private readonly _secret: number;

	public constructor(triedPeerConfig: TriedPeerConfig) {
		this._triedPeerListSize = triedPeerConfig.triedPeerListSize
			? triedPeerConfig.triedPeerListSize
			: DEFAULT_TRIED_PEER_LIST_SIZE;
		this._triedPeerBucketSize = triedPeerConfig.triedPeerBucketSize
			? triedPeerConfig.triedPeerBucketSize
			: DEFAULT_TRIED_PEER_BUCKET_SIZE;
		this._maxReconnectTries = triedPeerConfig.maxReconnectTries
			? triedPeerConfig.maxReconnectTries
			: DEFAULT_MAX_RECONNECT_TRIES;
		this._secret = triedPeerConfig.secret;
		// Initialize the Map with all the buckets
		this._triedPeerMap = new Map();
		[...Array(this._triedPeerListSize).keys()]
			.map(x => x + 1)
			.forEach(bucketId => {
				this._triedPeerMap.set(bucketId, new Map<string, TriedPeerInfo>());
			});
	}

	public get triedPeerConfig(): TriedPeerConfig {
		return {
			maxReconnectTries: this._maxReconnectTries,
			triedPeerBucketSize: this._triedPeerBucketSize,
			triedPeerListSize: this._triedPeerListSize,
			secret: this._secret,
		};
	}

	public get triedPeerMap(): Map<number, Map<string, TriedPeerInfo>> {
		return this._triedPeerMap;
	}

	public getTriedPeersList(): ReadonlyArray<P2PDiscoveredPeerInfo> {
		const peers = [...this._triedPeerMap.values()].map(triedPeerMap =>
			[...triedPeerMap.values()].map(triedPeerInfo => triedPeerInfo.peerInfo),
		);

		return peers.reduce(
			(flattenedPeerList, peerList) => [...peerList, ...flattenedPeerList],
			[],
		);
	}

	public getBucketId(ipAddress: string): number {
		return getBucket({
			secret: this._secret,
			peerType: PEER_TYPE.TRIED_PEER,
			targetAddress: ipAddress,
		});
	}

	public findPeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._triedPeerMap.get(bucketId);
		if (bucket && bucket.get(constructPeerIdFromPeerInfo(peerInfo))) {
			return true;
		}

		return false;
	}

	public updatePeer(peerInfo: P2PDiscoveredPeerInfo): boolean {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._triedPeerMap.get(bucketId);
		if (bucket) {
			const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
			const foundPeer = bucket.get(incomingPeerId);
			if (foundPeer) {
				const updatedTriedPeerInfo: TriedPeerInfo = {
					peerInfo: { ...foundPeer.peerInfo, ...peerInfo },
					dateAdded: foundPeer.dateAdded,
					numOfConnectionFailures: foundPeer.numOfConnectionFailures,
				};

				bucket.set(incomingPeerId, updatedTriedPeerInfo);
				this._triedPeerMap.set(bucketId, bucket);

				return true;
			}
		}

		return false;
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._triedPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		if (bucket && bucket.get(incomingPeerId)) {
			const success = bucket.delete(incomingPeerId);
			this._triedPeerMap.set(bucketId, bucket);

			return success;
		}

		return false;
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PDiscoveredPeerInfo | undefined {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._triedPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);
		if (bucket) {
			const triedPeer = bucket.get(incomingPeerId);

			return triedPeer ? triedPeer.peerInfo : undefined;
		}

		return undefined;
	}

	public addPeer(peerInfo: P2PDiscoveredPeerInfo): AddPeerOutcome {
		const bucketId = this.getBucketId(peerInfo.ipAddress);
		const bucket = this._triedPeerMap.get(bucketId);
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

			if (bucket.size < this._triedPeerBucketSize) {
				bucket.set(incomingPeerId, newTriedPeerInfo);
				this._triedPeerMap.set(bucketId, bucket);

				return {
					success: true,
					evicted: false,
				};
			} else {
				const evictedPeer = this._evictPeer(bucketId);
				bucket.set(incomingPeerId, newTriedPeerInfo);
				this._triedPeerMap.set(bucketId, bucket);

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

	// Should return true if the peer is evicted due to failed connection
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(incomingPeerInfo.ipAddress);
		const bucket = this._triedPeerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(incomingPeerInfo);

		if (bucket) {
			const foundPeer = bucket.get(incomingPeerId);

			if (foundPeer) {
				const { peerInfo, numOfConnectionFailures, dateAdded } = foundPeer;
				if (numOfConnectionFailures + 1 >= this._maxReconnectTries) {
					bucket.delete(incomingPeerId);
					this._triedPeerMap.set(bucketId, bucket);

					return true;
				}

				const newTriedPeerInfo = {
					peerInfo,
					numOfConnectionFailures: numOfConnectionFailures + 1,
					dateAdded,
				};

				bucket.set(incomingPeerId, newTriedPeerInfo);
				this._triedPeerMap.set(bucketId, bucket);

				return false;
			}
		}

		return false;
	}

	private _evictPeer(bucketId: number): TriedPeerInfo {
		const peerList = this._triedPeerMap.get(bucketId);
		if (!peerList) {
			throw new Error(`No Peers exist for bucket Id: ${bucketId}`);
		}

		const randomPeerIndex = Math.floor(
			Math.random() * this._triedPeerBucketSize,
		);
		const randomPeerId = Array.from(peerList.keys())[randomPeerIndex];
		const randomPeer = Array.from(peerList.values())[randomPeerIndex];
		peerList.delete(randomPeerId);
		this._triedPeerMap.set(bucketId, peerList);

		return randomPeer;
	}
}
