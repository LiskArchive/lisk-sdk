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

/**
 * The purpose of the PeerPool is to provide a simple interface for selecting,
 * interacting with and handling aggregated events from a collection of peers.
 */
import { EventEmitter } from 'events';
// tslint:disable-next-line no-require-imports
import shuffle = require('lodash.shuffle');
import { SCServerSocket } from 'socketcluster-server';

import {
	ConnectionKind,
	DEFAULT_LOCALHOST_IP,
	EVICTED_PEER_CODE,
	INTENTIONAL_DISCONNECT_CODE,
} from './constants';
import { RequestFailError, SendFailError } from './errors';
import {
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
	EVENT_FAILED_TO_PUSH_SHARED_STATE,
	EVENT_FAILED_TO_SEND_MESSAGE,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REMOVE_PEER,
	EVENT_REQUEST_RECEIVED,
	EVENT_UNBAN_PEER,
	EVENT_UPDATED_PEER_INFO,
	REMOTE_EVENT_POST_SHARED_STATE,
	REMOTE_EVENT_RPC_GET_SHARED_STATE,
} from './events';
import { P2PRequest } from './p2p_request';
import {
	P2PClosePacket,
	P2PMessagePacket,
	P2PPeerInfo,
	P2PPeersCount,
	P2PPeerSelectionForConnectionFunction,
	P2PPeerSelectionForRequestFunction,
	P2PPeerSelectionForSendFunction,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
	P2PSharedState,
	PeerLists,
} from './p2p_types';
import {
	ConnectionState,
	InboundPeer,
	OutboundPeer,
	Peer,
	PeerConfig,
} from './peer';

interface FilterPeersOptions {
	readonly category: PROTECTION_CATEGORY;
	readonly percentage: number;
	readonly protectBy: PROTECT_BY;
}

export enum PROTECT_BY {
	HIGHEST = 'highest',
	LOWEST = 'lowest',
}

// Returns an array of peers to be protected
export const filterPeersByCategory = (
	peers: Peer[],
	options: FilterPeersOptions,
): Peer[] => {
	// tslint:disable-next-line no-magic-numbers
	if (options.percentage > 1 || options.percentage < 0) {
		return peers;
	}
	const numberOfProtectedPeers = Math.ceil(peers.length * options.percentage);
	const sign = options.protectBy === PROTECT_BY.HIGHEST ? -1 : 1;

	// tslint:disable-next-line no-any
	return peers
		.sort((peerA: any, peerB: any) =>
			peerA[options.category] > peerB[options.category] ? sign : sign * -1,
		)
		.slice(0, numberOfProtectedPeers);
};

export enum PROTECTION_CATEGORY {
	NET_GROUP = 'netgroup',
	LATENCY = 'latency',
	RESPONSE_RATE = 'responseRate',
	CONNECT_TIME = 'connectTime',
}

export interface PeerPoolConfig {
	readonly ackTimeout?: number;
	readonly connectTimeout?: number;
	readonly wsMaxPayload?: number;
	readonly maxPeerInfoSize: number;
	readonly peerSelectionForSend: P2PPeerSelectionForSendFunction;
	readonly peerSelectionForRequest: P2PPeerSelectionForRequestFunction;
	readonly peerSelectionForConnection: P2PPeerSelectionForConnectionFunction;
	readonly sendPeerLimit: number;
	readonly peerBanTime: number;
	readonly maxOutboundConnections: number;
	readonly maxInboundConnections: number;
	readonly maxPeerDiscoveryResponseLength: number;
	readonly outboundShuffleInterval: number;
	readonly netgroupProtectionRatio: number;
	readonly latencyProtectionRatio: number;
	readonly productivityProtectionRatio: number;
	readonly longevityProtectionRatio: number;
	readonly wsMaxMessageRate: number;
	readonly wsMaxMessageRatePenalty: number;
	readonly rateCalculationInterval: number;
	readonly secret: number;
	readonly peerLists: PeerLists;
	readonly sharedState: P2PSharedState;
}

