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
import { constructPeerIdFromPeerInfo, getBucket } from '../utils';

const DEFAULT_NEW_PEER_LIST_SIZE = 64;
const DEFAULT_NEW_PEER_BUCKET_SIZE = 32;
const MILLISECONDS_IN_ONE_DAY = 86400000; // Formula hours*minutes*seconds*milliseconds;
const ELIGIBLE_DAYS_FOREVICTION = 30;

export interface NewPeerConfig {
	readonly newPeerListSize?: number;
	readonly newPeerBucketSize?: number;
}
interface NewPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}

export class NewPeers {
	private readonly _newPeerMap: Map<number, Map<string, NewPeerInfo>>;
	private readonly _newPeerListSize: number;
	private readonly _newPeerBucketSize: number;

	public constructor(newPeerConfig: NewPeerConfig) {
		this._newPeerBucketSize = newPeerConfig.newPeerBucketSize
			? newPeerConfig.newPeerBucketSize
			: DEFAULT_NEW_PEER_BUCKET_SIZE;
		this._newPeerListSize = newPeerConfig.newPeerListSize
			? newPeerConfig.newPeerListSize
			: DEFAULT_NEW_PEER_LIST_SIZE;
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
		};
	}

	public get triedPeerMap(): Map<number, Map<string, NewPeerInfo>> {
		return this._newPeerMap;
	}

	public findPeer(peerInfo: P2PPeerInfo): boolean {
		// tslint:disable-next-line:no-let
		let ifExists = false;

		[...this._newPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (peersMap.has(peerId)) {
				ifExists = true;

				return;
			}
		});

		return ifExists;
	}

	public updatePeer(peerInfo: P2PPeerInfo): void {
		[...this._newPeerMap.values()].map(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const newPeer = peersMap.get(peerId);
			if (newPeer) {
				const updatedNewPeerInfo: NewPeerInfo = {
					peerInfo: { ...newPeer, ...peerInfo },
					dateAdded: newPeer.dateAdded,
				};
				peersMap.set(peerId, updatedNewPeerInfo);
			}

			return peersMap;
		});
	}

	public removePeer(peerInfo: P2PDiscoveredPeerInfo): void {
		[...this._newPeerMap.values()].map(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			peersMap.delete(peerId);
		});
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let peer: NewPeerInfo | undefined;

		[...this._newPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			peer = peersMap.get(peerId);

			return;
		});

		return peer ? peer.peerInfo : undefined;
	}

	public addPeer(peerInfo: P2PPeerInfo): boolean {
		// tslint:disable-next-line:no-let
		let success = false;

		if (!this.findPeer(peerInfo)) {
			const newPeerInfo = {
				peerInfo,
				numOfConnectionFailures: 0,
				dateAdded: new Date(),
			};

			const bucketNumber = getBucket(
				peerInfo.ipAddress,
				Math.random(),
				this._newPeerListSize,
			);
			if (bucketNumber) {
				const bucketList = this._newPeerMap.get(bucketNumber);
				if (bucketList) {
					if (bucketList.size < this._newPeerBucketSize) {
						bucketList.set(constructPeerIdFromPeerInfo(peerInfo), newPeerInfo);
						this._newPeerMap.set(bucketNumber, bucketList);
						success = true;
					} else {
						this._evictPeer(bucketNumber);
						bucketList.set(constructPeerIdFromPeerInfo(peerInfo), newPeerInfo);
						this._newPeerMap.set(bucketNumber, bucketList);
						success = true;
					}
				}
			}
		}

		return success;
	}

	public failedConnectionAction(
		incomingPeerInfo: P2PDiscoveredPeerInfo,
	): boolean {
		// tslint:disable-next-line:no-let
		let evictPeer = false;

		[...this._newPeerMap.values()].forEach((peersMap, index) => {
			const peerId = constructPeerIdFromPeerInfo(incomingPeerInfo);
			peersMap.delete(peerId);
			this._newPeerMap.set(index, peersMap);
			evictPeer = true;
		});

		return evictPeer;
	}

	private _evictPeer(bucketId: number): NewPeerInfo | undefined {
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
		return this._evictionRandom(bucketId, peerList);
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

	private _evictionRandom(
		bucketId: number,
		peerList: Map<string, NewPeerInfo>,
	): NewPeerInfo | undefined {
		// Second eviction strategy
		const randomPeerIndex = Math.floor(Math.random() * this._newPeerBucketSize);
		const randomPeerId = Array.from(peerList.keys())[randomPeerIndex];
		peerList.delete(randomPeerId);
		this._newPeerMap.set(bucketId, peerList);
		const evictedPeer = peerList.get(randomPeerId);

		return evictedPeer;
	}
}
