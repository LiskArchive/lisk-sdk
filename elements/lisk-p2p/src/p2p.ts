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
import { EventEmitter } from 'events';
import * as http from 'http';
// tslint:disable-next-line no-require-imports
import shuffle = require('lodash.shuffle');
import { attach, SCServer, SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import {
	DEFAULT_BAN_TIME,
	DEFAULT_MAX_INBOUND_CONNECTIONS,
	DEFAULT_MAX_OUTBOUND_CONNECTIONS,
	DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	DEFAULT_MIN_PEER_DISCOVERY_THRESHOLD,
	DEFAULT_NODE_HOST_IP,
	DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
	DEFAULT_PEER_PROTECTION_FOR_LATENCY,
	DEFAULT_PEER_PROTECTION_FOR_LONGEVITY,
	DEFAULT_PEER_PROTECTION_FOR_NETGROUP,
	DEFAULT_PEER_PROTECTION_FOR_USEFULNESS,
	DEFAULT_POPULATOR_INTERVAL,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_RATE_CALCULATION_INTERVAL,
	DEFAULT_SEND_PEER_LIMIT,
	DEFAULT_WS_MAX_MESSAGE_RATE,
	DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
	DEFAULT_WS_MAX_PAYLOAD,
	DUPLICATE_CONNECTION,
	DUPLICATE_CONNECTION_REASON,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	INCOMPATIBLE_PEER_CODE,
	INCOMPATIBLE_PEER_UNKNOWN_REASON,
	INVALID_CONNECTION_QUERY_CODE,
	INVALID_CONNECTION_QUERY_REASON,
	INVALID_CONNECTION_SELF_CODE,
	INVALID_CONNECTION_SELF_REASON,
	INVALID_CONNECTION_URL_CODE,
	INVALID_CONNECTION_URL_REASON,
} from './constants';
import { ExistingPeerError, PeerInboundHandshakeError } from './errors';
import {
	EVENT_BAN_PEER,
	EVENT_CLOSE_INBOUND,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_FAILED_TO_SEND_MESSAGE,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_NETWORK_READY,
	EVENT_NEW_INBOUND_PEER,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REMOVE_PEER,
	EVENT_REQUEST_RECEIVED,
	EVENT_UNBAN_PEER,
	EVENT_UPDATED_PEER_INFO,
	REMOTE_EVENT_RPC_GET_PEERS_LIST,
} from './events';
import { P2PRequest } from './p2p_request';
import {
	P2PCheckPeerCompatibility,
	P2PClosePacket,
	P2PConfig,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
	PeerLists,
	ProtocolPeerInfo,
} from './p2p_types';
import { PeerBook } from './peer_book';
import { PeerPool, PeerPoolConfig } from './peer_pool';
import {
	constructPeerId,
	sanitizeOutgoingPeerInfo,
	sanitizePeerLists,
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
	validatePeerCompatibility,
} from './utils';

interface SCServerUpdated extends SCServer {
	readonly isReady: boolean;
}

const BASE_10_RADIX = 10;

const createPeerPoolConfig = (
	config: P2PConfig,
	peerLists: PeerLists,
): PeerPoolConfig => ({
	connectTimeout: config.connectTimeout,
	ackTimeout: config.ackTimeout,
	wsMaxPayload: config.wsMaxPayload
		? config.wsMaxPayload
		: DEFAULT_WS_MAX_PAYLOAD,
	peerSelectionForSend: config.peerSelectionForSend
		? config.peerSelectionForSend
		: selectPeersForSend,
	peerSelectionForRequest: config.peerSelectionForRequest
		? config.peerSelectionForRequest
		: selectPeersForRequest,
	peerSelectionForConnection: config.peerSelectionForConnection
		? config.peerSelectionForConnection
		: selectPeersForConnection,
	sendPeerLimit:
		config.sendPeerLimit === undefined
			? DEFAULT_SEND_PEER_LIMIT
			: config.sendPeerLimit,
	peerBanTime: config.peerBanTime ? config.peerBanTime : DEFAULT_BAN_TIME,
	maxOutboundConnections:
		config.maxOutboundConnections === undefined
			? DEFAULT_MAX_OUTBOUND_CONNECTIONS
			: config.maxOutboundConnections,
	maxInboundConnections:
		config.maxInboundConnections === undefined
			? DEFAULT_MAX_INBOUND_CONNECTIONS
			: config.maxInboundConnections,
	maxPeerDiscoveryResponseLength:
		config.maxPeerDiscoveryResponseLength === undefined
			? DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH
			: config.maxPeerDiscoveryResponseLength,
	maxPeerInfoSize: config.maxPeerInfoSize
		? config.maxPeerInfoSize
		: DEFAULT_MAX_PEER_INFO_SIZE,
	outboundShuffleInterval: config.outboundShuffleInterval
		? config.outboundShuffleInterval
		: DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
	netgroupProtectionRatio:
		typeof config.netgroupProtectionRatio === 'number'
			? config.netgroupProtectionRatio
			: DEFAULT_PEER_PROTECTION_FOR_NETGROUP,
	latencyProtectionRatio:
		typeof config.latencyProtectionRatio === 'number'
			? config.latencyProtectionRatio
			: DEFAULT_PEER_PROTECTION_FOR_LATENCY,
	productivityProtectionRatio:
		typeof config.productivityProtectionRatio === 'number'
			? config.productivityProtectionRatio
			: DEFAULT_PEER_PROTECTION_FOR_USEFULNESS,
	longevityProtectionRatio:
		typeof config.longevityProtectionRatio === 'number'
			? config.longevityProtectionRatio
			: DEFAULT_PEER_PROTECTION_FOR_LONGEVITY,
	wsMaxMessageRate:
		typeof config.wsMaxMessageRate === 'number'
			? config.wsMaxMessageRate
			: DEFAULT_WS_MAX_MESSAGE_RATE,
	wsMaxMessageRatePenalty:
		typeof config.wsMaxMessageRatePenalty === 'number'
			? config.wsMaxMessageRatePenalty
			: DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
	rateCalculationInterval:
		typeof config.rateCalculationInterval === 'number'
			? config.rateCalculationInterval
			: DEFAULT_RATE_CALCULATION_INTERVAL,
	secret: config.secret ? config.secret : DEFAULT_RANDOM_SECRET,
	peerLists,
});

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _sanitizedPeerLists: PeerLists;
	private readonly _httpServer: http.Server;
	private _isActive: boolean;
	private _hasConnected: boolean;
	private readonly _peerBook: PeerBook;
	private readonly _bannedPeers: Set<string>;
	private readonly _populatorInterval: number;
	private _populatorIntervalId: NodeJS.Timer | undefined;
	private _nodeInfo: P2PNodeInfo;
	private readonly _peerPool: PeerPool;
	private readonly _scServer: SCServerUpdated;

	private readonly _handlePeerPoolRPC: (request: P2PRequest) => void;
	private readonly _handlePeerPoolMessage: (message: P2PMessagePacket) => void;
	private readonly _handleDiscoveredPeer: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleFailedToPushNodeInfo: (error: Error) => void;
	private readonly _handleFailedToSendMessage: (error: Error) => void;
	private readonly _handleOutboundPeerConnect: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleOutboundPeerConnectAbort: (
		peerInfo: P2PPeerInfo,
	) => void;
	private readonly _handlePeerCloseOutbound: (
		closePacket: P2PClosePacket,
	) => void;
	private readonly _handlePeerCloseInbound: (
		closePacket: P2PClosePacket,
	) => void;
	private readonly _handleRemovePeer: (peerId: string) => void;
	private readonly _handlePeerInfoUpdate: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleFailedToFetchPeerInfo: (error: Error) => void;
	private readonly _handleFailedToFetchPeers: (error: Error) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private readonly _handleFailedToCollectPeerDetails: (error: Error) => void;
	private readonly _handleBanPeer: (peerId: string) => void;
	private readonly _handleUnbanPeer: (peerId: string) => void;
	private readonly _handleOutboundSocketError: (error: Error) => void;
	private readonly _handleInboundSocketError: (error: Error) => void;
	private readonly _peerHandshakeCheck: P2PCheckPeerCompatibility;

	public constructor(config: P2PConfig) {
		super();
		this._sanitizedPeerLists = sanitizePeerLists(
			{
				seeds: config.peerLists.seeds
					? config.peerLists.seeds.map(peer => ({
							peerId: constructPeerId(peer.ipAddress, peer.wsPort),
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
					  }))
					: [],
				blacklist: config.peerLists.blacklist
					? config.peerLists.blacklist.map(peer => ({
							peerId: constructPeerId(peer.ipAddress, peer.wsPort),
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
					  }))
					: [],
				fixedlist: config.peerLists.fixedlist
					? config.peerLists.fixedlist.map(peer => ({
							peerId: constructPeerId(peer.ipAddress, peer.wsPort),
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
					  }))
					: [],
				whitelist: config.peerLists.whitelist
					? config.peerLists.whitelist.map(peer => ({
							peerId: constructPeerId(peer.ipAddress, peer.wsPort),
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
					  }))
					: [],
				previouslist: config.peerLists.previouslist
					? config.peerLists.previouslist.map(peer => ({
							...peer,
							peerId: constructPeerId(peer.ipAddress, peer.wsPort),
					  }))
					: [],
			},
			{
				peerId: constructPeerId(
					config.hostIp || DEFAULT_NODE_HOST_IP,
					config.nodeInfo.wsPort,
				),
				ipAddress: config.hostIp || DEFAULT_NODE_HOST_IP,
				wsPort: config.nodeInfo.wsPort,
			},
		);
		this._config = config;
		this._isActive = false;
		this._hasConnected = false;
		this._peerBook = new PeerBook({
			secret: config.secret ? config.secret : DEFAULT_RANDOM_SECRET,
		});
		this._bannedPeers = new Set();
		this._httpServer = http.createServer();
		this._scServer = attach(this._httpServer, {
			wsEngineServerOptions: {
				maxPayload: config.wsMaxPayload
					? config.wsMaxPayload
					: DEFAULT_WS_MAX_PAYLOAD,
			},
		}) as SCServerUpdated;

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolRPC = (request: P2PRequest) => {
			if (request.procedure === REMOTE_EVENT_RPC_GET_PEERS_LIST) {
				this._handleGetPeersRequest(request);
			}
			// Re-emit the request for external use.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolMessage = (message: P2PMessagePacket) => {
			// Re-emit the message for external use.
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};

		this._handleOutboundPeerConnect = (peerInfo: P2PPeerInfo) => {
			try {
				this._peerBook.addPeer(peerInfo);
				// Should be added to newPeer list first and since it is connected so we will upgrade it
				this._peerBook.upgradePeer(peerInfo);
			} catch (error) {
				if (!(error instanceof ExistingPeerError)) {
					throw error;
				}

				const updatedPeerInfo = {
					internalState: error.peerInfo.internalState,
					sharedState: peerInfo.sharedState,
					peerId: peerInfo.peerId,
					ipAddress: peerInfo.ipAddress,
					wsPort: peerInfo.wsPort,
				};
				this._peerBook.upgradePeer(updatedPeerInfo);
			}

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
			if (this._isNetworkReady()) {
				this.emit(EVENT_NETWORK_READY);
			}
		};

		this._handleOutboundPeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			const isWhitelisted = this._sanitizedPeerLists.whitelist.find(
				peer => peer.peerId === peerInfo.peerId,
			);
			if (this._peerBook.getPeer(peerInfo) && !isWhitelisted) {
				this._peerBook.downgradePeer(peerInfo);
			}

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};

		this._handlePeerCloseOutbound = (closePacket: P2PClosePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};

		this._handlePeerCloseInbound = (closePacket: P2PClosePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_INBOUND, closePacket);
		};

		this._handleRemovePeer = (peerId: string) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_REMOVE_PEER, peerId);
		};

		this._handlePeerInfoUpdate = (peerInfo: P2PPeerInfo) => {
			try {
				this._peerBook.addPeer(peerInfo);
				// Since the connection is tried already hence upgrade the peer
				this._peerBook.upgradePeer(peerInfo);
			} catch (error) {
				if (!(error instanceof ExistingPeerError)) {
					throw error;
				}

				const updatedPeerInfo = {
					...error.peerInfo,
					sharedState: peerInfo.sharedState
						? { ...peerInfo.sharedState }
						: error.peerInfo.sharedState,
				};
				const isUpdated = this._peerBook.updatePeer(updatedPeerInfo);
				if (isUpdated) {
					// If found and updated successfully then upgrade the peer
					this._peerBook.upgradePeer(updatedPeerInfo);
				}
			}
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_UPDATED_PEER_INFO, peerInfo);
		};

		this._handleFailedPeerInfoUpdate = (error: Error) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
		};

		this._handleFailedToFetchPeerInfo = (error: Error) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);
		};

		this._handleFailedToFetchPeers = (error: Error) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEERS, error);
		};

		this._handleFailedToCollectPeerDetails = (error: Error) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT, error);
		};

		this._handleBanPeer = (peerId: string) => {
			this._bannedPeers.add(peerId.split(':')[0]);
			const isWhitelisted = this._sanitizedPeerLists.whitelist.find(
				peer => peer.peerId === peerId,
			);

			const bannedPeerInfo = {
				ipAddress: peerId.split(':')[0],
				wsPort: +peerId.split(':')[1],
			};

			if (
				this._peerBook.getPeer({
					ipAddress: bannedPeerInfo.ipAddress,
					wsPort: bannedPeerInfo.wsPort,
					peerId,
				}) &&
				!isWhitelisted
			) {
				this._peerBook.removePeer({
					ipAddress: bannedPeerInfo.ipAddress,
					wsPort: bannedPeerInfo.wsPort,
					peerId,
				});
			}
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_BAN_PEER, peerId);
		};

		this._handleUnbanPeer = (peerId: string) => {
			this._bannedPeers.delete(peerId.split(':')[0]);
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_UNBAN_PEER, peerId);
		};

		// When peer is fetched for status after connection then update the peerinfo in triedPeer list
		this._handleDiscoveredPeer = (detailedPeerInfo: P2PPeerInfo) => {
			// Check blacklist to avoid incoming connections from backlisted ips
			const isBlacklisted = this._sanitizedPeerLists.blacklist.find(
				peer => peer.peerId === detailedPeerInfo.peerId,
			);

			if (!this._peerBook.getPeer(detailedPeerInfo) && !isBlacklisted) {
				try {
					this._peerBook.addPeer(detailedPeerInfo);
					// Re-emit the message to allow it to bubble up the class hierarchy.
					// Only emit event when a peer is discovered for the first time.
					this.emit(EVENT_DISCOVERED_PEER, detailedPeerInfo);
				} catch (error) {
					if (!(error instanceof ExistingPeerError)) {
						throw error;
					}

					// Don't update peerInfo when we already have connection with that peer
					if (!this._peerPool.hasPeer(error.peerInfo.peerId)) {
						const updatedPeerInfo = {
							...detailedPeerInfo,
							sharedState: detailedPeerInfo.sharedState
								? { ...detailedPeerInfo.sharedState }
								: error.peerInfo.sharedState,
						};
						const isUpdated = this._peerBook.updatePeer(updatedPeerInfo);
						if (isUpdated) {
							// If found and updated successfully then upgrade the peer
							this._peerBook.upgradePeer(updatedPeerInfo);
						}
					}
				}
			}
		};

		this._handleFailedToPushNodeInfo = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_PUSH_NODE_INFO, error);
		};

		this._handleFailedToSendMessage = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_SEND_MESSAGE, error);
		};

		this._handleOutboundSocketError = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
		};

		this._handleInboundSocketError = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};

		const peerPoolConfig = createPeerPoolConfig(
			config,
			this._sanitizedPeerLists,
		);
		this._peerPool = new PeerPool(peerPoolConfig);

		this._bindHandlersToPeerPool(this._peerPool);
		// Add peers to tried peers if want to re-use previously tried peers
		if (this._sanitizedPeerLists.previouslist) {
			this._sanitizedPeerLists.previouslist.forEach(peerInfo => {
				try {
					this._peerBook.addPeer(peerInfo);
					this._peerBook.upgradePeer(peerInfo);
				} catch (error) {
					if (!(error instanceof ExistingPeerError)) {
						throw error;
					}

					this._peerBook.upgradePeer(error.peerInfo);
				}
			});
		}

		this._nodeInfo = config.nodeInfo;
		this.applyNodeInfo(this._nodeInfo);

		this._populatorInterval = config.populatorInterval
			? config.populatorInterval
			: DEFAULT_POPULATOR_INTERVAL;

		this._peerHandshakeCheck = config.peerHandshakeCheck
			? config.peerHandshakeCheck
			: validatePeerCompatibility;
	}

	public get config(): P2PConfig {
		return this._config;
	}

	public get isActive(): boolean {
		return this._isActive;
	}

	/**
	 * This is not a declared as a setter because this method will need
	 * invoke an async RPC on Peers to give them our new node status.
	 */
	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = {
			...nodeInfo,
		};
		this._peerPool.applyNodeInfo(this._nodeInfo);
	}

	public get nodeInfo(): P2PNodeInfo {
		return this._nodeInfo;
	}

	public applyPenalty(peerPenalty: P2PPenalty): void {
		if (!this._isTrustedPeer(peerPenalty.peerId)) {
			this._peerPool.applyPenalty(peerPenalty);
		}
	}
	// Make sure you always share shared peer state to a user
	public getConnectedPeers(): ReadonlyArray<ProtocolPeerInfo> {
		// Only share the shared state to the user
		return this._peerPool.getAllConnectedPeerInfos().map(peer => ({
			...peer.sharedState,
			ipAddress: peer.ipAddress,
			wsPort: peer.wsPort,
			peerId: peer.peerId,
		}));
	}
	// Make sure you always share shared peer state to a user
	public getUniqueOutboundConnectedPeers(): ReadonlyArray<ProtocolPeerInfo> {
		// Only share the shared state to the user
		return this._peerPool.getUniqueOutboundConnectedPeers().map(peer => ({
			...peer.sharedState,
			ipAddress: peer.ipAddress,
			wsPort: peer.wsPort,
			peerId: peer.peerId,
		}));
	}
	// Make sure you always share shared peer state to a user
	public getDisconnectedPeers(): ReadonlyArray<ProtocolPeerInfo> {
		const allPeers = this._peerBook.allPeers;
		const connectedPeers = this.getConnectedPeers();
		const disconnectedPeers = allPeers.filter(peer => {
			if (
				connectedPeers.find(
					connectedPeer => peer.peerId === connectedPeer.peerId,
				)
			) {
				return false;
			}

			return true;
		});

		// Only share the shared state to the user
		return disconnectedPeers.map(peer => ({
			...peer.sharedState,
			ipAddress: peer.ipAddress,
			wsPort: peer.wsPort,
			peerId: peer.peerId,
		}));
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		const response = await this._peerPool.request(packet);

		return response;
	}

	public send(message: P2PMessagePacket): void {
		this._peerPool.send(message);
	}

	public async requestFromPeer(
		packet: P2PRequestPacket,
		peerId: string,
	): Promise<P2PResponsePacket> {
		return this._peerPool.requestFromPeer(packet, peerId);
	}

	public sendToPeer(message: P2PMessagePacket, peerId: string): void {
		this._peerPool.sendToPeer(message, peerId);
	}

	private _disconnectSocketDueToFailedHandshake(
		socket: SCServerSocket,
		statusCode: number,
		closeReason: string,
	): void {
		socket.disconnect(statusCode, closeReason);
		this.emit(
			EVENT_FAILED_TO_ADD_INBOUND_PEER,
			new PeerInboundHandshakeError(
				closeReason,
				statusCode,
				socket.remoteAddress,
				socket.request.url,
			),
		);
	}

	private async _startPeerServer(): Promise<void> {
		this._scServer.on(
			'connection',
			(socket: SCServerSocket): void => {
				// Check blacklist to avoid incoming connections from backlisted ips
				if (this._sanitizedPeerLists.blacklist) {
					const blacklist = this._sanitizedPeerLists.blacklist.map(
						peer => peer.ipAddress,
					);
					if (blacklist.includes(socket.remoteAddress)) {
						this._disconnectSocketDueToFailedHandshake(
							socket,
							FORBIDDEN_CONNECTION,
							FORBIDDEN_CONNECTION_REASON,
						);

						return;
					}
				}

				if (!socket.request.url) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						INVALID_CONNECTION_URL_CODE,
						INVALID_CONNECTION_URL_REASON,
					);

					return;
				}
				const queryObject = url.parse(socket.request.url, true).query;

				if (queryObject.nonce === this._nodeInfo.nonce) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						INVALID_CONNECTION_SELF_CODE,
						INVALID_CONNECTION_SELF_REASON,
					);

					const selfWSPort = queryObject.wsPort
						? +queryObject.wsPort
						: this._nodeInfo.wsPort;

					// Delete you peerinfo from both the lists
					this._peerBook.removePeer({
						peerId: constructPeerId(socket.remoteAddress, selfWSPort),
						ipAddress: socket.remoteAddress,
						wsPort: selfWSPort,
					});

					return;
				}

				if (
					typeof queryObject.wsPort !== 'string' ||
					typeof queryObject.version !== 'string' ||
					typeof queryObject.nethash !== 'string'
				) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						INVALID_CONNECTION_QUERY_CODE,
						INVALID_CONNECTION_QUERY_REASON,
					);

					return;
				}

				const remoteWSPort: number = parseInt(
					queryObject.wsPort,
					BASE_10_RADIX,
				);
				const peerId = constructPeerId(socket.remoteAddress, remoteWSPort);

				// tslint:disable-next-line no-let
				let queryOptions;

				try {
					queryOptions =
						typeof queryObject.options === 'string'
							? JSON.parse(queryObject.options)
							: undefined;
				} catch (error) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						INVALID_CONNECTION_QUERY_CODE,
						INVALID_CONNECTION_QUERY_REASON,
					);

					return;
				}

				if (this._bannedPeers.has(socket.remoteAddress)) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						FORBIDDEN_CONNECTION,
						FORBIDDEN_CONNECTION_REASON,
					);

					return;
				}

				// Remove these wsPort and ip from the query object
				const { wsPort, ip, ...restOfQueryObject } = queryObject;
				const incomingPeerInfo: P2PPeerInfo = {
					sharedState: {
						...restOfQueryObject,
						...queryOptions,
						height: queryObject.height ? +queryObject.height : 0,
						version: queryObject.version,
					},
					peerId: constructPeerId(socket.remoteAddress, remoteWSPort),
					ipAddress: socket.remoteAddress,
					wsPort: remoteWSPort,
				};

				const { success, errors } = this._peerHandshakeCheck(
					incomingPeerInfo,
					this._nodeInfo,
				);

				if (!success) {
					const incompatibilityReason =
						errors && Array.isArray(errors)
							? errors.join(',')
							: INCOMPATIBLE_PEER_UNKNOWN_REASON;

					this._disconnectSocketDueToFailedHandshake(
						socket,
						INCOMPATIBLE_PEER_CODE,
						incompatibilityReason,
					);

					return;
				}

				const existingPeer = this._peerPool.getPeer(peerId);

				if (existingPeer) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						DUPLICATE_CONNECTION,
						DUPLICATE_CONNECTION_REASON,
					);
				} else {
					this._peerPool.addInboundPeer(incomingPeerInfo, socket);
					this.emit(EVENT_NEW_INBOUND_PEER, incomingPeerInfo);
				}

				try {
					this._peerBook.addPeer(incomingPeerInfo);
				} catch (error) {
					if (!(error instanceof ExistingPeerError)) {
						throw error;
					}
				}
			},
		);

		this._httpServer.listen(
			this._nodeInfo.wsPort,
			this._config.hostIp || DEFAULT_NODE_HOST_IP,
		);
		if (this._scServer.isReady) {
			this._isActive = true;

			return;
		}

		return new Promise<void>(resolve => {
			this._scServer.once('ready', () => {
				this._isActive = true;
				resolve();
			});
		});
	}

	private async _stopHTTPServer(): Promise<void> {
		return new Promise<void>(resolve => {
			this._httpServer.close(() => {
				resolve();
			});
		});
	}

	private async _stopWSServer(): Promise<void> {
		return new Promise<void>(resolve => {
			this._scServer.close(() => {
				resolve();
			});
		});
	}

	private async _stopPeerServer(): Promise<void> {
		await this._stopWSServer();
		await this._stopHTTPServer();
	}

	private _startPopulator(): void {
		if (this._populatorIntervalId) {
			throw new Error('Populator is already running');
		}
		this._populatorIntervalId = setInterval(() => {
			this._peerPool.triggerNewConnections(
				this._peerBook.newPeers,
				this._peerBook.triedPeers,
				this._sanitizedPeerLists.fixedlist || [],
			);
		}, this._populatorInterval);
		this._peerPool.triggerNewConnections(
			this._peerBook.newPeers,
			this._peerBook.triedPeers,
			this._sanitizedPeerLists.fixedlist || [],
		);
	}

	private _stopPopulator(): void {
		if (this._populatorIntervalId) {
			clearInterval(this._populatorIntervalId);
		}
	}

	private _isNetworkReady(): boolean {
		if (!this._hasConnected && this._peerPool.getConnectedPeers().length > 0) {
			this._hasConnected = true;

			return true;
		}

		return false;
	}

	private _handleGetPeersRequest(request: P2PRequest): void {
		const minimumPeerDiscoveryThreshold = this._config
			.minimumPeerDiscoveryThreshold
			? this._config.minimumPeerDiscoveryThreshold
			: DEFAULT_MIN_PEER_DISCOVERY_THRESHOLD;
		const peerDiscoveryResponseLength = this._config.peerDiscoveryResponseLength
			? this._config.peerDiscoveryResponseLength
			: DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH;

		const knownPeers = this._peerBook.allPeers;
		/* tslint:disable no-magic-numbers*/
		const min = Math.ceil(
			Math.min(peerDiscoveryResponseLength, knownPeers.length * 0.25),
		);
		const max = Math.floor(
			Math.min(peerDiscoveryResponseLength, knownPeers.length * 0.5),
		);
		const random = Math.floor(Math.random() * (max - min + 1) + min);
		const randomPeerCount = Math.max(
			random,
			Math.min(minimumPeerDiscoveryThreshold, knownPeers.length),
		);

		const selectedPeers = shuffle(knownPeers)
			.slice(0, randomPeerCount)
			.map(
				sanitizeOutgoingPeerInfo, // Sanitize the peerInfos before responding to a peer that understand old peerInfo.
			);

		const peerInfoList = {
			success: true,
			peers: selectedPeers,
		};
		request.end(peerInfoList);
	}

	private _isTrustedPeer(peerId: string): boolean {
		const isSeed = this._sanitizedPeerLists.seeds.find(
			seedPeer => peerId === seedPeer.peerId,
		);

		const isWhitelisted = this._sanitizedPeerLists.whitelist.find(
			peer => peer.peerId === peerId,
		);

		const isFixed = this._sanitizedPeerLists.fixedlist.find(
			peer => peer.peerId === peerId,
		);

		return !!isSeed || !!isWhitelisted || !!isFixed;
	}

	public async start(): Promise<void> {
		if (this._isActive) {
			throw new Error('Cannot start the node because it is already active');
		}

		const newPeersToAdd = this._sanitizedPeerLists.seeds.concat(
			this._sanitizedPeerLists.whitelist,
		);
		newPeersToAdd.forEach(newPeerInfo => {
			try {
				this._peerBook.addPeer(newPeerInfo);
			} catch (error) {
				if (!(error instanceof ExistingPeerError)) {
					throw error;
				}
			}
		});

		// According to LIP, add whitelist peers to triedPeer by upgrading them initially.
		this._sanitizedPeerLists.whitelist.forEach(whitelistPeer =>
			this._peerBook.upgradePeer(whitelistPeer),
		);
		await this._startPeerServer();

		// We need this check this._isActive in case the P2P library is shut down while it was in the middle of starting up.
		if (this._isActive) {
			this._startPopulator();
		}
	}

	public async stop(): Promise<void> {
		if (!this._isActive) {
			throw new Error('Cannot stop the node because it is not active');
		}
		this._isActive = false;
		this._hasConnected = false;
		this._stopPopulator();
		this._peerPool.removeAllPeers();
		await this._stopPeerServer();
	}

	private _bindHandlersToPeerPool(peerPool: PeerPool): void {
		peerPool.on(EVENT_REQUEST_RECEIVED, this._handlePeerPoolRPC);
		peerPool.on(EVENT_MESSAGE_RECEIVED, this._handlePeerPoolMessage);
		peerPool.on(EVENT_CONNECT_OUTBOUND, this._handleOutboundPeerConnect);
		peerPool.on(
			EVENT_CONNECT_ABORT_OUTBOUND,
			this._handleOutboundPeerConnectAbort,
		);
		peerPool.on(EVENT_CLOSE_INBOUND, this._handlePeerCloseInbound);
		peerPool.on(EVENT_CLOSE_OUTBOUND, this._handlePeerCloseOutbound);
		peerPool.on(EVENT_REMOVE_PEER, this._handleRemovePeer);
		peerPool.on(EVENT_UPDATED_PEER_INFO, this._handlePeerInfoUpdate);
		peerPool.on(
			EVENT_FAILED_PEER_INFO_UPDATE,
			this._handleFailedPeerInfoUpdate,
		);
		peerPool.on(
			EVENT_FAILED_TO_FETCH_PEER_INFO,
			this._handleFailedToFetchPeerInfo,
		);
		peerPool.on(EVENT_FAILED_TO_FETCH_PEERS, this._handleFailedToFetchPeers);
		peerPool.on(
			EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
			this._handleFailedToCollectPeerDetails,
		);
		peerPool.on(EVENT_DISCOVERED_PEER, this._handleDiscoveredPeer);
		peerPool.on(
			EVENT_FAILED_TO_PUSH_NODE_INFO,
			this._handleFailedToPushNodeInfo,
		);
		peerPool.on(EVENT_FAILED_TO_SEND_MESSAGE, this._handleFailedToSendMessage);
		peerPool.on(EVENT_OUTBOUND_SOCKET_ERROR, this._handleOutboundSocketError);
		peerPool.on(EVENT_INBOUND_SOCKET_ERROR, this._handleInboundSocketError);
		peerPool.on(EVENT_BAN_PEER, this._handleBanPeer);
		peerPool.on(EVENT_UNBAN_PEER, this._handleUnbanPeer);
	}
	// tslint:disable-next-line:max-file-line-count
}