export class PeerPool extends EventEmitter {
	private readonly _peerMap: Map<string, Peer>;
	private readonly _peerPoolConfig: PeerPoolConfig;
	private readonly _handlePeerRPC: (request: P2PRequest) => void;
	private readonly _handlePeerMessage: (message: P2PMessagePacket) => void;
	private readonly _handleOutboundPeerConnect: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleDiscoverPeer: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleOutboundPeerConnectAbort: (
		peerInfo: P2PPeerInfo,
	) => void;
	private readonly _handlePeerCloseOutbound: (
		closePacket: P2PClosePacket,
	) => void;
	private readonly _handlePeerCloseInbound: (
		closePacket: P2PClosePacket,
	) => void;
	private readonly _handlePeerOutboundSocketError: (error: Error) => void;
	private readonly _handlePeerInboundSocketError: (error: Error) => void;
	private readonly _handlePeerInfoUpdate: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private readonly _handleFailedToFetchPeerInfo: (error: Error) => void;
	private readonly _handleFailedToFetchPeers: (error: Error) => void;
	private readonly _handleFailedToCollectPeerDetails: (error: Error) => void;
	private readonly _handleBanPeer: (peerId: string) => void;
	private readonly _handleUnbanPeer: (peerId: string) => void;
	private _sharedState: P2PSharedState;
	private readonly _maxOutboundConnections: number;
	private readonly _maxInboundConnections: number;
	private readonly _peerSelectForSend: P2PPeerSelectionForSendFunction;
	private readonly _peerSelectForRequest: P2PPeerSelectionForRequestFunction;
	private readonly _peerSelectForConnection: P2PPeerSelectionForConnectionFunction;
	private readonly _sendPeerLimit: number;
	private readonly _outboundShuffleIntervalId: NodeJS.Timer | undefined;
	private readonly _peerConfig: PeerConfig;
	private readonly _peerLists: PeerLists;

	public constructor(peerPoolConfig: PeerPoolConfig) {
		super();
		this._peerMap = new Map();
		this._peerPoolConfig = peerPoolConfig;
		this._peerConfig = {
			connectTimeout: peerPoolConfig.connectTimeout,
			ackTimeout: peerPoolConfig.ackTimeout,
			wsMaxMessageRate: peerPoolConfig.wsMaxMessageRate,
			wsMaxMessageRatePenalty: peerPoolConfig.wsMaxMessageRatePenalty,
			maxPeerDiscoveryResponseLength:
				peerPoolConfig.maxPeerDiscoveryResponseLength,
			rateCalculationInterval: peerPoolConfig.rateCalculationInterval,
			wsMaxPayload: peerPoolConfig.wsMaxPayload,
			maxPeerInfoSize: peerPoolConfig.maxPeerInfoSize,
			secret: peerPoolConfig.secret,
			sharedState: peerPoolConfig.sharedState,
		};
		this._sharedState = peerPoolConfig.sharedState;
		this._peerLists = peerPoolConfig.peerLists;
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
			if (request.procedure === REMOTE_EVENT_RPC_GET_SHARED_STATE) {
				request.end(this.sharedState);
			}

			// Re-emit the request to allow it to bubble up the class hierarchy.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerMessage = (message: P2PMessagePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleDiscoverPeer = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_DISCOVERED_PEER, peerInfo);
		};

