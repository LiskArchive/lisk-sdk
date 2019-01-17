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

import {
	Peer,
	PeerInfo,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	REMOTE_EVENT_RPC_REQUEST,
	REMOTE_EVENT_MESSAGE,
} from './peer';

import { PeerOptions, selectPeers } from './peer_selection';

import { ProtocolMessage, ProtocolRPCRequest } from './p2p_types';

export const REMOTE_RPC_GET_ALL_PEERS_LIST = 'list';

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;
	private readonly _handleRPC: (
		request: ProtocolRPCRequest,
		respond: any,
	) => void;
	private readonly _handleMessage: (message: ProtocolMessage) => void;

	public constructor() {
		super();
		this._peerMap = new Map();

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRPC = (request: ProtocolRPCRequest, respond: any) => {
			// TODO 2: ^ Use different type for request instead of ProtocolRPCRequest
			if (request.procedure === REMOTE_RPC_GET_ALL_PEERS_LIST) {
				this._handleGetAllPeersRequest(request, respond); // TODO 2
			}
			// Emit request for external use.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleMessage = (message: ProtocolMessage) => {
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};
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
		this._bindHandlersToPeer(peer);
		peer.connect();
	}

	public removeAllPeers(): void {
		this._peerMap.forEach((peer: Peer) => {
			this.removePeer(peer.id);
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
		const peer = this._peerMap.get(peerId);
		if (peer) {
			peer.disconnect();
			this._unbindHandlersFromPeer(peer);
		}
		return this._peerMap.delete(peerId);
	}

	private _handleGetAllPeersRequest(message: ProtocolRPCRequest, respond: any) {
		respond(null, this.getAllPeerInfos());
	}

	private _bindHandlersToPeer(peer: Peer): void {
		peer.on(REMOTE_EVENT_RPC_REQUEST, this._handleRPC);
		peer.on(REMOTE_EVENT_MESSAGE, this._handleMessage);
	}

	private _unbindHandlersFromPeer(peer: Peer): void {
		peer.off(REMOTE_EVENT_RPC_REQUEST, this._handleRPC);
		peer.off(REMOTE_EVENT_MESSAGE, this._handleMessage);
	}
}
