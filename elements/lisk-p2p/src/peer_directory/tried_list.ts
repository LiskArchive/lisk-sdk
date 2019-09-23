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
import { DEFAULT_MAX_RECONNECT_TRIES } from '../constants';

import { P2PPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo } from '../utils';
import { CustomPeerInfo, PeerList, PeerListConfig } from './peer_list';

export interface TriedListConfig extends PeerListConfig {
	readonly maxReconnectTries?: number;
}

interface TriedListInfo extends CustomPeerInfo {
	// tslint:disable-next-line:readonly-keyword
	numOfConnectionFailures: number;
}

type TriedListMap = Map<number, Map<string, TriedListInfo>>;

export class TriedList extends PeerList {
	private readonly _maxReconnectTries: number;

	public constructor({
		peerBucketCount,
		maxReconnectTries,
		secret,
		peerBucketSize,
		peerType,
	}: TriedListConfig) {
		super({
			secret,
			peerBucketCount,
			peerBucketSize,
			peerType,
		});

		this._maxReconnectTries = maxReconnectTries
			? maxReconnectTries
			: DEFAULT_MAX_RECONNECT_TRIES;

		this.initializePeerList(this.peerMap as TriedListMap);
	}

	public initializePeerList(
		peerMap: Map<number, Map<string, TriedListInfo>>,
	): void {
		// Initialize the Map with all the buckets
		for (const bucketId of [
			...new Array(this.peerListConfig.peerBucketCount).keys(),
		]) {
			peerMap.set(bucketId, new Map<string, TriedListInfo>());
		}
	}

	public get triedPeerConfig(): TriedListConfig {
		return {
			...this.peerListConfig,
			maxReconnectTries: this._maxReconnectTries,
		};
	}

	// Extend to add custom TriedPeerInfo
	public initPeerInfo = (peerInfo: P2PPeerInfo): TriedListInfo => ({
		peerInfo,
		numOfConnectionFailures: 0,
		dateAdded: new Date(),
	});

	// Should return true if the peer is evicted due to failed connection
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const bucketId = this.selectBucketId(incomingPeerInfo.ipAddress);
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
		} = foundPeer as TriedListInfo;

		if (numOfConnectionFailures + 1 >= this._maxReconnectTries) {
			bucket.delete(incomingPeerId);

			return true;
		}
		const updatedTriedPeerInfo = {
			peerInfo,
			numOfConnectionFailures: numOfConnectionFailures + 1,
			dateAdded,
		};

		bucket.set(incomingPeerId, updatedTriedPeerInfo);

		return false;
	}
}
