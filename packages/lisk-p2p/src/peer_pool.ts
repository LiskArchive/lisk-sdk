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

/**
 * The purpose of the PeerPool is to provide a simple interface for selecting,
 * interacting with and handling aggregated events from a collection of peers.
 */

import { EventEmitter } from 'events';
import { Peer } from './peer';
import { PeerOptions, selectPeers } from './peer_selection';

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;

	public constructor() {
		super();
		this._peerMap = new Map();
	}

	public selectPeers(
		selectionParams: PeerOptions,
		numOfPeers?: number,
	): ReadonlyArray<Peer> {
		const selectedPeers = selectPeers(
			[...this._peerMap.values()],
			selectionParams,
			numOfPeers,
		);

		return selectedPeers;
	}

	public addPeer(peer: Peer): void {
		this._peerMap.set(peer.id, peer);
	}

	public disconnectAllPeers(): void {
		this._peerMap.forEach((peer: Peer) => {
			peer.disconnect();
		});
	}

	public getAllPeerInfos(): ReadonlyArray<PeerInfo> {
		return this.getAllPeers().map(peer => peer.peerInfo);
	}

	public getAllPeers(): ReadonlyArray<Peer> {
		return [...this._peerMap.values()];
	}

	public getPeer(peerId: string): Peer | undefined {
		return this._peerMap.get(peerId);
	}

	public hasPeer(peerId: string): boolean {
		return this._peerMap.has(peerId);
	}

	public removePeer(peerId: string): boolean {
		return this._peerMap.delete(peerId);
	}
}
