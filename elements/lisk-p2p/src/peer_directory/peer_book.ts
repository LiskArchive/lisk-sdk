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
import { constructPeerIdFromPeerInfo } from '../utils';
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
	public constructor(peerBookConfig: PeerBookConfig) {
		this._newPeers = new NewPeers(
			peerBookConfig.newPeerConfig
				? peerBookConfig.newPeerConfig
				: { secret: peerBookConfig.secret },
		);
		this._triedPeers = new TriedPeers(
			peerBookConfig.triedPeerConfig
				? peerBookConfig.triedPeerConfig
				: { secret: peerBookConfig.secret },
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

	// If the peer is completed deleted then return true
	public downgradePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._newPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			if (this._newPeers.failedConnectionAction(peerInfo)) {
				return true;
			}
		}

		if (this._triedPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			this._triedPeers.failedConnectionAction(peerInfo);
		}

		return false;
	}

	public upgradePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			return true;
		}

		if (this._newPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			this._newPeers.removePeer(peerInfo);
			this._triedPeers.addPeer(peerInfo as P2PDiscoveredPeerInfo);

			return true;
		}

		return false;
	}
	// It will return evicted peer in some cases
	public addPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		if (
			this._triedPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo)) ||
			this._newPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))
		) {
			throw new Error('Peer already exists');
		}

		return this._newPeers.addPeer(peerInfo);
	}

	public removePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			return this._triedPeers.removePeer(peerInfo);
		}

		if (this._newPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			return this._newPeers.removePeer(peerInfo);
		}

		return false;
	}

	public getPeer(peerId: string): P2PPeerInfo | undefined {
		if (this._triedPeers.findPeer(peerId)) {
			return this._triedPeers.getPeer(peerId);
		}

		if (this._newPeers.findPeer(peerId)) {
			return this._newPeers.getPeer(peerId);
		}

		return undefined;
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			return this._triedPeers.updatePeer(peerInfo as P2PDiscoveredPeerInfo);
		}

		if (this._newPeers.findPeer(constructPeerIdFromPeerInfo(peerInfo))) {
			return this._newPeers.updatePeer(peerInfo);
		}

		return false;
	}
}
