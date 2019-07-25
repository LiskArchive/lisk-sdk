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
import { P2PDiscoveredPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo, getBucket } from '../utils';

export const DEFAULT_TRIED_PEER_LIST_SIZE = 64;
export const DEFAULT_TRIED_PEER_BUCKET_SIZE = 32;
export const DEFAULT_MAX_RECONNECT_TRIES = 3;

export interface TriedPeerConfig {
	readonly triedPeerListSize?: number;
	readonly triedPeerBucketSize?: number;
	readonly maxReconnectTries?: number;
}

interface TriedPeerInfo {
	readonly peerInfo: P2PDiscoveredPeerInfo;
	// tslint:disable-next-line:readonly-keyword
	numOfConnectionFailures: number;
	readonly dateAdded: Date;
}

export class TriedPeers {
	private readonly _triedPeerMap: Map<number, Map<string, TriedPeerInfo>>;
	private readonly _triedPeerListSize: number;
	private readonly _triedPeerBucketSize: number;
	private readonly _maxReconnectTries: number;

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
		};
	}

	public get triedPeerMap(): Map<number, Map<string, TriedPeerInfo>> {
		return this._triedPeerMap;
	}

	public findPeer(peerInfo: P2PDiscoveredPeerInfo): boolean {
		// tslint:disable-next-line:no-let
		let ifExists = false;

		[...this._triedPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (peersMap.has(peerId)) {
				ifExists = true;

				return;
			}
		});

		return ifExists;
	}

	public updatePeer(peerInfo: P2PDiscoveredPeerInfo): void {
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		[...this._triedPeerMap.entries()].forEach(([bucketId, peerMap]) => {
			[...peerMap.entries()].forEach(([peerId, triedPeerInfo]) => {
				if (incomingPeerId === peerId) {
					const updatedTriedPeerInfo: TriedPeerInfo = {
						peerInfo: { ...triedPeerInfo, ...peerInfo },
						dateAdded: triedPeerInfo.dateAdded,
						numOfConnectionFailures: triedPeerInfo.numOfConnectionFailures,
					};
					// Set the updated peer in the peerMap of the peer bucket
					this._triedPeerMap.set(
						bucketId,
						peerMap.set(peerId, updatedTriedPeerInfo),
					);

					return;
				}
			});
		});
	}

	public removePeer(peerInfo: P2PDiscoveredPeerInfo): void {
		const incomingPeerId = constructPeerIdFromPeerInfo(peerInfo);

		[...this._triedPeerMap.entries()].forEach(([bucketId, peerMap]) => {
			[...peerMap.keys()].forEach(peerId => {
				if (incomingPeerId === peerId) {
					peerMap.delete(peerId);
					this._triedPeerMap.set(bucketId, peerMap);

					return;
				}
			});
		});
	}

	public getPeer(incomingPeerId: string): P2PDiscoveredPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let peer: TriedPeerInfo | undefined;

		[...this._triedPeerMap.values()].forEach(peerMap => {
			[...peerMap.entries()].forEach(([peerId, triedPeerInfo]) => {
				if (peerId === incomingPeerId) {
					peer = triedPeerInfo;
				}
			});
		});

		return peer ? peer.peerInfo : undefined;
	}

	public addPeer(
		peerInfo: P2PDiscoveredPeerInfo,
	): P2PDiscoveredPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let evictedPeer;

		if (!this.findPeer(peerInfo)) {
			const newTriedPeerInfo = {
				peerInfo,
				numOfConnectionFailures: 0,
				dateAdded: new Date(),
			};
			// TODO: Second argument of getBucket function should come from a field in peerInfo of 32 entropy
			const bucketId = getBucket(
				peerInfo.ipAddress,
				peerInfo.secret as number,
				this._triedPeerListSize,
			);
			if (bucketId) {
				const bucketList = this._triedPeerMap.get(bucketId);
				if (bucketList) {
					if (bucketList.size < this._triedPeerBucketSize) {
						bucketList.set(
							constructPeerIdFromPeerInfo(peerInfo),
							newTriedPeerInfo,
						);
						this._triedPeerMap.set(bucketId, bucketList);
					} else {
						evictedPeer = this._evictPeer(bucketId);
						bucketList.set(
							constructPeerIdFromPeerInfo(peerInfo),
							newTriedPeerInfo,
						);
						this._triedPeerMap.set(bucketId, bucketList);
					}
				}
			}
		}

		return evictedPeer ? evictedPeer.peerInfo : undefined;
	}

	public failedConnectionAction(
		incomingPeerInfo: P2PDiscoveredPeerInfo,
	): boolean {
		// tslint:disable-next-line:no-let
		let evictPeer = false;

		[...this._triedPeerMap.values()].map(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(incomingPeerInfo);
			const peer = peersMap.get(peerId);
			if (peer) {
				const { peerInfo, numOfConnectionFailures, dateAdded } = peer;
				if (numOfConnectionFailures + 1 >= this._maxReconnectTries) {
					peersMap.delete(peerId);
					evictPeer = true;

					return peersMap;
				}
				const newTriedPeerInfo = {
					peerInfo,
					numOfConnectionFailures: numOfConnectionFailures + 1,
					dateAdded,
				};

				peersMap.set(peerId, newTriedPeerInfo);
			}

			return peersMap;
		});

		return evictPeer;
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
