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
import {
	DEFAULT_MAX_RECONNECT_TRIES,
	DEFAULT_TRIED_PEER_BUCKET_SIZE,
	DEFAULT_TRIED_PEER_LIST_SIZE,
} from '../constants';

import { P2PPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo } from '../utils';
import { BasePeerList, CustomPeerInfo, PeerListConfig } from './basePeerList';

export interface TriedPeerConfig extends PeerListConfig {
	readonly maxReconnectTries?: number;
}

interface TriedPeerInfo extends CustomPeerInfo {
	// tslint:disable-next-line:readonly-keyword
	numOfConnectionFailures: number;
}

type TriedPeerMap = Map<number, Map<string, TriedPeerInfo>>;

export class TriedPeers extends BasePeerList {
	private readonly _maxReconnectTries: number;

	public constructor({
		peerBucketCount,
		maxReconnectTries,
		secret,
		peerBucketSize,
		peerType,
	}: TriedPeerConfig) {
		super({
			secret,
			peerBucketCount,
			peerBucketSize,
			peerType,
		});

		this._maxReconnectTries = maxReconnectTries
			? maxReconnectTries
			: DEFAULT_MAX_RECONNECT_TRIES;

		this.initializePeerList(this.peerMap as TriedPeerMap);
	}

	public initializePeerList(
		peerMap: Map<number, Map<string, TriedPeerInfo>>,
	): void {
		// Initialize the Map with all the buckets
		for (const bucketId of [
			...new Array(this.peerListConfig.peerBucketCount).keys(),
		]) {
			peerMap.set(bucketId, new Map<string, TriedPeerInfo>());
		}
	}

	public get triedPeerConfig(): TriedPeerConfig {
		return {
			...this.peerListConfig,
			maxReconnectTries: this._maxReconnectTries,
		};
	}

	// Extend to add custom TriedPeerInfo
	public initPeerInfo = (peerInfo: P2PPeerInfo): TriedPeerInfo => ({
		peerInfo,
		numOfConnectionFailures: 0,
		dateAdded: new Date(),
	});

	// Should return true if the peer is evicted due to failed connection
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const bucketId = this.getBucketId(incomingPeerInfo.ipAddress);
		const bucket = this.peerMap.get(bucketId);
		const incomingPeerId = constructPeerIdFromPeerInfo(incomingPeerInfo);

		if (!bucket) {
			return false;
		}
		const foundPeer = bucket.get(incomingPeerId);

		if (!foundPeer) {
			return false;
		}
		const {
			peerInfo,
			numOfConnectionFailures,
			dateAdded,
		} = foundPeer as TriedPeerInfo;

		if (numOfConnectionFailures + 1 >= this._maxReconnectTries) {
			bucket.delete(incomingPeerId);
			this.peerMap.set(bucketId, bucket);

			return true;
		}
		const newTriedPeerInfo = {
			peerInfo,
			numOfConnectionFailures: numOfConnectionFailures + 1,
			dateAdded,
		};

		bucket.set(incomingPeerId, newTriedPeerInfo);
		this.peerMap.set(bucketId, bucket);

		return false;
	}
}
