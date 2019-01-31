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
// tslint:disable-next-line no-require-imports
import shuffle = require('lodash.shuffle');
import { SCServerSocket } from 'socketcluster-server';
import { P2PRequest } from './p2p_request';
import {
	DiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	ProtocolPeerInfoList,
} from './p2p_types';
import {
	ConnectionState,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_MESSAGE_RECEIVED,
	EVENT_REQUEST_RECEIVED,
	Peer,
	REMOTE_RPC_GET_ALL_PEERS_LIST,
} from './peer';
import { discoverPeers } from './peer_discovery';
import {
	PeerOptions,
	selectForConnection,
	selectPeers,
} from './peer_selection';

export {
	EVENT_CONNECT_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
};

export const MAX_PEER_LIST_BATCH_SIZE = 100;

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;
	private readonly _handlePeerRPC: (request: P2PRequest) => void;
	private readonly _handlePeerMessage: (message: P2PMessagePacket) => void;
	private readonly _handlePeerConnect: (peerInfo: P2PPeerInfo) => void;
	private readonly _handlePeerConnectAbort: (peerInfo: P2PPeerInfo) => void;
	private _nodeInfo: P2PNodeInfo | undefined;

	public constructor() {
		super();
		this._peerMap = new Map();

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerRPC = (request: P2PRequest) => {
			if (request.procedure === REMOTE_RPC_GET_ALL_PEERS_LIST) {
				// The PeerPool has the necessary information to handle this request on its own.
				// This request doesn't need to propagate to its parent class.
				this._handleGetAllPeersRequest(request);
			}

			// Re-emit the request to allow it to bubble up the class hierarchy.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerMessage = (message: P2PMessagePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};
		this._handlePeerConnect = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
		};
		this._handlePeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};
	}

	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		const peerList = this.getAllPeers();
		peerList.forEach(peer => {
			peer.applyNodeInfo(nodeInfo);
		});
	}

	public get nodeInfo(): P2PNodeInfo | undefined {
		return this._nodeInfo;
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

	public async runDiscovery(
		peers: ReadonlyArray<P2PPeerInfo>,
		blacklist: ReadonlyArray<P2PPeerInfo>,
	): Promise<ReadonlyArray<P2PPeerInfo>> {
		const peersObjectList = peers.map((peerInfo: P2PPeerInfo) =>
			this.addPeer(peerInfo),
		);

		const disoveredPeers = await discoverPeers(peersObjectList, {
			blacklist: blacklist.map(peer => peer.ipAddress),
		});

		return disoveredPeers;
	}

	public selectPeersAndConnect(
		peers: ReadonlyArray<P2PPeerInfo>,
	): ReadonlyArray<P2PPeerInfo> {
		const peersToConnect = selectForConnection(peers);

		peersToConnect.forEach((peerInfo: P2PPeerInfo) => {
			this.addPeer(peerInfo);
		});

		return peersToConnect;
	}

	public addPeer(peerInfo: P2PPeerInfo, inboundSocket?: SCServerSocket): Peer {
		const peer = new Peer(peerInfo, inboundSocket);
		this._peerMap.set(peer.id, peer);
		this._bindHandlersToPeer(peer);
		if (this._nodeInfo) {
			peer.applyNodeInfo(this._nodeInfo);
		}
		peer.connect();

		return peer;
	}

	public addInboundPeer(
		peerId: string,
		peerInfo: DiscoveredPeerInfo,
		socket: SCServerSocket,
	): boolean {
		const existingPeer = this.getPeer(peerId);

		if (existingPeer) {
			// Update the peerInfo from the latest inbound socket.
			existingPeer.updatePeerInfo(peerInfo);
			if (existingPeer.state.inbound === ConnectionState.DISCONNECTED) {
				existingPeer.inboundSocket = socket;

				return false;
			}

			return false;
		}

		this.addPeer(
			{
				ipAddress: peerInfo.ipAddress,
				wsPort: peerInfo.wsPort,
				height: peerInfo.height,
			},
			socket,
		);

		return true;
	}

	public removeAllPeers(): void {
		this._peerMap.forEach((peer: Peer) => {
			this.removePeer(peer.id);
		});
	}

	public getAllPeerInfos(): ReadonlyArray<P2PPeerInfo> {
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

	private _pickRandomPeers(count: number): ReadonlyArray<Peer> {
		const discoveredPeerList: ReadonlyArray<Peer> = [
			...this._peerMap.values(),
		].filter(peer => peer.peerInfo.isDiscoveredPeer);

		return shuffle(discoveredPeerList).slice(0, count);
	}

	private _handleGetAllPeersRequest(request: P2PRequest): void {
		// TODO later: Remove fields that are specific to the current Lisk protocol.
		const protocolPeerInfoList: ProtocolPeerInfoList = {
			success: true,
			// TODO ASAP: We need a new type to account for complete P2PPeerInfo which has all possible fields (e.g. P2PDiscoveredPeerInfo) that way we don't need to have all these checks below.
			peers: this._pickRandomPeers(MAX_PEER_LIST_BATCH_SIZE).map(
				(peer: Peer) => {
					const peerDetailedInfo = peer.detailedPeerInfo;
					const peerInfo = peer.peerInfo;

					if (peerDetailedInfo) {
						return {
							broadhash: peerDetailedInfo.options
								? (peerDetailedInfo.options.broadhash as string)
								: '',
							height: peerDetailedInfo.height,
							ip: peerDetailedInfo.ipAddress,
							nonce: peerDetailedInfo.options
								? (peerDetailedInfo.options.nonce as string)
								: '',
							os: peerDetailedInfo.os ? peerDetailedInfo.os : '',
							version: peerDetailedInfo.version ? peerDetailedInfo.version : '',
							wsPort: String(peerInfo.wsPort),
						};
					}

					return {
						broadhash: '',
						height: peerInfo.height,
						ip: peerInfo.ipAddress,
						nonce: '',
						os: '',
						version: '',
						wsPort: String(peerInfo.wsPort),
					};
				},
			),
		};

		request.end(protocolPeerInfoList);
	}

	private _bindHandlersToPeer(peer: Peer): void {
		peer.on(EVENT_REQUEST_RECEIVED, this._handlePeerRPC);
		peer.on(EVENT_MESSAGE_RECEIVED, this._handlePeerMessage);
		peer.on(EVENT_CONNECT_OUTBOUND, this._handlePeerConnect);
		peer.on(EVENT_CONNECT_ABORT_OUTBOUND, this._handlePeerConnectAbort);
	}

	private _unbindHandlersFromPeer(peer: Peer): void {
		peer.removeListener(EVENT_REQUEST_RECEIVED, this._handlePeerRPC);
		peer.removeListener(EVENT_MESSAGE_RECEIVED, this._handlePeerMessage);
		peer.removeListener(EVENT_CONNECT_OUTBOUND, this._handlePeerConnect);
		peer.removeListener(
			EVENT_CONNECT_ABORT_OUTBOUND,
			this._handlePeerConnectAbort,
		);
	}
}
