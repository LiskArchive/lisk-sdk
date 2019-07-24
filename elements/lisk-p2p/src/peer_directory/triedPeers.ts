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

const TRIED_PEER_LIST_SIZE = 64;
const TRIED_PEER_BUCKET_SIZE = 32;
const MAX_RECONNECTIONS = 3;

interface TriedPeerInfo {
	readonly peerInfo: P2PDiscoveredPeerInfo;
	// tslint:disable-next-line:readonly-keyword
	numOfConnectionFailures: number;
	readonly dateAdded: Date;
}

export class TriedPeers {
	private readonly _triedPeerMap: Map<number, Map<string, TriedPeerInfo>>;

	public constructor() {
		// Initialize the Map with all the buckets
		this._triedPeerMap = new Map();
		[...Array(TRIED_PEER_LIST_SIZE).keys()]
			.map(x => x + 1)
			.forEach(bucketNumber => {
				this._triedPeerMap.set(bucketNumber, new Map<string, TriedPeerInfo>());
			});
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
		[...this._triedPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (peersMap.has(peerId)) {
				return;
			}
		});
	}

	public removePeer(peerInfo: P2PDiscoveredPeerInfo): void {
		[...this._triedPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			peersMap.delete(peerId);
		});
	}

	public getPeer(
		peerInfo: P2PDiscoveredPeerInfo,
	): P2PDiscoveredPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let peer: TriedPeerInfo | undefined;

		[...this._triedPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			peer = peersMap.get(peerId);

			return;
		});

		return peer ? peer.peerInfo : undefined;
	}

	public addPeer(peerInfo: P2PDiscoveredPeerInfo): boolean {
		// tslint:disable-next-line:no-let
		let success = false;

		if (!this.findPeer(peerInfo)) {
			const newTriedPeerInfo = {
				peerInfo,
				numOfConnectionFailures: 0,
				dateAdded: new Date(),
			};

			const bucketNumber = getBucket(peerInfo.ipAddress, Math.random());
			if (bucketNumber) {
				const bucketList = this._triedPeerMap.get(bucketNumber);
				if (bucketList) {
					if (bucketList.size < TRIED_PEER_BUCKET_SIZE) {
						bucketList.set(
							constructPeerIdFromPeerInfo(peerInfo),
							newTriedPeerInfo,
						);
						this._triedPeerMap.set(bucketNumber, bucketList);
						success = true;
					} else {
						this._evictPeer(bucketNumber);
						bucketList.set(
							constructPeerIdFromPeerInfo(peerInfo),
							newTriedPeerInfo,
						);
						this._triedPeerMap.set(bucketNumber, bucketList);
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

		[...this._triedPeerMap.values()].map(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(incomingPeerInfo);
			const peer = peersMap.get(peerId);
			if (peer) {
				const { peerInfo, numOfConnectionFailures, dateAdded } = peer;
				if (numOfConnectionFailures + 1 >= MAX_RECONNECTIONS) {
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

	private _evictPeer(bucketNumber: number): void {
		const peerList = this._triedPeerMap.get(bucketNumber);

		if (peerList) {
			const randomPeerIndex = Math.floor(
				Math.random() * TRIED_PEER_BUCKET_SIZE,
			);
			const randomPeer = Array.from(peerList.keys())[randomPeerIndex];
			peerList.delete(randomPeer);
			this._triedPeerMap.set(bucketNumber, peerList);
		}
	}
}
