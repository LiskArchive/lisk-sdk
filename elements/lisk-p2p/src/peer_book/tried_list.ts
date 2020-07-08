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
// eslint-disable-next-line import/no-cycle
import { P2PPeerInfo } from '../types';
// eslint-disable-next-line import/no-cycle
import { PEER_TYPE } from '../utils';
// eslint-disable-next-line import/no-cycle
import { BaseList, PeerListConfig } from './base_list';

export interface TriedListConfig extends PeerListConfig {
	readonly maxReconnectTries?: number;
}

export class TriedList extends BaseList {
	private readonly _maxReconnectTries: number;

	public constructor({
		numOfBuckets,
		bucketSize,
		maxReconnectTries,
		secret,
		peerType,
	}: TriedListConfig) {
		super({
			secret,
			numOfBuckets,
			bucketSize,
			peerType,
		});
		this.type = PEER_TYPE.TRIED_PEER;
		this._maxReconnectTries = maxReconnectTries ?? DEFAULT_MAX_RECONNECT_TRIES;
	}

	public get triedPeerConfig(): TriedListConfig {
		return {
			...this.peerListConfig,
			maxReconnectTries: this._maxReconnectTries,
		};
	}

	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		// Bucket calculation does not require sourceAddress and is deterministic
		const { bucket } = this.calculateBucket(incomingPeerInfo.ipAddress);
		const incomingPeerId = incomingPeerInfo.peerId;
		const foundPeer = bucket.get(incomingPeerId);
		if (!foundPeer) {
			return false;
		}
		const { numOfConnectionFailures } = foundPeer;

		if ((numOfConnectionFailures as number) + 1 >= this._maxReconnectTries) {
			const removedFromBucket = bucket.delete(incomingPeerId);
			const removedFromPeerLookup = this.peerIdToPeerInfo.delete(incomingPeerId);

			return removedFromBucket && removedFromPeerLookup;
		}
		const updatedTriedPeerInfo = {
			...foundPeer,
			numOfConnectionFailures: (numOfConnectionFailures as number) + 1,
		};

		bucket.set(incomingPeerId, updatedTriedPeerInfo);

		return false;
	}
}
