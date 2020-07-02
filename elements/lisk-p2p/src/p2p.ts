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
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { EventEmitter } from 'events';
import { codec } from '@liskhq/lisk-codec';

import {
	DEFAULT_BAN_TIME,
	DEFAULT_FALLBACK_SEED_PEER_DISCOVERY_INTERVAL,
	DEFAULT_MAX_INBOUND_CONNECTIONS,
	DEFAULT_MAX_OUTBOUND_CONNECTIONS,
	DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	DEFAULT_MIN_PEER_DISCOVERY_THRESHOLD,
	DEFAULT_MIN_TRIED_PEER_COUNT,
	DEFAULT_NODE_HOST_IP,
	DEFAULT_NONCE_LENGTH_BYTES,
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
	INCOMPATIBLE_PEER_CODE,
	INCOMPATIBLE_PEER_UNKNOWN_REASON,
} from './constants';
import { PeerInboundDuplicateConnectionError } from './errors';
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
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_FAILED_TO_SEND_MESSAGE,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_NETWORK_READY,
	EVENT_NEW_INBOUND_PEER,
	EVENT_NEW_INBOUND_PEER_CONNECTION,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REMOVE_PEER,
	EVENT_REQUEST_RECEIVED,
	EVENT_UPDATED_PEER_INFO,
	REMOTE_EVENT_RPC_GET_NODE_INFO,
	REMOTE_EVENT_RPC_GET_PEERS_LIST,
	REMOTE_EVENT_POST_NODE_INFO,
} from './events';
import { P2PRequest } from './p2p_request';
import { PeerBook } from './peer_book';
import { PeerPool, PeerPoolConfig } from './peer_pool';
import { PeerServer } from './peer_server';
import {
	IncomingPeerConnection,
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
	RPCSchemas,
} from './types';
import {
	assignInternalInfo,
	constructPeerId,
	getByteSize,
	sanitizeInitialPeerInfo,
	sanitizePeerLists,
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
	validateNodeInfo,
	validatePeerCompatibility,
} from './utils';
import {
	peerInfoSchema,
	nodeInfoSchema,
	mergeCustomSchema,
	defaultRPCSchemas,
} from './schema';

const createRPCSchemas = (customRPCSchemas: RPCSchemas): RPCSchemas => ({
	peerInfo: mergeCustomSchema(peerInfoSchema, customRPCSchemas.peerInfo),
	nodeInfo: mergeCustomSchema(nodeInfoSchema, customRPCSchemas.nodeInfo),
});

