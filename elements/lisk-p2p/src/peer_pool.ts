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
import { SCClientSocket } from 'socketcluster-client';
import { SCServerSocket } from 'socketcluster-server';
import { RequestFailError } from './errors';
import { P2PRequest } from './p2p_request';
import {
	P2PClosePacket,
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PPeerSelectionForConnection,
	P2PPeerSelectionForRequest,
	P2PPeerSelectionForSend,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';
import {
	connectAndFetchPeerInfo,
	ConnectionState,
	constructPeerIdFromPeerInfo,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REQUEST_RECEIVED,
	EVENT_UPDATED_PEER_INFO,
	Peer,
	PeerConfig,
} from './peer';
import { discoverPeers } from './peer_discovery';

export const EVENT_FAILED_TO_PUSH_NODE_INFO = 'failedToPushNodeInfo';
export const EVENT_DISCOVERED_PEER = 'discoveredPeer';
export const EVENT_FAILED_TO_FETCH_PEER_INFO = 'failedToFetchPeerInfo';

export {
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_PEER_INFO_UPDATE,
};

interface PeerPoolConfig {
	readonly connectTimeout?: number;
	readonly ackTimeout?: number;
	readonly peerSelectionForSend: P2PPeerSelectionForSend;
	readonly peerSelectionForRequest: P2PPeerSelectionForRequest;
	readonly peerSelectionForConnection: P2PPeerSelectionForConnection;
}

export const MAX_PEER_LIST_BATCH_SIZE = 100;
export const MAX_PEER_DISCOVERY_PROBE_SAMPLE_SIZE = 100;

const selectRandomPeerSample = (
	peerList: ReadonlyArray<Peer>,
	count: number,
): ReadonlyArray<Peer> => shuffle(peerList).slice(0, count);

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;
	private readonly _peerPoolConfig: PeerPoolConfig;
	private readonly _handlePeerRPC: (request: P2PRequest) => void;
	private readonly _handlePeerMessage: (message: P2PMessagePacket) => void;
	private readonly _handlePeerConnect: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handlePeerConnectAbort: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handlePeerClose: (closePacket: P2PClosePacket) => void;
	private readonly _handlePeerOutboundSocketError: (error: Error) => void;
	private readonly _handlePeerInboundSocketError: (error: Error) => void;
	private readonly _handlePeerInfoUpdate: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private _nodeInfo: P2PNodeInfo | undefined;
	private readonly _peerSelectForSend: P2PPeerSelectionForSend;
	private readonly _peerSelectForRequest: P2PPeerSelectionForRequest;
	private readonly _peerSelectForConnection: P2PPeerSelectionForConnection;

	public constructor(peerPoolConfig: PeerPoolConfig) {
		super();
		this._peerMap = new Map();
		this._peerPoolConfig = peerPoolConfig;
		this._peerSelectForSend = peerPoolConfig.peerSelectionForSend;
		this._peerSelectForRequest = peerPoolConfig.peerSelectionForRequest;
		this._peerSelectForConnection = peerPoolConfig.peerSelectionForConnection;
		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerRPC = (request: P2PRequest) => {
			// Re-emit the request to allow it to bubble up the class hierarchy.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerMessage = (message: P2PMessagePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};
		this._handlePeerConnect = async (peerInfo: P2PDiscoveredPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const peer = this.getPeer(peerId);

			if (!peer) {
				this.emit(
					EVENT_FAILED_TO_FETCH_PEER_INFO,
					new RequestFailError(
						'Failed to fetch peer status because the relevant peer could not be found',
					),
				);

				return;
			}

			// tslint:disable-next-line no-let
			let detailedPeerInfo;
			try {
				detailedPeerInfo = await peer.fetchStatus();
			} catch (error) {
				this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);

				return;
			}
			this.emit(EVENT_DISCOVERED_PEER, detailedPeerInfo);
		};
		this._handlePeerConnectAbort = (peerInfo: P2PDiscoveredPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};
		this._handlePeerClose = (closePacket: P2PClosePacket) => {
			// If we disconnect from a peer outbound, we should remove them to conserve our resources (especially in case of a malicious peer).
			// A peer which was removed may added back later during the next round of discovery.
			const peerId = constructPeerIdFromPeerInfo(closePacket.peerInfo);
			this.removePeer(peerId);
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};
		this._handlePeerOutboundSocketError = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
		};
		this._handlePeerInboundSocketError = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};
		this._handlePeerInfoUpdate = (peerInfo: P2PDiscoveredPeerInfo) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_UPDATED_PEER_INFO, peerInfo);
		};
		this._handleFailedPeerInfoUpdate = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
		};
	}

	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		const peerList = this.getAllPeers();
		peerList.forEach(peer => {
			this._applyNodeInfoOnPeer(peer, nodeInfo);
		});
	}

	public get nodeInfo(): P2PNodeInfo | undefined {
		return this._nodeInfo;
	}

	public selectPeersForRequest(
		requestPacket?: P2PRequestPacket,
		numOfPeers?: number,
	): ReadonlyArray<P2PDiscoveredPeerInfo> {
		const listOfPeerInfo = [...this._peerMap.values()].map(
			(peer: Peer) => peer.peerInfo,
		);
		const selectedPeers = this._peerSelectForRequest(
			listOfPeerInfo,
			this._nodeInfo,
			numOfPeers,
			requestPacket,
		);

		return selectedPeers;
	}

	public selectPeersForSend(
		messagePacket?: P2PMessagePacket,
		numOfPeers?: number,
	): ReadonlyArray<P2PDiscoveredPeerInfo> {
		const listOfPeerInfo = [...this._peerMap.values()].map(
			(peer: Peer) => peer.peerInfo,
		);
		const selectedPeers = this._peerSelectForSend(
			listOfPeerInfo,
			this._nodeInfo,
			numOfPeers,
			messagePacket,
		);

		return selectedPeers;
	}

	public async requestFromPeer(
		packet: P2PRequestPacket,
	): Promise<P2PResponsePacket> {
		const selectedPeer = this.selectPeersForRequest(packet, 1);

		if (selectedPeer.length <= 0) {
			throw new RequestFailError(
				'Request failed due to no peers found in peer selection',
			);
		}

		const selectedPeerId = constructPeerIdFromPeerInfo(selectedPeer[0]);
		const peer = this._peerMap.get(selectedPeerId);

		if (!peer) {
			throw new RequestFailError(
				`No such Peer exist in PeerPool with the selected peer with Id: ${selectedPeerId}`,
			);
		}

		const response: P2PResponsePacket = await peer.request(packet);

		return response;
	}

	public sendToPeers(message: P2PMessagePacket): void {
		const selectedPeers = this.selectPeersForSend(message);

		selectedPeers.forEach((peerInfo: P2PDiscoveredPeerInfo) => {
			const selectedPeerId = constructPeerIdFromPeerInfo(peerInfo);
			const peer = this._peerMap.get(selectedPeerId);

			if (peer) {
				peer.send(message);
			}
		});
	}

	public async fetchStatusAndCreatePeers(
		seedPeers: ReadonlyArray<P2PPeerInfo>,
		nodeInfo: P2PNodeInfo,
		peerConfig: PeerConfig,
	): Promise<ReadonlyArray<P2PDiscoveredPeerInfo>> {
		const listOfPeerInfos = await Promise.all(
			seedPeers.map(async seedPeer => {
				try {
					const seedFetchStatusResponse = await connectAndFetchPeerInfo(
						seedPeer,
						nodeInfo,
						peerConfig,
					);
					const peerId = constructPeerIdFromPeerInfo(
						seedFetchStatusResponse.peerInfo,
					);

					this.addOutboundPeer(
						peerId,
						seedFetchStatusResponse.peerInfo,
						seedFetchStatusResponse.socket,
					);

					return seedFetchStatusResponse.peerInfo;
				} catch (error) {
					this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);

					return undefined;
				}
			}),
		);
		const filteredListOfPeers = listOfPeerInfos.filter(
			peerInfo => peerInfo !== undefined,
		) as ReadonlyArray<P2PDiscoveredPeerInfo>;

		return filteredListOfPeers;
	}

	public async runDiscovery(
		knownPeers: ReadonlyArray<P2PDiscoveredPeerInfo>,
		blacklist: ReadonlyArray<P2PPeerInfo>,
	): Promise<ReadonlyArray<P2PDiscoveredPeerInfo>> {
		const peersForDiscovery = knownPeers.map(peerInfo => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const existingPeer = this.getPeer(peerId);
			if (existingPeer) {
				existingPeer.updatePeerInfo(peerInfo);

				return existingPeer;
			}

			return this.addPeer(peerInfo);
		});

		const peerSampleToProbe = selectRandomPeerSample(
			peersForDiscovery,
			MAX_PEER_DISCOVERY_PROBE_SAMPLE_SIZE,
		);

		const discoveredPeers = await discoverPeers(peerSampleToProbe, {
			blacklist: blacklist.map(peer => peer.ipAddress),
		});

		// Check for received discovery info and then find it in peer pool and then update it
		discoveredPeers.forEach((peerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const existingPeer = this.getPeer(peerId);

			if (existingPeer) {
				existingPeer.updatePeerInfo(peerInfo);
			}
		});

		return discoveredPeers;
	}

	public selectPeersAndConnect(
		peers: ReadonlyArray<P2PDiscoveredPeerInfo>,
	): ReadonlyArray<P2PDiscoveredPeerInfo> {
		const peersToConnect = this._peerSelectForConnection(peers);

		peersToConnect.forEach((peerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const existingPeer = this.getPeer(peerId);
			if (!existingPeer) {
				return this.addPeer(peerInfo);
			}

			existingPeer.updatePeerInfo(peerInfo);

			return existingPeer;
		});

		return peersToConnect;
	}

	public addPeer(
		peerInfo: P2PDiscoveredPeerInfo,
		inboundSocket?: SCServerSocket,
	): Peer {
		const peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
		};
		const peer = new Peer(peerInfo, peerConfig, { inbound: inboundSocket });

		// Throw an error because adding a peer multiple times is a common developer error which is very difficult to identify and debug.
		if (this._peerMap.has(peer.id)) {
			throw new Error(`Peer ${peer.id} was already in the peer pool`);
		}
		this._peerMap.set(peer.id, peer);
		this._bindHandlersToPeer(peer);
		if (this._nodeInfo) {
			this._applyNodeInfoOnPeer(peer, this._nodeInfo);
		}
		peer.connect();

		return peer;
	}

	public addDiscoveredPeer(
		detailedPeerInfo: P2PDiscoveredPeerInfo,
		inboundSocket?: SCServerSocket,
	): Peer {
		const peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
		};
		const peer = new Peer(detailedPeerInfo, peerConfig, {
			inbound: inboundSocket,
		});
		this._peerMap.set(peer.id, peer);
		this._bindHandlersToPeer(peer);
		if (this._nodeInfo) {
			this._applyNodeInfoOnPeer(peer, this._nodeInfo);
		}
		peer.updatePeerInfo(detailedPeerInfo);
		peer.connect();

		return peer;
	}

	public addInboundPeer(
		peerId: string,
		peerInfo: P2PDiscoveredPeerInfo,
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

		this.addPeer(peerInfo, socket);

		return true;
	}

	public addOutboundPeer(
		peerId: string,
		peerInfo: P2PDiscoveredPeerInfo,
		socket: SCClientSocket,
	): boolean {
		const existingPeer = this.getPeer(peerId);

		if (existingPeer) {
			// Update the peerInfo from the latest inbound socket.
			existingPeer.updatePeerInfo(peerInfo);
			if (existingPeer.state.outbound === ConnectionState.DISCONNECTED) {
				existingPeer.outboundSocket = socket;

				return false;
			}

			return false;
		}

		const peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
		};
		const peer = new Peer(peerInfo, peerConfig, { outbound: socket });

		this._peerMap.set(peer.id, peer);
		this._bindHandlersToPeer(peer);
		if (this._nodeInfo) {
			this._applyNodeInfoOnPeer(peer, this._nodeInfo);
		}

		return true;
	}

	public removeAllPeers(): void {
		this._peerMap.forEach((peer: Peer) => {
			this.removePeer(peer.id);
		});
	}

	public getAllPeerInfos(): ReadonlyArray<P2PDiscoveredPeerInfo> {
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

	private _applyNodeInfoOnPeer(peer: Peer, nodeInfo: P2PNodeInfo): void {
		// tslint:disable-next-line no-floating-promises
		(async () => {
			try {
				await peer.applyNodeInfo(nodeInfo);
			} catch (error) {
				this.emit(EVENT_FAILED_TO_PUSH_NODE_INFO, error);
			}
		})();
	}

	private _bindHandlersToPeer(peer: Peer): void {
		peer.on(EVENT_REQUEST_RECEIVED, this._handlePeerRPC);
		peer.on(EVENT_MESSAGE_RECEIVED, this._handlePeerMessage);
		peer.on(EVENT_CONNECT_OUTBOUND, this._handlePeerConnect);
		peer.on(EVENT_CONNECT_ABORT_OUTBOUND, this._handlePeerConnectAbort);
		peer.on(EVENT_CLOSE_OUTBOUND, this._handlePeerClose);
		peer.on(EVENT_OUTBOUND_SOCKET_ERROR, this._handlePeerOutboundSocketError);
		peer.on(EVENT_INBOUND_SOCKET_ERROR, this._handlePeerInboundSocketError);
		peer.on(EVENT_UPDATED_PEER_INFO, this._handlePeerInfoUpdate);
		peer.on(EVENT_FAILED_PEER_INFO_UPDATE, this._handleFailedPeerInfoUpdate);
	}

	private _unbindHandlersFromPeer(peer: Peer): void {
		peer.removeListener(EVENT_REQUEST_RECEIVED, this._handlePeerRPC);
		peer.removeListener(EVENT_MESSAGE_RECEIVED, this._handlePeerMessage);
		peer.removeListener(EVENT_CONNECT_OUTBOUND, this._handlePeerConnect);
		peer.removeListener(
			EVENT_CONNECT_ABORT_OUTBOUND,
			this._handlePeerConnectAbort,
		);
		peer.removeListener(EVENT_CLOSE_OUTBOUND, this._handlePeerClose);
		peer.removeListener(EVENT_UPDATED_PEER_INFO, this._handlePeerInfoUpdate);
		peer.removeListener(
			EVENT_FAILED_PEER_INFO_UPDATE,
			this._handleFailedPeerInfoUpdate,
		);
	}
}
