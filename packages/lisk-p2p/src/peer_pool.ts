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
import { RequestFailError } from './errors';
import { P2PRequest } from './p2p_request';
import {
	P2PClosePacket,
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	P2PResponsePacket,
	ProtocolPeerInfo,
	ProtocolPeerInfoList,
} from './p2p_types';
import {
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
	REMOTE_RPC_GET_ALL_PEERS_LIST,
} from './peer';
import { discoverPeers } from './peer_discovery';
import {
	PeerOptions,
	selectForConnection,
	selectPeers,
} from './peer_selection';

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
}

export const MAX_PEER_LIST_BATCH_SIZE = 100;
export const MAX_PEER_DISCOVERY_PROBE_SAMPLE_SIZE = 100;

const selectRandomPeerSample = (peerList:ReadonlyArray<Peer>, count: number): ReadonlyArray<Peer> => shuffle(peerList).slice(0, count);

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;
	private readonly _peerPoolConfig: PeerPoolConfig;
	private readonly _handlePeerRPC: (request: P2PRequest) => void;
	private readonly _handlePeerMessage: (message: P2PMessagePacket) => void;
	private readonly _handlePeerConnect: (peerInfo: P2PPeerInfo) => void;
	private readonly _handlePeerConnectAbort: (peerInfo: P2PPeerInfo) => void;
	private readonly _handlePeerClose: (closePacket: P2PClosePacket) => void;
	private readonly _handlePeerOutboundSocketError: (error: Error) => void;
	private readonly _handlePeerInboundSocketError: (error: Error) => void;
	private readonly _handlePeerInfoUpdate: (peerInfo: P2PDiscoveredPeerInfo) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private _nodeInfo: P2PNodeInfo | undefined;

	public constructor(peerPoolConfig: PeerPoolConfig) {
		super();
		this._peerMap = new Map();
		this._peerPoolConfig = peerPoolConfig;

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
		this._handlePeerConnect = async (peerInfo: P2PPeerInfo) => {
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
		this._handlePeerConnectAbort = (peerInfo: P2PPeerInfo) => {
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

	public selectPeers(
		selectionParams: PeerOptions,
		numOfPeers?: number,
	): ReadonlyArray<P2PPeerInfo> {
		const listOfPeerInfo = [...this._peerMap.values()].map(
			(peer: Peer) => peer.peerInfo,
		);
		const selectedPeers = selectPeers(
			listOfPeerInfo,
			selectionParams,
			numOfPeers,
		);

		return selectedPeers;
	}

	public async requestFromPeer(
		packet: P2PRequestPacket,
	): Promise<P2PResponsePacket> {
		const peerSelectionParams: PeerOptions = {
			lastBlockHeight: this._nodeInfo ? this._nodeInfo.height : 0,
		};
		const selectedPeer = this.selectPeers(peerSelectionParams, 1);

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
		const peerSelectionParams: PeerOptions = {
			lastBlockHeight: this._nodeInfo ? this._nodeInfo.height : 0,
		};
		const selectedPeers = this.selectPeers(peerSelectionParams);

		selectedPeers.forEach((peerInfo: P2PPeerInfo) => {
			const selectedPeerId = constructPeerIdFromPeerInfo(peerInfo);
			const peer = this._peerMap.get(selectedPeerId);

			if (peer) {
				peer.send(message);
			}
		});
	}

	public async runDiscovery(
		knownPeers: ReadonlyArray<P2PPeerInfo>,
		blacklist: ReadonlyArray<P2PPeerInfo>,
	): Promise<ReadonlyArray<P2PDiscoveredPeerInfo>> {
		
		const peersObjectList = knownPeers.map((peerInfo: P2PPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (this.hasPeer(peerId)) {
				const existingPeer = this.getPeer(peerId) as Peer;
				if (peerInfo.isDiscoveredPeer) {
					existingPeer.updatePeerInfo(peerInfo as P2PDiscoveredPeerInfo);
				}

				return existingPeer;
			}

			return this.addPeer(peerInfo);
		});

		const peerSampleToProbe = selectRandomPeerSample(
			peersObjectList,
			MAX_PEER_DISCOVERY_PROBE_SAMPLE_SIZE,
		);

		const disoveredPeers = await discoverPeers(peerSampleToProbe, {
			blacklist: blacklist.map(peer => peer.ipAddress),
		});
		
		return disoveredPeers;
	}

	public selectPeersAndConnect(
		peers: ReadonlyArray<P2PPeerInfo>,
	): ReadonlyArray<P2PPeerInfo> {
		const peersToConnect = selectForConnection(peers);

		peersToConnect.forEach((peerInfo: P2PPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if(!this.hasPeer(peerId)) {
				this.addPeer(peerInfo);
			}
		});

		return peersToConnect;
	}

	public addPeer(peerInfo: P2PPeerInfo, inboundSocket?: SCServerSocket): Peer {
		const peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
		};
		const peer = new Peer(peerInfo, peerConfig, inboundSocket);

		// Throw an error because adding a peer multiple times is a common developer error which is very difficult to itentify and debug.
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
		const peer = new Peer(detailedPeerInfo, peerConfig, inboundSocket);
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

	private _pickRandomDiscoveredPeers(count: number): ReadonlyArray<Peer> {
		const discoveredPeerList: ReadonlyArray<Peer> = [
			...this._peerMap.values(),
		].filter(peer => peer.peerInfo.isDiscoveredPeer);

		return selectRandomPeerSample(discoveredPeerList, count);
	}

	private _handleGetAllPeersRequest(request: P2PRequest): void {
		// TODO later: Remove fields that are specific to the current Lisk protocol.
		const protocolPeerInfoList: ProtocolPeerInfoList = {
			success: true,
			peers: this._pickRandomDiscoveredPeers(MAX_PEER_LIST_BATCH_SIZE)
				.map(
					(peer: Peer): ProtocolPeerInfo | undefined => {
						const peerDetailedInfo: P2PDiscoveredPeerInfo | undefined =
							peer.detailedPeerInfo;
						
						if (!peerDetailedInfo) {
							return undefined;
						}

						// The options property is not read by the current legacy protocol but it should be added anyway for future compatibility.
						return {
							broadhash: peerDetailedInfo.options
								? (peerDetailedInfo.options.broadhash as string)
								: '',
							height: peerDetailedInfo.height,
							ip: peerDetailedInfo.ipAddress,
							nonce: peerDetailedInfo.options
								? (peerDetailedInfo.options.nonce as string)
								: '',
							os: peerDetailedInfo.os,
							version: peerDetailedInfo.version,
							httpPort: peerDetailedInfo.options
								? (peerDetailedInfo.options.httpPort as number) : undefined,
							wsPort: peerDetailedInfo.wsPort,
							options: peerDetailedInfo.options
						};
					},
				)
				.filter(
					(peerDetailedInfo: ProtocolPeerInfo | undefined) =>
						!!peerDetailedInfo,
				)
				.map(
					(peerDetailedInfo: ProtocolPeerInfo | undefined) =>
						peerDetailedInfo as ProtocolPeerInfo,
				),
		};

		request.end(protocolPeerInfoList);
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
		peer.removeListener(EVENT_FAILED_PEER_INFO_UPDATE, this._handleFailedPeerInfoUpdate);
	}
}
