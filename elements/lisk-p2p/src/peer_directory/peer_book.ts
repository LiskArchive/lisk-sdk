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
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_TRIED_BUCKET_COUNT,
	DEFAULT_TRIED_BUCKET_SIZE,
} from '../constants';
import { P2PDiscoveredPeerInfo, P2PPeerInfo } from '../p2p_types';
import { PEER_TYPE } from '../utils';
import { NewList, NewListConfig } from './new_list';
import { TriedList, TriedListConfig } from './tried_list';

export interface PeerBookConfig {
	readonly newListConfig?: NewListConfig;
	readonly triedListConfig?: TriedListConfig;
	readonly secret: number;
}

export class PeerBook {
	private readonly _newPeers: NewList;
	private readonly _triedPeers: TriedList;
	public constructor({
		newListConfig: newListConfig,
		triedListConfig: triedListConfig,
		secret,
	}: PeerBookConfig) {
		this._newPeers = new NewList(
			newListConfig
				? newListConfig
				: {
						secret,
						peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
						peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
						peerType: PEER_TYPE.NEW_PEER,
				  },
		);
		this._triedPeers = new TriedList(
			triedListConfig
				? triedListConfig
				: {
						secret,
						peerBucketCount: DEFAULT_TRIED_BUCKET_COUNT,
						peerBucketSize: DEFAULT_TRIED_BUCKET_SIZE,
						peerType: PEER_TYPE.TRIED_PEER,
				  },
		);
	}

	public get newPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._newPeers.peersList();
	}

	public get triedPeers(): ReadonlyArray<P2PDiscoveredPeerInfo> {
		return this._triedPeers.peersList() as ReadonlyArray<P2PDiscoveredPeerInfo>;
	}

	public getAllPeers(): ReadonlyArray<P2PPeerInfo> {
		return [...this.newPeers, ...this.triedPeers];
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const triedPeer = this._triedPeers.getPeer(peerInfo);
		if (this._triedPeers.getPeer(peerInfo)) {
			return triedPeer;
		}

		return this._newPeers.getPeer(peerInfo);
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.getPeer(peerInfo)) {
			return this._triedPeers.updatePeer(peerInfo as P2PDiscoveredPeerInfo);
		}

		if (this._newPeers.getPeer(peerInfo)) {
			return this._newPeers.updatePeer(peerInfo);
		}

		return false;
	}

	// It will return evicted peer in the case a peer is removed from a peer list based on eviction strategy.
	public addPeer(peerInfo: P2PPeerInfo): ReadonlyArray<P2PPeerInfo> {
		if (
			this._triedPeers.getPeer(peerInfo) ||
			this._newPeers.getPeer(peerInfo)
		) {
			throw new Error('Peer already exists');
		}

		return this._newPeers.addPeer(peerInfo).evictedPeers;
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.getPeer(peerInfo)) {
			return this._triedPeers.removePeer(peerInfo);
		}

		if (this._newPeers.getPeer(peerInfo)) {
			return this._newPeers.removePeer(peerInfo);
		}

		return false;
	}

	// Move a peer from newList to triedList on events like on successful connection.
	public upgradePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.getPeer(peerInfo)) {
			return true;
		}

		if (this._newPeers.getPeer(peerInfo)) {
			this._newPeers.removePeer(peerInfo);
			this._triedPeers.addPeer(peerInfo as P2PDiscoveredPeerInfo);

			return true;
		}

		return false;
	}

	/**
	 * Description: When a peer is downgraded for some reasons then new/triedPeers will trigger their failedConnectionAction,
	 * if the peer is deleted from newList that means the peer is completely deleted from the peer lists and need to inform the calling entity by returning true.
	 */
	public downgradePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._newPeers.getPeer(peerInfo)) {
			if (this._newPeers.failedConnectionAction(peerInfo)) {
				return true;
			}
		}

		if (this._triedPeers.getPeer(peerInfo)) {
			const failed = this._triedPeers.failedConnectionAction(peerInfo);
			if (failed) {
				this.addPeer(peerInfo);
			}
		}

		return false;
	}
}