		this._handleOutboundPeerConnect = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
		};
		this._handleOutboundPeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};
		this._handlePeerCloseOutbound = (closePacket: P2PClosePacket) => {
			const peerId = closePacket.peerInfo.id;
			this.removePeer(
				peerId,
				closePacket.code,
				`Outbound peer ${peerId} disconnected with reason: ${closePacket.reason ||
					'Unknown reason'}`,
			);
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};
		this._handlePeerCloseInbound = (closePacket: P2PClosePacket) => {
			const peerId = closePacket.peerInfo.id;
			this.removePeer(
				peerId,
				closePacket.code,
				`Inbound peer ${peerId} disconnected with reason: ${closePacket.reason ||
					'Unknown reason'}`,
			);
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
		this._handlePeerInfoUpdate = (peerInfo: P2PPeerInfo) => {
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

	public applySharedState(sharedState: P2PSharedState): void {
		this._sharedState = sharedState;
		const peerList = this.getPeers();
		peerList.forEach(peer => {
			peer.applySharedState(this.sharedState);
		});
	}

	public get sharedState(): P2PSharedState {
		return this._sharedState;
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		const outboundPeerInfos = this.getAllConnectedPeerInfos(OutboundPeer);
		// This function can be customized so we should pass as much info as possible.
		const selectedPeers = this._peerSelectForRequest({
			peers: outboundPeerInfos,
			peerLimit: 1,
			requestPacket: packet,
		});

		if (selectedPeers.length <= 0) {
			throw new RequestFailError(
				'Request failed due to no peers found in peer selection',
			);
		}

		const selectedPeerId = selectedPeers[0].id;

		return this.requestFromPeer(packet, selectedPeerId);
	}

	public broadcast(message: P2PMessagePacket): void {
		[...this._peerMap.values()].map(peer => {
			const selectedPeerId = peer.info.id;
			try {
				this.sendToPeer(message, selectedPeerId);
			} catch (error) {
				this.emit(EVENT_FAILED_TO_SEND_MESSAGE, error);
			}
		});
	}

	public send(message: P2PMessagePacket): void {
		const listOfPeerInfo: ReadonlyArray<P2PPeerInfo> = [
			...this._peerMap.values(),
		].map(peer => ({
			...peer.info,
			internalState: {
				...peer.info.internalState,
				connectionKind:
					peer instanceof OutboundPeer
						? ConnectionKind.OUTBOUND
						: ConnectionKind.INBOUND,
			},
		}));

		// This function can be customized so we should pass as much info as possible.
		const selectedPeers = this._peerSelectForSend({
			peers: listOfPeerInfo,
			peerLimit: this._sendPeerLimit,
			messagePacket: message,
		});

		selectedPeers.forEach((peerInfo: P2PPeerInfo) => {
			const selectedPeerId = peerInfo.id;
			try {
				this.sendToPeer(message, selectedPeerId);
			} catch (error) {
				this.emit(EVENT_FAILED_TO_SEND_MESSAGE, error);
			}
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

	public triggerNewConnections(
		newPeers: ReadonlyArray<P2PPeerInfo>,
		triedPeers: ReadonlyArray<P2PPeerInfo>,
		fixedPeers: ReadonlyArray<P2PPeerInfo>,
	): void {
		// Try to connect to disconnected peers without including the fixed ones which are specially treated thereafter
		const disconnectedNewPeers = newPeers.filter(
			newPeer => !this._peerMap.has(newPeer.id),
		);
		const disconnectedTriedPeers = triedPeers.filter(
			triedPeer => !this._peerMap.has(triedPeer.id),
		);
		const { outboundCount } = this.getPeersCountPerKind();
		const disconnectedFixedPeers = fixedPeers
			.filter(peer => !this._peerMap.get(peer.id))
			.map(peer2Convert => peer2Convert);

		// Trigger new connections only if the maximum of outbound connections has not been reached
		// If the node is not yet connected to any of the fixed peers, enough slots should be saved for them
		const peerLimit =
			this._maxOutboundConnections -
			disconnectedFixedPeers.length -
			outboundCount;

		// This function can be customized so we should pass as much info as possible.
		const peersToConnect = this._peerSelectForConnection({
			newPeers: disconnectedNewPeers,
			triedPeers: disconnectedTriedPeers,
			peerLimit,
		});

		[...peersToConnect, ...disconnectedFixedPeers].forEach(
			(peerInfo: P2PPeerInfo) => this._addOutboundPeer(peerInfo),
		);
	}

	public addInboundPeer(peerInfo: P2PPeerInfo, socket: SCServerSocket): Peer {
		const inboundPeers = this.getPeers(InboundPeer);
		if (inboundPeers.length >= this._maxInboundConnections) {
			this._evictPeer(InboundPeer);
		}

		const peer = new InboundPeer(peerInfo, socket, {
			...this._peerConfig,
			sharedState: this.sharedState,
		});
		// Throw an error because adding a peer multiple times is a common developer error which is very difficult to identify and debug.
		if (this._peerMap.has(peer.info.id)) {
			throw new Error(`Peer ${peer.info.id} was already in the peer pool`);
		}
		this._peerMap.set(peer.info.id, peer);
		this._bindHandlersToPeer(peer);
		if (this.sharedState) {
			this._sendSharedStateToPeer(peer);
		}
		peer.connect();

		return peer;
	}

	private _addOutboundPeer(peerInfo: P2PPeerInfo): boolean {
		if (this.hasPeer(peerInfo.id)) {
			return false;
		}

		// Check if we got already Outbound connection into the IP address of the Peer
		const outboundConnectedPeer = this.getPeers(OutboundPeer).find(
			p =>
				p.info.ipAddress === peerInfo.ipAddress &&
				p.info.ipAddress !== DEFAULT_LOCALHOST_IP,
		);
		if (outboundConnectedPeer) {
			return false;
		}

		/*
			Inject our sharedState for validation during handshake on outbound peer connection
		*/
		const peer = new OutboundPeer(peerInfo, {
			...this._peerConfig,
			sharedState: this.sharedState,
		});

		this._peerMap.set(peer.info.id, peer);
		this._bindHandlersToPeer(peer);
		if (this.sharedState) {
			this._sendSharedStateToPeer(peer);
		}

		return true;
	}

	public getPeersCountPerKind(): P2PPeersCount {
		return [...this._peerMap.values()].reduce(
			(prev, peer) => {
				if (peer instanceof OutboundPeer) {
					return {
						outboundCount: prev.outboundCount + 1,
						inboundCount: prev.inboundCount,
					};
				}
				if (peer instanceof InboundPeer) {
					return {
						outboundCount: prev.outboundCount,
						inboundCount: prev.inboundCount + 1,
					};
				}
				throw new Error('A non-identified peer exists in the pool.');
			},
			{ outboundCount: 0, inboundCount: 0 },
		);
	}

	public removeAllPeers(): void {
		// Clear periodic eviction of outbound peers for shuffling
		if (this._outboundShuffleIntervalId) {
			clearInterval(this._outboundShuffleIntervalId);
		}

		this._peerMap.forEach((peer: Peer) => {
			this.removePeer(
				peer.info.id,
				INTENTIONAL_DISCONNECT_CODE,
				`Intentionally removed peer ${peer.info.id}`,
			);
		});
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

	public getAllConnectedPeerInfos(
		kind?: typeof OutboundPeer | typeof InboundPeer,
	): ReadonlyArray<P2PPeerInfo> {
		return this.getConnectedPeers(kind).map(peer => peer.info);
	}

	public getConnectedPeers(
		kind?: typeof OutboundPeer | typeof InboundPeer,
	): ReadonlyArray<Peer> {
		const peers = [...this._peerMap.values()];
		if (kind) {
			return peers.filter(
				peer => peer instanceof kind && peer.state === ConnectionState.OPEN,
			);
		}

		return peers.filter(peer => peer.state === ConnectionState.OPEN);
	}

	public getPeer(peerId: string): Peer | undefined {
		return this._peerMap.get(peerId);
	}

	public hasPeer(peerId: string): boolean {
		return this._peerMap.has(peerId);
	}

	public removePeer(peerId: string, code: number, reason: string): boolean {
		const peer = this._peerMap.get(peerId);
		if (peer) {
			peer.disconnect(code, reason);
			this._unbindHandlersFromPeer(peer);
		}

		this.emit(EVENT_REMOVE_PEER, peerId);

		return this._peerMap.delete(peerId);
	}

	public applyPenalty(peerPenalty: P2PPenalty): void {
		const peer = this._peerMap.get(peerPenalty.peerId);
		if (peer) {
			peer.applyPenalty(peerPenalty.penalty);

			return;
		}

		throw new Error(`Peer not found: ${peerPenalty.peerId}`);
	}

	private _sendSharedStateToPeer(peer: Peer): void {
		try {
			peer.send({
				event: REMOTE_EVENT_POST_SHARED_STATE,
				data: this.sharedState,
			});
		} catch (error) {
			this.emit(EVENT_FAILED_TO_PUSH_SHARED_STATE, error);
		}
	}

	private _selectPeersForEviction(): Peer[] {
		const peers = [...this.getPeers(InboundPeer)].filter(peer =>
			this._peerLists.whitelisted.every(p => p.id !== peer.info.id),
		);

		// Cannot predict which netgroups will be protected
		const protectedPeersByNetgroup = this._peerPoolConfig
			.netgroupProtectionRatio
			? filterPeersByCategory(peers, {
					category: PROTECTION_CATEGORY.NET_GROUP,
					percentage: this._peerPoolConfig.netgroupProtectionRatio,
					protectBy: PROTECT_BY.HIGHEST,
			  }).map(peer => peer.info.id)
			: [];

		// Cannot manipulate without physically moving nodes closer to the target.
		const protectedPeersByLatency = this._peerPoolConfig.latencyProtectionRatio
			? filterPeersByCategory(peers, {
					category: PROTECTION_CATEGORY.LATENCY,
					percentage: this._peerPoolConfig.latencyProtectionRatio,
					protectBy: PROTECT_BY.LOWEST,
			  }).map(peer => peer.info.id)
			: [];

		// Cannot manipulate this metric without performing useful work.
		const protectedPeersByResponseRate = this._peerPoolConfig
			.productivityProtectionRatio
			? filterPeersByCategory(peers, {
					category: PROTECTION_CATEGORY.RESPONSE_RATE,
					percentage: this._peerPoolConfig.productivityProtectionRatio,
					protectBy: PROTECT_BY.HIGHEST,
			  }).map(peer => peer.info.id)
			: [];

		const uniqueProtectedPeers = new Set([
			...protectedPeersByNetgroup,
			...protectedPeersByLatency,
			...protectedPeersByResponseRate,
		]);
		const unprotectedPeers = peers.filter(
			peer => !uniqueProtectedPeers.has(peer.info.id),
		);

		// Protect *the remaining half* of peers by longevity, precludes attacks that start later.
		const protectedPeersByConnectTime = this._peerPoolConfig
			.longevityProtectionRatio
			? new Set([
					...filterPeersByCategory(unprotectedPeers, {
						category: PROTECTION_CATEGORY.CONNECT_TIME,
						percentage: this._peerPoolConfig.longevityProtectionRatio,
						protectBy: PROTECT_BY.LOWEST,
					}).map(peer => peer.info.id),
			  ])
			: new Set();

		return unprotectedPeers.filter(
			peer => !protectedPeersByConnectTime.has(peer.info.id),
		);
	}

	private _evictPeer(kind: typeof InboundPeer | typeof OutboundPeer): void {
		const peers = this.getPeers(kind);
		if (peers.length < 1) {
			return;
		}

		// tslint:disable-next-line strict-comparisons
		if (kind === OutboundPeer) {
			const selectedPeer = shuffle(
				peers.filter(peer =>
					this._peerLists.fixed.every(p => p.id !== peer.info.id),
				),
			)[0];
			if (selectedPeer) {
				this.removePeer(
					selectedPeer.info.id,
					EVICTED_PEER_CODE,
					`Evicted outbound peer ${selectedPeer.info.id}`,
				);
			}
		}

		// tslint:disable-next-line strict-comparisons
		if (kind === InboundPeer) {
			const evictionCandidates = this._selectPeersForEviction();
			const peerToEvict = shuffle(evictionCandidates)[0];
			if (peerToEvict) {
				this.removePeer(
					peerToEvict.info.id,
					EVICTED_PEER_CODE,
					`Evicted inbound peer ${peerToEvict.info.id}`,
				);
			}
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