const createPeerPoolConfig = (
	config: P2PConfig,
	peerBook: PeerBook,
): PeerPoolConfig => ({
	hostPort: config.port,
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
	peerBook,
	rpcSchemas: config.customRPCSchemas
		? createRPCSchemas(config.customRPCSchemas)
		: defaultRPCSchemas,
});

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _sanitizedPeerLists: PeerLists;
	private _isActive: boolean;
	private _hasConnected: boolean;
	private readonly _peerBook: PeerBook;
	private readonly _populatorInterval: number;
	private _nextSeedPeerDiscovery: number;
	private readonly _fallbackSeedPeerDiscoveryInterval: number;
	private _populatorIntervalId: NodeJS.Timer | undefined;
	private _nodeInfo: P2PNodeInfo;
	private readonly _peerPool: PeerPool;
	private readonly _secret: number;
	private readonly _rpcSchemas: RPCSchemas;
	private _peerServer?: PeerServer;

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
	private readonly _handleInboundPeerConnect: (
		incomingPeerConnection: IncomingPeerConnection,
	) => void;
	private readonly _handleRemovePeer: (peerId: string) => void;
	private readonly _handlePeerInfoUpdate: (peerInfo: P2PPeerInfo) => void;
	private readonly _handleFailedToFetchPeerInfo: (error: Error) => void;
	private readonly _handleFailedToFetchPeers: (error: Error) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private readonly _handleFailedToCollectPeerDetails: (error: Error) => void;
	private readonly _handleBanPeer: (peerId: string) => void;
	private readonly _handleOutboundSocketError: (error: Error) => void;
	private readonly _handleInboundSocketError: (error: Error) => void;
	private readonly _handleFailedInboundPeerConnect: (error: Error) => void;

	public constructor(config: P2PConfig) {
		super();
		this._secret = config.secret ? config.secret : DEFAULT_RANDOM_SECRET;
		this._sanitizedPeerLists = sanitizePeerLists(
			{
				seedPeers: config.seedPeers
					? config.seedPeers.map(sanitizeInitialPeerInfo)
					: [],
				blacklistedIPs: config.blacklistedIPs ? config.blacklistedIPs : [],
				fixedPeers: config.fixedPeers
					? config.fixedPeers.map(sanitizeInitialPeerInfo)
					: [],
				whitelisted: config.whitelistedPeers
					? config.whitelistedPeers.map(sanitizeInitialPeerInfo)
					: [],
				previousPeers: config.previousPeers
					? config.previousPeers.map(sanitizeInitialPeerInfo)
					: [],
			},
			{
				peerId: constructPeerId(
					config.hostIp ?? DEFAULT_NODE_HOST_IP,
					config.port,
				),
				ipAddress: config.hostIp ?? DEFAULT_NODE_HOST_IP,
				port: config.port,
			},
			this._secret,
		);

		this._config = config;
		this._isActive = false;
		this._hasConnected = false;
		this._peerBook = new PeerBook({
			sanitizedPeerLists: this._sanitizedPeerLists,
			secret: this._secret,
		});
		this._rpcSchemas = config.customRPCSchemas
			? createRPCSchemas(config.customRPCSchemas)
			: defaultRPCSchemas;
		codec.addSchema(this._rpcSchemas.peerInfo);
		codec.addSchema(this._rpcSchemas.nodeInfo);

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolRPC = (request: P2PRequest): void => {
			// Process protocol messages
			switch (request.procedure) {
				case REMOTE_EVENT_RPC_GET_PEERS_LIST:
					this._handleGetPeersRequest(request);
					break;
				case REMOTE_EVENT_RPC_GET_NODE_INFO:
					this._handleGetNodeInfo(request);
					break;
				default:
			}

			// Re-emit the request for external use.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolMessage = (message: P2PMessagePacket): void => {
			// Re-emit the message for external use.
			if (message.event === REMOTE_EVENT_POST_NODE_INFO) {
				const decodedNodeInfo = codec.decode(
					nodeInfoSchema,
					Buffer.from(message.data as string, 'base64'),
				);

				this.emit(EVENT_MESSAGE_RECEIVED, {
					event: message.event,
					peerId: message.peerId,
					data: decodedNodeInfo,
				});

				return;
			}
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};

		this._handleOutboundPeerConnect = (peerInfo: P2PPeerInfo): void => {
			if (!this._peerBook.hasPeer(peerInfo)) {
				this._peerBook.addPeer(peerInfo);
			}

			this._peerBook.upgradePeer(peerInfo);

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
			if (this._isNetworkReady()) {
				this.emit(EVENT_NETWORK_READY);
			}
		};

		this._handleOutboundPeerConnectAbort = (peerInfo: P2PPeerInfo): void => {
			if (this._peerBook.hasPeer(peerInfo)) {
				this._peerBook.downgradePeer(peerInfo);
			}

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};

		this._handlePeerCloseOutbound = (closePacket: P2PClosePacket): void => {
			const { peerInfo } = closePacket;
			// Update connection kind when closing connection
			if (this._peerBook.getPeer(closePacket.peerInfo)) {
				const updatedPeer = {
					...peerInfo,
					internalState: assignInternalInfo(peerInfo, this._secret),
				};

				this._peerBook.updatePeer(updatedPeer);
			}
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};

		this._handlePeerCloseInbound = (closePacket: P2PClosePacket): void => {
			const { peerInfo } = closePacket;
			// Update connection kind when closing connection
			if (this._peerBook.getPeer(closePacket.peerInfo)) {
				const updatedPeer = {
					...peerInfo,
					internalState: assignInternalInfo(peerInfo, this._secret),
				};

				this._peerBook.updatePeer(updatedPeer);
			}
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_INBOUND, closePacket);
		};

		this._handleFailedInboundPeerConnect = (err: Error): void => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER, err);
		};

		this._handleInboundPeerConnect = (
			incomingPeerConnection: IncomingPeerConnection,
		): void => {
			try {
				this._peerPool.addInboundPeer(
					incomingPeerConnection.peerInfo,
					incomingPeerConnection.socket,
				);

				if (!this._peerBook.hasPeer(incomingPeerConnection.peerInfo)) {
					this._peerBook.addPeer({
						...incomingPeerConnection.peerInfo,
						sourceAddress: incomingPeerConnection.socket.remoteAddress,
					});
				}

				// Re-emit the message to allow it to bubble up the class hierarchy.
				this.emit(EVENT_NEW_INBOUND_PEER, incomingPeerConnection.peerInfo);

				return;
			} catch (err) {
				if (err instanceof PeerInboundDuplicateConnectionError) {
					incomingPeerConnection.socket.disconnect(
						DUPLICATE_CONNECTION,
						DUPLICATE_CONNECTION_REASON,
					);
					// Re-emit the message to allow it to bubble up the class hierarchy.
					this.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER, err);

					return;
				}
				incomingPeerConnection.socket.disconnect(
					INCOMPATIBLE_PEER_CODE,
					INCOMPATIBLE_PEER_UNKNOWN_REASON,
				);

				// Re-emit the message to allow it to bubble up the class hierarchy.
				this.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER, err);
			}
		};

		this._handleRemovePeer = (peerId: string): void => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_REMOVE_PEER, peerId);
		};

		this._handlePeerInfoUpdate = (peerInfo: P2PPeerInfo): void => {
			if (!this._peerBook.hasPeer(peerInfo)) {
				this._peerBook.addPeer(peerInfo);
			}

			const isUpdated = this._peerBook.updatePeer(peerInfo);
			if (isUpdated) {
				// If found and updated successfully then upgrade the peer
				this._peerBook.upgradePeer(peerInfo);
				// Re-emit the message to allow it to bubble up the class hierarchy.
				this.emit(EVENT_UPDATED_PEER_INFO, peerInfo);
			}
		};

		this._handleFailedPeerInfoUpdate = (error: Error): void => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
		};

		this._handleFailedToFetchPeerInfo = (error: Error): void => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);
		};

		this._handleFailedToFetchPeers = (error: Error): void => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEERS, error);
		};

		this._handleFailedToCollectPeerDetails = (error: Error): void => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT, error);
		};

		this._handleBanPeer = (peerId: string): void => {
			const banTime = this._config.peerBanTime ?? DEFAULT_BAN_TIME;

			if (this._peerPool.hasPeer(peerId)) {
				this._peerPool.removePeer(peerId);
			}

			this._peerBook.addBannedPeer(peerId, banTime);

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_BAN_PEER, peerId);
		};

		// When peer is fetched for peerList add them into the update the peerBook
		this._handleDiscoveredPeer = (detailedPeerInfo: P2PPeerInfo): void => {
			if (this._peerBook.hasPeer(detailedPeerInfo)) {
				return;
			}

			if (this._peerBook.addPeer(detailedPeerInfo)) {
				// Re-emit the message to allow it to bubble up the class hierarchy.
				// Only emit event when a peer is discovered for the first time.
				this.emit(EVENT_DISCOVERED_PEER, detailedPeerInfo);
			}
		};

		this._handleFailedToPushNodeInfo = (error: Error): void => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_PUSH_NODE_INFO, error);
		};

		this._handleFailedToSendMessage = (error: Error): void => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_SEND_MESSAGE, error);
		};

		this._handleOutboundSocketError = (error: Error): void => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
		};

		this._handleInboundSocketError = (error: Error): void => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};

		const peerPoolConfig = createPeerPoolConfig(config, this._peerBook);
		this._peerPool = new PeerPool(peerPoolConfig);

		this._bindHandlersToPeerPool(this._peerPool);

		this._nodeInfo = {
			...config.nodeInfo,
			nonce: getRandomBytes(DEFAULT_NONCE_LENGTH_BYTES).toString('hex'),
		};
		this.applyNodeInfo(this._nodeInfo);

		this._populatorInterval = config.populatorInterval
			? config.populatorInterval
			: DEFAULT_POPULATOR_INTERVAL;

		this._fallbackSeedPeerDiscoveryInterval = config.fallbackSeedPeerDiscoveryInterval
			? config.fallbackSeedPeerDiscoveryInterval
			: DEFAULT_FALLBACK_SEED_PEER_DISCOVERY_INTERVAL;

		this._nextSeedPeerDiscovery =
			Date.now() + this._fallbackSeedPeerDiscoveryInterval;
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
		validateNodeInfo(
			nodeInfo,
			this._config.maxPeerInfoSize
				? this._config.maxPeerInfoSize
				: DEFAULT_MAX_PEER_INFO_SIZE,
		);

		this._nodeInfo = {
			...nodeInfo,
			nonce: this.nodeInfo.nonce,
		};

		this._peerPool.applyNodeInfo(this._nodeInfo);
	}

	public get nodeInfo(): P2PNodeInfo {
		return this._nodeInfo;
	}

	public applyPenalty(peerPenalty: P2PPenalty): void {
		this._peerPool.applyPenalty(peerPenalty);
	}

	public getTriedPeers(): ReadonlyArray<ProtocolPeerInfo> {
		return this._peerBook.triedPeers.map(peer => ({
			...peer.sharedState,
			ipAddress: peer.ipAddress,
			port: peer.port,
		}));
	}

	// Make sure you always share shared peer state to a user
	public getConnectedPeers(): ReadonlyArray<ProtocolPeerInfo> {
		// Only share the shared state to the user
		return this._peerPool
			.getAllConnectedPeerInfos()
			.filter(
				peer => !(peer.internalState && !peer.internalState.advertiseAddress),
			)
			.map(peer => ({
				...peer.sharedState,
				ipAddress: peer.ipAddress,
				port: peer.port,
				peerId: peer.peerId,
			}));
	}

	// Make sure you always share shared peer state to a user
	public getDisconnectedPeers(): ReadonlyArray<ProtocolPeerInfo> {
		const { allPeers } = this._peerBook;
		const connectedPeers = this.getConnectedPeers();
		const disconnectedPeers = allPeers.filter(peer => {
			if (
				connectedPeers.find(
					connectedPeer =>
						peer.ipAddress === connectedPeer.ipAddress &&
						peer.port === connectedPeer.port,
				)
			) {
				return false;
			}

			return true;
		});

		// Only share the shared state to the user and remove private peers
		return disconnectedPeers
			.filter(
				peer => !(peer.internalState && !peer.internalState.advertiseAddress),
			)
			.map(peer => ({
				...peer.sharedState,
				ipAddress: peer.ipAddress,
				port: peer.port,
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

	public broadcast(message: P2PMessagePacket): void {
		this._peerPool.broadcast(message);
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

	public async start(): Promise<void> {
		if (this._isActive) {
			throw new Error('Node cannot start because it is already active.');
		}

		if (this._config.maxInboundConnections !== 0) {
			this._peerServer = new PeerServer({
				port: this.config.port,
				nodeInfo: this._nodeInfo,
				hostIp: this._config.hostIp ?? DEFAULT_NODE_HOST_IP,
				secret: this._secret,
				peerBook: this._peerBook,
				maxPayload: this._config.wsMaxPayload
					? this._config.wsMaxPayload
					: DEFAULT_WS_MAX_PAYLOAD,
				maxPeerInfoSize: this._config.maxPeerInfoSize
					? this._config.maxPeerInfoSize
					: DEFAULT_MAX_PEER_INFO_SIZE,
				peerHandshakeCheck: this._config.peerHandshakeCheck
					? this._config.peerHandshakeCheck
					: validatePeerCompatibility,
			});
			this._bindHandlersToPeerServer(this._peerServer);

			try {
				await this._peerServer.start();
			} catch (err) {
				this._isActive = false;
				throw new Error('Peer server did not start successfully');
			}
		}
		// This is set to true when peer sever started successfully or when number of inbound connections is zero
		this._isActive = true;
		// We need this check this._isActive in case the P2P library is shut down while it was in the middle of starting up.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this._isActive) {
			// Initial discovery and disconnect from SeedPeers (LIP-0004)
			if (this._peerBook.triedPeers.length < DEFAULT_MIN_TRIED_PEER_COUNT) {
				this._peerPool.discoverFromSeedPeers();
				this._nextSeedPeerDiscovery =
					Date.now() + this._fallbackSeedPeerDiscoveryInterval;
			}

			this._startPopulator();
		}
	}

	public async stop(): Promise<void> {
		if (!this._isActive) {
			throw new Error('Node cannot be stopped because it is not active.');
		}
		this._isActive = false;
		this._hasConnected = false;
		this._stopPopulator();
		this._peerPool.removeAllPeers();
		this._peerBook.cleanUpTimers();

		if (this._peerServer) {
			await this._peerServer.stop();
			this._removeListeners(this._peerServer);
		}

		this._removeListeners(this._peerPool);
	}

	private _handleGetNodeInfo(request: P2PRequest): void {
		const encodedNodeInfo = codec
			.encode(this._rpcSchemas.nodeInfo, this._nodeInfo)
			.toString('base64');
		request.end(encodedNodeInfo);
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
	}

	private _bindHandlersToPeerServer(peerServer: PeerServer): void {
		peerServer.on(EVENT_BAN_PEER, this._handleBanPeer);
		peerServer.on(EVENT_INBOUND_SOCKET_ERROR, this._handleInboundSocketError);
		peerServer.on(
			EVENT_FAILED_TO_ADD_INBOUND_PEER,
			this._handleFailedInboundPeerConnect,
		);
		peerServer.on(
			EVENT_NEW_INBOUND_PEER_CONNECTION,
			this._handleInboundPeerConnect,
		);
	}

	private _startPopulator(): void {
		if (this._populatorIntervalId) {
			throw new Error('Populator is already running');
		}
		this._populatorIntervalId = setInterval(() => {
			this._peerPool.triggerNewConnections(
				this._peerBook.newPeers,
				this._peerBook.triedPeers,
			);

			// LIP-0004 re-discovery SeedPeers when Outboundconnection < maxOutboundconnections
			if (
				this._nextSeedPeerDiscovery < Date.now() &&
				this._peerPool.getFreeOutboundSlots() > 0
			) {
				this._peerPool.discoverFromSeedPeers();
				this._nextSeedPeerDiscovery =
					Date.now() + this._fallbackSeedPeerDiscoveryInterval;
			}
		}, this._populatorInterval);

		// Initial Populator
		this._peerPool.triggerNewConnections(
			this._peerBook.newPeers,
			this._peerBook.triedPeers,
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
		const maxPeerDiscoveryResponseLength = this._config
			.maxPeerDiscoveryResponseLength
			? this._config.maxPeerDiscoveryResponseLength
			: DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH;
		const wsMaxPayload = this._config.wsMaxPayload
			? this._config.wsMaxPayload
			: DEFAULT_WS_MAX_PAYLOAD;
		const maxPeerInfoSize = this._config.maxPeerInfoSize
			? this._config.maxPeerInfoSize
			: DEFAULT_MAX_PEER_INFO_SIZE;

		const safeMaxPeerInfoLength =
			Math.floor(DEFAULT_WS_MAX_PAYLOAD / maxPeerInfoSize) - 1;

		const selectedPeers = this._peerBook.getRandomizedPeerList(
			minimumPeerDiscoveryThreshold,
			maxPeerDiscoveryResponseLength,
		);

		// Remove internal state to check byte size
		const sanitizedPeerInfoList: ProtocolPeerInfo[] = selectedPeers
			.filter(
				peer => !(peer.internalState && !peer.internalState.advertiseAddress),
			)
			.map(peer => ({
				ipAddress: peer.ipAddress,
				port: peer.port,
				...peer.sharedState,
			}));

		const encodedPeersList = sanitizedPeerInfoList.map(peer =>
			codec.encode(this._rpcSchemas.peerInfo, peer).toString('base64'),
		);
		const validatedPeerList =
			getByteSize(encodedPeersList) < wsMaxPayload
				? encodedPeersList
				: encodedPeersList.slice(0, safeMaxPeerInfoLength);

		const response = {
			success: true,
			peers: validatedPeerList,
		};

		request.end(response);
	}

	// eslint-disable-next-line class-methods-use-this
	private _removeListeners(emitter: PeerServer | PeerPool): void {
		emitter.eventNames().forEach((eventName: string | symbol) => {
			emitter.removeAllListeners(eventName);
		});
	}
}
