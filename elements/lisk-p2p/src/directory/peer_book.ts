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

import { P2PDiscoveredPeerInfo, P2PPeerInfo } from '../p2p_types';
import { NewPeerConfig, NewPeers } from './new_peers';
import { TriedPeerConfig, TriedPeers } from './tried_peers';

export interface PeerBookConfig {
	readonly newPeerConfig?: NewPeerConfig;
	readonly triedPeerConfig?: TriedPeerConfig;
	readonly secret: number;
}

export class PeerBook {
	private readonly _bannedPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;
	private readonly _newPeers: NewPeers;
	private readonly _triedPeers: TriedPeers;
	public constructor({
		newPeerConfig,
		triedPeerConfig,
		secret,
	}: PeerBookConfig) {
		this._newPeers = new NewPeers(newPeerConfig ? newPeerConfig : { secret });
		this._triedPeers = new TriedPeers(
			triedPeerConfig ? triedPeerConfig : { secret },
		);
		this._bannedPeers = [];
	}

	public get newPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._newPeers.getNewPeersList();
	}

	public get triedPeers(): ReadonlyArray<P2PDiscoveredPeerInfo> {
		return this._triedPeers.getTriedPeersList();
	}

	public get bannedPeers(): ReadonlyArray<P2PDiscoveredPeerInfo> {
		return this._bannedPeers;
	}

	public getAllPeers(): ReadonlyArray<P2PPeerInfo> {
		return [...this.newPeers, ...this.triedPeers];
	}

	// If the peer is completely deleted from both the peer lists then return true
	public downgradePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._newPeers.findPeer(peerInfo)) {
			if (this._newPeers.failedConnectionAction(peerInfo)) {
				return true;
			}
		}

		if (this._triedPeers.findPeer(peerInfo)) {
			const failed = this._triedPeers.failedConnectionAction(peerInfo);
			if (failed) {
				this.addPeer(peerInfo);
			}
		}

		return false;
	}

	public upgradePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.findPeer(peerInfo)) {
			return true;
		}

		if (this._newPeers.findPeer(peerInfo)) {
			this._newPeers.removePeer(peerInfo);
			this._triedPeers.addPeer(peerInfo as P2PDiscoveredPeerInfo);

			return true;
		}

		return false;
	}
	// It will return evicted peer in some cases we can use success or evicted flags for logging purposes
	public addPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		if (
			this._triedPeers.findPeer(peerInfo) ||
			this._newPeers.findPeer(peerInfo)
		) {
			throw new Error('Peer already exists');
		}

		return this._newPeers.addPeer(peerInfo).evictedPeer;
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.findPeer(peerInfo)) {
			return this._triedPeers.removePeer(peerInfo);
		}

		if (this._newPeers.findPeer(peerInfo)) {
			return this._newPeers.removePeer(peerInfo);
		}

		return false;
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const triedPeer = this._triedPeers.getPeer(peerInfo);
		if (this._triedPeers.getPeer(peerInfo)) {
			return triedPeer;
		}

		return this._newPeers.getPeer(peerInfo);
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.findPeer(peerInfo)) {
			return this._triedPeers.updatePeer(peerInfo as P2PDiscoveredPeerInfo);
		}

		if (this._newPeers.findPeer(peerInfo)) {
			return this._newPeers.updatePeer(peerInfo);
		}

		return false;
	}
}
