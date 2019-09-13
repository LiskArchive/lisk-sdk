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
	PeerLists,
} from './p2p_types';
import {
	ConnectionState,
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
	PeerConfig,
} from './peer';
import { getUniquePeersbyIp } from './peer_selection';
import { constructPeerIdFromPeerInfo } from './utils';

import { EVICTED_PEER_CODE } from './disconnect_status_codes';

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

interface PeerPoolConfig {
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
	readonly outboundUpdateStatusInterval?: number;
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
}

export const MAX_PEER_LIST_BATCH_SIZE = 100;
export const MAX_PEER_DISCOVERY_PROBE_SAMPLE_SIZE = 100;
export const EVENT_REMOVE_PEER = 'removePeer';
export const INTENTIONAL_DISCONNECT_STATUS_CODE = 1000;

export enum PROTECTION_CATEGORY {
	NET_GROUP = 'netgroup',
	LATENCY = 'latency',
	RESPONSE_RATE = 'responseRate',
	CONNECT_TIME = 'connectTime',
}

interface FilterPeersOptions {
	readonly category: PROTECTION_CATEGORY;
	readonly percentage: number;
	readonly asc: boolean;
}

interface IndexablePeer {
	readonly [key: string]: number;
}
const filterPeersByCategory = (
	peers: Peer[],
	options: FilterPeersOptions,
): Peer[] => {
	// tslint:disable-next-line no-magic-numbers
	if (options.percentage > 1 || options.percentage < 0) {
		return peers;
	}
	const peerCount = Math.ceil(peers.length * options.percentage);
	const sign = !!options.asc ? 1 : -1;

	return peers
		.sort((a: IndexablePeer | Peer, b: IndexablePeer | Peer) =>
			a[options.category] > b[options.category] ? sign : sign * -1,
		)
		.slice(peerCount, peers.length);
};

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
	private readonly _outboundUpdateStatusId: number;
	private readonly _peerConfig: PeerConfig;
	private readonly _peerLists: PeerLists;

	public constructor(peerPoolConfig: PeerPoolConfig) {
		super();
		this._peerMap = new Map();
		this._peerPoolConfig = peerPoolConfig;
		this._peerConfig = {
			connectTimeout: this._peerPoolConfig.connectTimeout,
			ackTimeout: this._peerPoolConfig.ackTimeout,
			wsMaxMessageRate: this._peerPoolConfig.wsMaxMessageRate,
			wsMaxMessageRatePenalty: this._peerPoolConfig.wsMaxMessageRatePenalty,
			maxPeerDiscoveryResponseLength: this._peerPoolConfig
				.maxPeerDiscoveryResponseLength,
			rateCalculationInterval: this._peerPoolConfig.rateCalculationInterval,
			wsMaxPayload: this._peerPoolConfig.wsMaxPayload,
			maxPeerInfoSize: this._peerPoolConfig.maxPeerInfoSize,
			secret: this._peerPoolConfig.secret,
		};
		this._peerLists = peerPoolConfig.peerLists;
		this._peerSelectForSend = peerPoolConfig.peerSelectionForSend;
		this._peerSelectForRequest = peerPoolConfig.peerSelectionForRequest;
		this._peerSelectForConnection = peerPoolConfig.peerSelectionForConnection;
		this._maxOutboundConnections = peerPoolConfig.maxOutboundConnections;
		this._maxInboundConnections = peerPoolConfig.maxInboundConnections;
		this._sendPeerLimit = peerPoolConfig.sendPeerLimit;
		this._outboundUpdateStatusId = setInterval(() => {
			// tslint:disable-next-line: no-floating-promises
			(async () => {
				await this._updateOutboundConnections();
			})().catch(error => error);
		}, peerPoolConfig.outboundUpdateStatusInterval);

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
			const peerId = constructPeerIdFromPeerInfo(closePacket.peerInfo);
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

	public get peerConfig(): PeerConfig {
		return { ...this._peerConfig };
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		// This function can be customized so we should pass as much info as possible.
		const selectedPeers = this._peerSelectForRequest({
			peers: this.getUniqueOutboundConnectedPeers(),
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
		// This function can be customized so we should pass as much info as possible.
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

	public triggerNewConnections(
		newPeers: ReadonlyArray<P2PPeerInfo>,
		triedPeers: ReadonlyArray<P2PPeerInfo>,
		fixedPeers: ReadonlyArray<P2PPeerInfo>,
	): void {
		// Try to connect to disconnected peers without including the fixed ones which are specially treated thereafter
		const disconnectedNewPeers = newPeers.filter(
			newPeer =>
				!this._peerMap.has(constructPeerIdFromPeerInfo(newPeer)) ||
				!fixedPeers
					.map(fixedPeer => fixedPeer.ipAddress)
					.includes(newPeer.ipAddress),
		);
		const disconnectedTriedPeers = triedPeers.filter(
			triedPeer =>
				!this._peerMap.has(constructPeerIdFromPeerInfo(triedPeer)) ||
				!fixedPeers
					.map(fixedPeer => fixedPeer.ipAddress)
					.includes(triedPeer.ipAddress),
		);
		const { outboundCount } = this.getPeersCountPerKind();
		const disconnectedFixedPeers = fixedPeers
			.filter(peer => !this._peerMap.get(constructPeerIdFromPeerInfo(peer)))
			.map(peer2Convert => peer2Convert as P2PDiscoveredPeerInfo);

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
			(peerInfo: P2PPeerInfo) => {
				const peerId = constructPeerIdFromPeerInfo(peerInfo);
				const existingPeer = this.getPeer(peerId);

				return existingPeer
					? existingPeer
					: this.addOutboundPeer(peerId, peerInfo);
			},
		);
	}

	public addInboundPeer(
		peerInfo: P2PDiscoveredPeerInfo,
		socket: SCServerSocket,
	): Peer {
		const inboundPeers = this.getPeers(InboundPeer);
		if (inboundPeers.length >= this._maxInboundConnections) {
			this._evictPeer(InboundPeer);
		}

		const peer = new InboundPeer(peerInfo, socket, {
			...this._peerConfig,
		});

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

	public addOutboundPeer(peerId: string, peerInfo: P2PPeerInfo): Peer {
		const existingPeer = this.getPeer(peerId);
		if (existingPeer) {
			return existingPeer;
		}

		const peer = new OutboundPeer(peerInfo, { ...this._peerConfig });

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
						outboundCount: prev.outboundCount + 1,
						inboundCount: prev.inboundCount,
					};
				} else if (peer instanceof InboundPeer) {
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
			clearInterval(this._outboundUpdateStatusId);
		}

		this._peerMap.forEach((peer: Peer) => {
			this.removePeer(
				peer.id,
				INTENTIONAL_DISCONNECT_STATUS_CODE,
				`Intentionally removed peer ${peer.id}`,
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

	public getUniqueOutboundConnectedPeers(): ReadonlyArray<
		P2PDiscoveredPeerInfo
	> {
		return getUniquePeersbyIp(this.getAllConnectedPeerInfos(OutboundPeer));
	}

	public getAllConnectedPeerInfos(
		kind?: typeof OutboundPeer | typeof InboundPeer,
	): ReadonlyArray<P2PDiscoveredPeerInfo> {
		return this.getConnectedPeers(kind).map(
			peer => peer.peerInfo as P2PDiscoveredPeerInfo,
		);
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

	private async _updateOutboundConnections(): Promise<void> {
		try {
			await Promise.all(
				this.getConnectedPeers(OutboundPeer).map(async peer =>
					peer.fetchStatus().catch(err => err),
				),
			);
		} catch (err) {
			return;
		}
	}

	private _selectPeersForEviction(): Peer[] {
		const peers = [...this.getPeers(InboundPeer)].filter(peer =>
			this._peerLists.whitelisted.every(
				p => constructPeerIdFromPeerInfo(p) !== peer.id,
			),
		);

		// Cannot predict which netgroups will be protected
		const filteredPeersByNetgroup = this._peerPoolConfig.netgroupProtectionRatio
			? filterPeersByCategory(peers, {
					category: PROTECTION_CATEGORY.NET_GROUP,
					percentage: this._peerPoolConfig.netgroupProtectionRatio,
					asc: true,
			  })
			: peers;
		if (filteredPeersByNetgroup.length <= 1) {
			return filteredPeersByNetgroup;
		}

		// Cannot manipulate without physically moving nodes closer to the target.
		const filteredPeersByLatency = this._peerPoolConfig.latencyProtectionRatio
			? filterPeersByCategory(peers, {
					category: PROTECTION_CATEGORY.LATENCY,
					percentage: this._peerPoolConfig.latencyProtectionRatio,
					asc: true,
			  })
			: filteredPeersByNetgroup;
		if (filteredPeersByLatency.length <= 1) {
			return filteredPeersByLatency;
		}

		// Cannot manipulate this metric without performing useful work.
		const filteredPeersByResponseRate = this._peerPoolConfig
			.productivityProtectionRatio
			? filterPeersByCategory(filteredPeersByLatency, {
					category: PROTECTION_CATEGORY.RESPONSE_RATE,
					percentage: this._peerPoolConfig.productivityProtectionRatio,
					asc: false,
			  })
			: filteredPeersByLatency;
		if (filteredPeersByResponseRate.length <= 1) {
			return filteredPeersByResponseRate;
		}

		// Protect remaining half of peers by longevity, precludes attacks that start later.
		const filteredPeersByConnectTime = this._peerPoolConfig
			.longevityProtectionRatio
			? filterPeersByCategory(filteredPeersByResponseRate, {
					category: PROTECTION_CATEGORY.CONNECT_TIME,
					percentage: this._peerPoolConfig.longevityProtectionRatio,
					asc: true,
			  })
			: filteredPeersByResponseRate;

		return filteredPeersByConnectTime;
	}

	private _evictPeer(kind: typeof InboundPeer | typeof OutboundPeer): void {
		const peers = this.getPeers(kind);
		if (peers.length < 1) {
			return;
		}

		if (kind === OutboundPeer) {
			const selectedPeer = shuffle(
				peers.filter(peer =>
					this._peerLists.fixedPeers.every(
						p => constructPeerIdFromPeerInfo(p) !== peer.id,
					),
				),
			)[0];
			if (selectedPeer) {
				this.removePeer(
					selectedPeer.id,
					EVICTED_PEER_CODE,
					`Evicted outbound peer ${selectedPeer.id}`,
				);
			}
		}

		if (kind === InboundPeer) {
			const evictionCandidates = this._selectPeersForEviction();
			const peerToEvict = shuffle(evictionCandidates)[0];
			if (peerToEvict) {
				this.removePeer(
					peerToEvict.id,
					EVICTED_PEER_CODE,
					`Evicted inbound peer ${peerToEvict.id}`,
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
