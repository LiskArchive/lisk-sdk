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
import { RequestFailError, SendFailError } from './errors';
import { P2PRequest } from './p2p_request';
import {
	P2PClosePacket,
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PPeersCount,
	P2PPeerSelectionForConnectionFunction,
	P2PPeerSelectionForRequestFunction,
	P2PPeerSelectionForSendFunction,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';
import {
	ConnectionState,
	constructPeerIdFromPeerInfo,
	EVENT_BAN_PEER,
	EVENT_CLOSE_INBOUND,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REQUEST_RECEIVED,
	EVENT_UNBAN_PEER,
	EVENT_UPDATED_PEER_INFO,
	InboundPeer,
	OutboundPeer,
	Peer,
} from './peer';

export {
	EVENT_CLOSE_INBOUND,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_BAN_PEER,
	EVENT_UNBAN_PEER,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_DISCOVERED_PEER,
};

export { connectAndFetchPeerInfo } from './peer';

interface PeerPoolConfig {
	readonly connectTimeout?: number;
	readonly ackTimeout?: number;
	readonly peerSelectionForSend: P2PPeerSelectionForSendFunction;
	readonly peerSelectionForRequest: P2PPeerSelectionForRequestFunction;
	readonly peerSelectionForConnection: P2PPeerSelectionForConnectionFunction;
	readonly sendPeerLimit: number;
	readonly peerBanTime: number;
	readonly maxOutboundConnections: number;
	readonly maxInboundConnections: number;
	readonly outboundShuffleInterval: number;
	readonly evictionProtectionEnabled: boolean;
	readonly evictionProtectionRatio: number;
}

export const MAX_PEER_LIST_BATCH_SIZE = 100;
export const MAX_PEER_DISCOVERY_PROBE_SAMPLE_SIZE = 100;
export const PEER_PROTECTION_PERCENTAGE_PER_CATEGORY = 0.068;
export const LONGEVITY_CATEGORY_PERCENTAGE = 0.5;

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;
	private readonly _peerPoolConfig: PeerPoolConfig;
	private readonly _handlePeerRPC: (request: P2PRequest) => void;
	private readonly _handlePeerMessage: (message: P2PMessagePacket) => void;
	private readonly _handleOutboundPeerConnect: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleDiscoverPeer: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleOutboundPeerConnectAbort: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handlePeerCloseOutbound: (
		closePacket: P2PClosePacket,
	) => void;
	private readonly _handlePeerCloseInbound: (
		closePacket: P2PClosePacket,
	) => void;
	private readonly _handlePeerOutboundSocketError: (error: Error) => void;
	private readonly _handlePeerInboundSocketError: (error: Error) => void;
	private readonly _handlePeerInfoUpdate: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private readonly _handleFailedToFetchPeerInfo: (error: Error) => void;
	private readonly _handleFailedToFetchPeers: (error: Error) => void;
	private readonly _handleFailedToCollectPeerDetails: (error: Error) => void;
	private readonly _handleBanPeer: (peerId: string) => void;
	private readonly _handleUnbanPeer: (peerId: string) => void;
	private _nodeInfo: P2PNodeInfo | undefined;
	private readonly _maxOutboundConnections: number;
	private readonly _maxInboundConnections: number;
	private readonly _peerSelectForSend: P2PPeerSelectionForSendFunction;
	private readonly _peerSelectForRequest: P2PPeerSelectionForRequestFunction;
	private readonly _peerSelectForConnection: P2PPeerSelectionForConnectionFunction;
	private readonly _sendPeerLimit: number;
	private readonly _outboundShuffleIntervalId: NodeJS.Timer | undefined;

	public constructor(peerPoolConfig: PeerPoolConfig) {
		super();
		this._peerMap = new Map();
		this._peerPoolConfig = peerPoolConfig;
		this._peerSelectForSend = peerPoolConfig.peerSelectionForSend;
		this._peerSelectForRequest = peerPoolConfig.peerSelectionForRequest;
		this._peerSelectForConnection = peerPoolConfig.peerSelectionForConnection;
		this._maxOutboundConnections = peerPoolConfig.maxOutboundConnections;
		this._maxInboundConnections = peerPoolConfig.maxInboundConnections;
		this._sendPeerLimit = peerPoolConfig.sendPeerLimit;
		this._outboundShuffleIntervalId = setInterval(() => {
			this._evictPeer(OutboundPeer);
		}, peerPoolConfig.outboundShuffleInterval);

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

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleDiscoverPeer = (peerInfo: P2PDiscoveredPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_DISCOVERED_PEER, peerInfo);
		};

		this._handleOutboundPeerConnect = async (
			peerInfo: P2PDiscoveredPeerInfo,
		) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
		};
		this._handleOutboundPeerConnectAbort = (
			peerInfo: P2PDiscoveredPeerInfo,
		) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};
		this._handlePeerCloseOutbound = (closePacket: P2PClosePacket) => {
			const peerId = constructPeerIdFromPeerInfo(closePacket.peerInfo);
			this.removePeer(peerId);
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};
		this._handlePeerCloseInbound = (closePacket: P2PClosePacket) => {
			const peerId = constructPeerIdFromPeerInfo(closePacket.peerInfo);
			this.removePeer(peerId);
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_INBOUND, closePacket);
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
		this._handleFailedToFetchPeerInfo = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);
		};
		this._handleFailedToFetchPeers = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEERS, error);
		};
		this._handleFailedToCollectPeerDetails = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT, error);
		};
		this._handleBanPeer = (peerId: string) => {
			// Unban peer after peerBanTime
			setTimeout(
				this._handleUnbanPeer.bind(this, peerId),
				this._peerPoolConfig.peerBanTime,
			);
			// Re-emit the peerId to allow it to bubble up the class hierarchy.
			this.emit(EVENT_BAN_PEER, peerId);
		};
		this._handleUnbanPeer = (peerId: string) => {
			// Re-emit the peerId to allow it to bubble up the class hierarchy.
			this.emit(EVENT_UNBAN_PEER, peerId);
		};
	}

	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		const peerList = this.getPeers();
		peerList.forEach(peer => {
			this._applyNodeInfoOnPeer(peer, nodeInfo);
		});
	}

	public get nodeInfo(): P2PNodeInfo | undefined {
		return this._nodeInfo;
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		const listOfPeerInfo = [...this._peerMap.values()].map(
			(peer: Peer) => peer.peerInfo as P2PDiscoveredPeerInfo,
		);
		const selectedPeers = this._peerSelectForRequest({
			peers: listOfPeerInfo,
			nodeInfo: this._nodeInfo,
			peerLimit: 1,
			requestPacket: packet,
		});

		if (selectedPeers.length <= 0) {
			throw new RequestFailError(
				'Request failed due to no peers found in peer selection',
			);
		}
		const selectedPeerId = constructPeerIdFromPeerInfo(selectedPeers[0]);

		return this.requestFromPeer(packet, selectedPeerId);
	}

	public send(message: P2PMessagePacket): void {
		const listOfPeerInfo = [...this._peerMap.values()].map(
			(peer: Peer) => peer.peerInfo as P2PDiscoveredPeerInfo,
		);
		const selectedPeers = this._peerSelectForSend({
			peers: listOfPeerInfo,
			nodeInfo: this._nodeInfo,
			peerLimit: this._sendPeerLimit,
			messagePacket: message,
		});

		selectedPeers.forEach((peerInfo: P2PDiscoveredPeerInfo) => {
			const selectedPeerId = constructPeerIdFromPeerInfo(peerInfo);
			this.sendToPeer(message, selectedPeerId);
		});
	}

	public async requestFromPeer(
		packet: P2PRequestPacket,
		peerId: string,
	): Promise<P2PResponsePacket> {
		const peer = this._peerMap.get(peerId);
		if (!peer) {
			throw new RequestFailError(
				`Request failed because a peer with id ${peerId} could not be found`,
			);
		}

		return peer.request(packet);
	}

	public sendToPeer(message: P2PMessagePacket, peerId: string): void {
		const peer = this._peerMap.get(peerId);
		if (!peer) {
			throw new SendFailError(
				`Send failed because a peer with id ${peerId} could not be found`,
			);
		}
		peer.send(message);
	}

	public triggerNewConnections(peers: ReadonlyArray<P2PPeerInfo>): void {
		const disconnectedPeers = peers.filter(
			peer => !this._peerMap.has(constructPeerIdFromPeerInfo(peer)),
		);
		const { outbound } = this.getPeersCountPerKind();
		// Trigger new connections only if the maximum of outbound connections has not been reached
		const peersToConnect = this._peerSelectForConnection({
			peers: disconnectedPeers,
			peerLimit: this._maxOutboundConnections - outbound,
		});
		peersToConnect.forEach((peerInfo: P2PPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const existingPeer = this.getPeer(peerId);

			return existingPeer
				? existingPeer
				: this.addOutboundPeer(peerId, peerInfo);
		});
	}

	public addInboundPeer(
		peerInfo: P2PDiscoveredPeerInfo,
		socket: SCServerSocket,
	): Peer {
		const inboundPeers = this.getPeers(InboundPeer);
		if (inboundPeers.length >= this._maxInboundConnections) {
			if (!this._peerPoolConfig.evictionProtectionEnabled) {
				this.removePeer(shuffle(inboundPeers)[0].id);
			} else {
				this._evictPeer(InboundPeer);
			}
		}

		const peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
		};
		const peer = new InboundPeer(peerInfo, socket, peerConfig);

		// Throw an error because adding a peer multiple times is a common developer error which is very difficult to identify and debug.
		if (this._peerMap.has(peer.id)) {
			throw new Error(`Peer ${peer.id} was already in the peer pool`);
		}
		this._peerMap.set(peer.id, peer);
		this._bindHandlersToPeer(peer);
		if (this._nodeInfo) {
			this._applyNodeInfoOnPeer(peer, this._nodeInfo);
		}

		return peer;
	}

	public addOutboundPeer(peerId: string, peerInfo: P2PPeerInfo): Peer {
		const existingPeer = this.getPeer(peerId);
		if (existingPeer) {
			return existingPeer;
		}

		const peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
			banTime: this._peerPoolConfig.peerBanTime,
		};
		const peer = new OutboundPeer(peerInfo, peerConfig);

		this._peerMap.set(peer.id, peer);
		this._bindHandlersToPeer(peer);
		if (this._nodeInfo) {
			this._applyNodeInfoOnPeer(peer, this._nodeInfo);
		}

		return peer;
	}

	public getPeersCountPerKind(): P2PPeersCount {
		return [...this._peerMap.values()].reduce(
			(prev, peer) => {
				if (peer instanceof OutboundPeer) {
					return {
						outbound: prev.outbound + 1,
						inbound: prev.inbound,
					};
				} else if (peer instanceof InboundPeer) {
					return {
						outbound: prev.outbound,
						inbound: prev.inbound + 1,
					};
				}
				throw new Error('A non-identified peer exists in the pool.');
			},
			{ outbound: 0, inbound: 0 },
		);
	}

	public removeAllPeers(): void {
		// Clear periodic eviction of outbound peers for shuffling
		if (this._outboundShuffleIntervalId) {
			clearInterval(this._outboundShuffleIntervalId);
		}

		this._peerMap.forEach((peer: Peer) => {
			this.removePeer(peer.id);
		});
	}

	public getAllPeerInfos(): ReadonlyArray<P2PPeerInfo> {
		return this.getPeers().map(peer => peer.peerInfo);
	}

	public getPeers(
		kind?: typeof OutboundPeer | typeof InboundPeer,
	): ReadonlyArray<Peer> {
		const peers = [...this._peerMap.values()];
		if (kind) {
			return peers.filter(peer => peer instanceof kind);
		}

		return peers;
	}

	public getAllConnectedPeerInfos(): ReadonlyArray<P2PDiscoveredPeerInfo> {
		return this.getConnectedPeers().map(
			peer => peer.peerInfo as P2PDiscoveredPeerInfo,
		);
	}

	public getConnectedPeers(
		kind?: typeof OutboundPeer | typeof InboundPeer,
	): ReadonlyArray<Peer> {
		const peers = [...this._peerMap.values()];
		if (kind) {
			return peers.filter(peer => peer instanceof kind);
		}

		return peers.filter(peer => peer.state === ConnectionState.OPEN);
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

	public applyPenalty(peerPenalty: P2PPenalty): void {
		const peer = this._peerMap.get(peerPenalty.peerId);
		if (peer) {
			peer.applyPenalty(peerPenalty.penalty);

			return;
		}

		throw new Error('Peer not found');
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

	// TODO: Protect peers by netgroup
	private _selectPeersForEviction(peers: Peer[]): Peer[] {
		const evictionProtectionRatio = this._peerPoolConfig
			.evictionProtectionRatio;
		// Cannot manipulate without physically moving nodes closer to the target.
		const LATENCY_CATEGORY_PERCENTAGE =
			evictionProtectionRatio * PEER_PROTECTION_PERCENTAGE_PER_CATEGORY;
		const PROXIMAL_PEER_COUNT = Math.ceil(
			evictionProtectionRatio * LATENCY_CATEGORY_PERCENTAGE * peers.length,
		);
		const filteredPeersByLatency = peers
			.sort((a, b) => (a.latency > b.latency ? 1 : -1))
			.slice(PROXIMAL_PEER_COUNT, peers.length);

		if (filteredPeersByLatency.length <= 1) {
			return filteredPeersByLatency;
		}
		// Cannot manipulate this metric without performing useful work.
		const RESPONSIVENESS_CATEGORY_PERCENTAGE =
			evictionProtectionRatio * PEER_PROTECTION_PERCENTAGE_PER_CATEGORY;
		const RESPONSIVE_PEER_COUNT = Math.ceil(
			evictionProtectionRatio *
				RESPONSIVENESS_CATEGORY_PERCENTAGE *
				filteredPeersByLatency.length,
		);
		const filteredPeersByResponsiveness = filteredPeersByLatency
			.sort((a, b) =>
				a.productivity.responseRate > b.productivity.responseRate ? -1 : 1,
			)
			.slice(RESPONSIVE_PEER_COUNT, filteredPeersByLatency.length);

		if (filteredPeersByResponsiveness.length <= 1) {
			return filteredPeersByResponsiveness;
		}
		// Protect remaining half of peers by longevity, precludes attacks that start later.
		const STEADY_PEER_COUNT =
			filteredPeersByResponsiveness.length * LONGEVITY_CATEGORY_PERCENTAGE;
		const filteredPeersByConnectTime = filteredPeersByResponsiveness
			.sort((a, b) => (a.connectTime > b.connectTime ? 1 : -1))
			.slice(
				Math.ceil(STEADY_PEER_COUNT),
				filteredPeersByResponsiveness.length,
			);

		return filteredPeersByConnectTime;
	}

	private _evictPeer(kind: typeof InboundPeer | typeof OutboundPeer): void {
		const peers = this.getPeers(kind);
		if (peers.length < 1) {
			return;
		}

		if (kind === OutboundPeer) {
			const peerIdToRemove = constructPeerIdFromPeerInfo(shuffle(peers)[0]);
			this.removePeer(peerIdToRemove);
		}

		if (kind === InboundPeer) {
			const evictionCandidates = this._selectPeersForEviction([...peers]);
			const peerToEvict = shuffle(evictionCandidates)[0];
			this.removePeer(peerToEvict.id);
		}
	}

	private _bindHandlersToPeer(peer: Peer): void {
		peer.on(EVENT_REQUEST_RECEIVED, this._handlePeerRPC);
		peer.on(EVENT_MESSAGE_RECEIVED, this._handlePeerMessage);
		peer.on(EVENT_CONNECT_OUTBOUND, this._handleOutboundPeerConnect);
		peer.on(EVENT_CONNECT_ABORT_OUTBOUND, this._handleOutboundPeerConnectAbort);
		peer.on(EVENT_CLOSE_OUTBOUND, this._handlePeerCloseOutbound);
		peer.on(EVENT_CLOSE_INBOUND, this._handlePeerCloseInbound);
		peer.on(EVENT_OUTBOUND_SOCKET_ERROR, this._handlePeerOutboundSocketError);
		peer.on(EVENT_INBOUND_SOCKET_ERROR, this._handlePeerInboundSocketError);
		peer.on(EVENT_UPDATED_PEER_INFO, this._handlePeerInfoUpdate);
		peer.on(EVENT_FAILED_PEER_INFO_UPDATE, this._handleFailedPeerInfoUpdate);
		peer.on(EVENT_FAILED_TO_FETCH_PEER_INFO, this._handleFailedToFetchPeerInfo);
		peer.on(EVENT_FAILED_TO_FETCH_PEERS, this._handleFailedToFetchPeers);
		peer.on(
			EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
			this._handleFailedToCollectPeerDetails,
		);
		peer.on(EVENT_BAN_PEER, this._handleBanPeer);
		peer.on(EVENT_UNBAN_PEER, this._handleUnbanPeer);
		peer.on(EVENT_DISCOVERED_PEER, this._handleDiscoverPeer);
	}

	private _unbindHandlersFromPeer(peer: Peer): void {
		peer.removeListener(EVENT_REQUEST_RECEIVED, this._handlePeerRPC);
		peer.removeListener(EVENT_MESSAGE_RECEIVED, this._handlePeerMessage);
		peer.removeListener(
			EVENT_CONNECT_OUTBOUND,
			this._handleOutboundPeerConnect,
		);
		peer.removeListener(
			EVENT_CONNECT_ABORT_OUTBOUND,
			this._handleOutboundPeerConnectAbort,
		);
		peer.removeListener(EVENT_CLOSE_OUTBOUND, this._handlePeerCloseOutbound);
		peer.removeListener(EVENT_CLOSE_INBOUND, this._handlePeerCloseInbound);
		peer.removeListener(EVENT_UPDATED_PEER_INFO, this._handlePeerInfoUpdate);
		peer.removeListener(
			EVENT_FAILED_TO_FETCH_PEER_INFO,
			this._handleFailedToFetchPeerInfo,
		);
		peer.removeListener(
			EVENT_FAILED_TO_FETCH_PEERS,
			this._handleFailedToFetchPeers,
		);
		peer.removeListener(
			EVENT_FAILED_PEER_INFO_UPDATE,
			this._handleFailedPeerInfoUpdate,
		);
		peer.removeListener(
			EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
			this._handleFailedToCollectPeerDetails,
		);
		peer.removeListener(EVENT_BAN_PEER, this._handleBanPeer);
		peer.removeListener(EVENT_UNBAN_PEER, this._handleUnbanPeer);
		peer.removeListener(EVENT_DISCOVERED_PEER, this._handleDiscoverPeer);
	}
}
