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

import { EventEmitter } from 'events';
import * as http from 'http';
import { attach, SCServer, SCServerSocket } from 'socketcluster-server';
import * as url from 'url';

interface SCServerUpdated extends SCServer {
	readonly isReady: boolean;
}

import { constructPeerId, constructPeerIdFromPeerInfo } from './peer';

import {
	INCOMPATIBLE_NETWORK_CODE,
	INCOMPATIBLE_NETWORK_REASON,
	INVALID_CONNECTION_QUERY_CODE,
	INVALID_CONNECTION_QUERY_REASON,
	INVALID_CONNECTION_URL_CODE,
	INVALID_CONNECTION_URL_REASON,
} from './disconnect_status_codes';

import { PeerInboundHandshakeError } from './errors';

import {
	P2PClosePacket,
	P2PConfig,
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNetworkStatus,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';

import { P2PRequest } from './p2p_request';
export { P2PRequest };
import { selectForConnection, selectPeers } from './peer_selection';

import {
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_REQUEST_RECEIVED,
	EVENT_UPDATED_PEER_INFO,
	PeerPool,
} from './peer_pool';

export {
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_PEER_INFO_UPDATE,
};

export const EVENT_NEW_INBOUND_PEER = 'newInboundPeer';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'failedToAddInboundPeer';
export const EVENT_NEW_PEER = 'newPeer';

export const NODE_HOST_IP = '0.0.0.0';
export const DEFAULT_DISCOVERY_INTERVAL = 30000;

const BASE_10_RADIX = 10;

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _httpServer: http.Server;
	private _isActive: boolean;
	private readonly _newPeers: Map<string, P2PDiscoveredPeerInfo>;
	private readonly _triedPeers: Map<string, P2PDiscoveredPeerInfo>;
	private readonly _discoveryInterval: number;
	private _discoveryIntervalId: NodeJS.Timer | undefined;

	private _nodeInfo: P2PNodeInfo;
	private readonly _peerPool: PeerPool;
	private readonly _scServer: SCServerUpdated;

	private readonly _handlePeerPoolRPC: (request: P2PRequest) => void;
	private readonly _handlePeerPoolMessage: (message: P2PMessagePacket) => void;
	private readonly _handleDiscoveredPeer: (
		discoveredPeerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleFailedToPushNodeInfo: (error: Error) => void;
	private readonly _handleFailedToFetchPeerInfo: (error: Error) => void;
	private readonly _handlePeerConnect: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handlePeerConnectAbort: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handlePeerClose: (closePacket: P2PClosePacket) => void;
	private readonly _handlePeerInfoUpdate: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleFailedPeerInfoUpdate: (error: Error) => void;
	private readonly _handleOutboundSocketError: (error: Error) => void;
	private readonly _handleInboundSocketError: (error: Error) => void;

	public constructor(config: P2PConfig) {
		super();
		this._config = config;
		this._isActive = false;
		this._newPeers = new Map();
		this._triedPeers = new Map();

		this._httpServer = http.createServer();
		this._scServer = attach(this._httpServer) as SCServerUpdated;

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolRPC = (request: P2PRequest) => {
			// Re-emit the request for external use.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handlePeerPoolMessage = (message: P2PMessagePacket) => {
			// Re-emit the message for external use.
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};

		this._handlePeerConnect = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
		};

		this._handlePeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (this._triedPeers.has(peerId)) {
				this._triedPeers.delete(peerId);
			}
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};

		this._handlePeerClose = (closePacket: P2PClosePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};

		this._handlePeerInfoUpdate = (peerInfo: P2PPeerInfo) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_UPDATED_PEER_INFO, peerInfo);
		};

		this._handleFailedPeerInfoUpdate = (error: Error) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
		};

		this._handleDiscoveredPeer = (detailedPeerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(detailedPeerInfo);
			if (!this._triedPeers.has(peerId)) {
				if (this._newPeers.has(peerId)) {
					this._newPeers.delete(peerId);
				}
				this._triedPeers.set(peerId, detailedPeerInfo);
			}
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_DISCOVERED_PEER, detailedPeerInfo);
		};

		this._handleFailedToPushNodeInfo = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_PUSH_NODE_INFO, error);
		};

		this._handleFailedToFetchPeerInfo = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);
		};

		this._handleOutboundSocketError = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
		};

		this._handleInboundSocketError = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};

		this._peerPool = new PeerPool({
			connectTimeout: this._config.connectTimeout,
			ackTimeout: this._config.ackTimeout,
			peerSelectionForSendRequest: config.peerSelectionForSendRequest
				? config.peerSelectionForSendRequest
				: selectPeers,
			peerSelectionForConnection: config.peerSelectionForConnection
				? config.peerSelectionForConnection
				: selectForConnection,
		});

		this._bindHandlersToPeerPool(this._peerPool);

		this._nodeInfo = config.nodeInfo;
		this._peerPool.applyNodeInfo(this._nodeInfo);

		this._discoveryInterval = config.discoveryInterval
			? config.discoveryInterval
			: DEFAULT_DISCOVERY_INTERVAL;
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
			os: this._nodeInfo.os,
			version: this._nodeInfo.version,
			nethash: this._nodeInfo.nethash,
			wsPort: this._nodeInfo.wsPort,
			height: nodeInfo.height,
			options: nodeInfo.options ? nodeInfo.options : {},
		};

		this._peerPool.applyNodeInfo(this._nodeInfo);
	}

	public get nodeInfo(): P2PNodeInfo {
		return this._nodeInfo;
	}

	/* tslint:disable:next-line: prefer-function-over-method */
	public applyPenalty(penalty: P2PPenalty): void {
		penalty;
	}

	public getNetworkStatus(): P2PNetworkStatus {
		return {
			newPeers: [...this._newPeers.values()],
			triedPeers: [...this._triedPeers.values()],
			connectedPeers: this._peerPool.getAllPeerInfos(),
		};
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		const response = await this._peerPool.requestFromPeer(packet);

		return response;
	}

	public send(message: P2PMessagePacket): void {
		this._peerPool.sendToPeers(message);
	}

	private async _startPeerServer(): Promise<void> {
		this._scServer.on(
			'connection',
			(socket: SCServerSocket): void => {
				if (!socket.request.url) {
					this.emit(
						EVENT_FAILED_TO_ADD_INBOUND_PEER,
						new PeerInboundHandshakeError(
							INVALID_CONNECTION_URL_REASON,
							INVALID_CONNECTION_URL_CODE,
							socket.remoteAddress,
							socket.request.url,
						),
					);
					socket.disconnect(
						INVALID_CONNECTION_URL_CODE,
						INVALID_CONNECTION_URL_REASON,
					);

					return;
				}
				const queryObject = url.parse(socket.request.url, true).query;

				if (
					typeof queryObject.wsPort !== 'string' ||
					typeof queryObject.version !== 'string' ||
					typeof queryObject.nethash !== 'string'
				) {
					socket.disconnect(
						INVALID_CONNECTION_QUERY_CODE,
						INVALID_CONNECTION_QUERY_REASON,
					);
					this.emit(
						EVENT_FAILED_TO_ADD_INBOUND_PEER,
						new PeerInboundHandshakeError(
							INVALID_CONNECTION_QUERY_REASON,
							INVALID_CONNECTION_QUERY_CODE,
							socket.remoteAddress,
							socket.request.url,
						),
					);

					return;
				}

				if (queryObject.nethash !== this._nodeInfo.nethash) {
					socket.disconnect(
						INCOMPATIBLE_NETWORK_CODE,
						INCOMPATIBLE_NETWORK_REASON,
					);
					this.emit(
						EVENT_FAILED_TO_ADD_INBOUND_PEER,
						new PeerInboundHandshakeError(
							INCOMPATIBLE_NETWORK_REASON,
							INCOMPATIBLE_NETWORK_CODE,
							socket.remoteAddress,
							socket.request.url,
						),
					);

					return;
				}

				const wsPort: number = parseInt(queryObject.wsPort, BASE_10_RADIX);
				const peerId = constructPeerId(socket.remoteAddress, wsPort);
				const queryOptions =
					typeof queryObject.options === 'string'
						? JSON.parse(queryObject.options)
						: undefined;

				const incomingPeerInfo: P2PDiscoveredPeerInfo = {
					...queryOptions,
					...queryObject,
					ipAddress: socket.remoteAddress,
					wsPort,
					height: queryObject.height ? +queryObject.height : 0,
					version: queryObject.version,
				};

				const isNewPeer = this._peerPool.addInboundPeer(
					peerId,
					incomingPeerInfo,
					socket,
				);

				if (isNewPeer) {
					this.emit(EVENT_NEW_INBOUND_PEER, incomingPeerInfo);
					this.emit(EVENT_NEW_PEER, incomingPeerInfo);
				}

				if (!this._newPeers.has(peerId) && !this._triedPeers.has(peerId)) {
					this._newPeers.set(peerId, incomingPeerInfo);
				}
			},
		);

		this._httpServer.listen(this._nodeInfo.wsPort, NODE_HOST_IP);
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
		this._isActive = false;
	}

	private async _discoverPeers(
		knownPeers: ReadonlyArray<P2PDiscoveredPeerInfo> = [],
	): Promise<void> {
		// Make sure that we do not try to connect to peers if the P2P node is no longer active.
		if (!this._isActive) {
			return;
		}

		const discoveredPeers = await this._peerPool.runDiscovery(
			knownPeers,
			this._config.blacklistedPeers,
		);

		// Stop discovery if node is no longer active. That way we don't try to connect to peers.
		// We need to check again because of the previous asynchronous await statement.
		if (!this._isActive) {
			return;
		}

		discoveredPeers.forEach((peerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (!this._triedPeers.has(peerId) && !this._newPeers.has(peerId)) {
				this._newPeers.set(peerId, peerInfo);
			}
		});

		this._peerPool.selectPeersAndConnect([...this._newPeers.values()]);
	}

	private async _startDiscovery(
		knownPeers: ReadonlyArray<P2PDiscoveredPeerInfo> = [],
	): Promise<void> {
		if (this._discoveryIntervalId) {
			throw new Error('Discovery is already running');
		}
		this._discoveryIntervalId = setInterval(async () => {
			await this._discoverPeers(knownPeers);
		}, this._discoveryInterval);

		await this._discoverPeers(knownPeers);
	}

	private _stopDiscovery(): void {
		if (!this._discoveryIntervalId) {
			throw new Error('Discovery is not running');
		}
		clearInterval(this._discoveryIntervalId);
	}

	private async _fetchSeedPeerStatus(
		seedPeers: ReadonlyArray<P2PPeerInfo>,
	): Promise<ReadonlyArray<P2PDiscoveredPeerInfo>> {
		const peerConfig = {
			ackTimeout: this._config.ackTimeout,
			connectTimeout: this._config.connectTimeout,
		};
		const seedPeerUpdatedInfos = await this._peerPool.fetchStatusAndCreatePeer(
			seedPeers,
			this._nodeInfo,
			peerConfig,
		);

		return seedPeerUpdatedInfos;
	}

	public async start(): Promise<void> {
		if (this._isActive) {
			throw new Error('Cannot start the node because it is already active');
		}
		await this._startPeerServer();
		// Fetch status of all the seed peers and then start the discovery
		const seedPeerInfos = await this._fetchSeedPeerStatus(
			this._config.seedPeers,
		);
		// Add seed's peerinfos in tried peer as we already tried them to fetch status
		seedPeerInfos.forEach(seedInfo => {
			const peerId = constructPeerIdFromPeerInfo(seedInfo);
			if (!this._triedPeers.has(peerId)) {
				this._triedPeers.set(peerId, seedInfo);
			}
		});
		// TODO: Once we will a new peer discovery then we can remove this typecasting to P2PDiscoveredPeerInfo
		await this._startDiscovery(seedPeerInfos);
	}

	public async stop(): Promise<void> {
		if (!this._isActive) {
			throw new Error('Cannot stop the node because it is not active');
		}
		this._stopDiscovery();
		this._peerPool.removeAllPeers();
		await this._stopPeerServer();
	}

	private _bindHandlersToPeerPool(peerPool: PeerPool): void {
		peerPool.on(EVENT_REQUEST_RECEIVED, this._handlePeerPoolRPC);
		peerPool.on(EVENT_MESSAGE_RECEIVED, this._handlePeerPoolMessage);
		peerPool.on(EVENT_CONNECT_OUTBOUND, this._handlePeerConnect);
		peerPool.on(EVENT_CONNECT_ABORT_OUTBOUND, this._handlePeerConnectAbort);
		peerPool.on(EVENT_CLOSE_OUTBOUND, this._handlePeerClose);
		peerPool.on(EVENT_UPDATED_PEER_INFO, this._handlePeerInfoUpdate);
		peerPool.on(
			EVENT_FAILED_PEER_INFO_UPDATE,
			this._handleFailedPeerInfoUpdate,
		);
		peerPool.on(EVENT_DISCOVERED_PEER, this._handleDiscoveredPeer);
		peerPool.on(
			EVENT_FAILED_TO_PUSH_NODE_INFO,
			this._handleFailedToPushNodeInfo,
		);
		peerPool.on(
			EVENT_FAILED_TO_FETCH_PEER_INFO,
			this._handleFailedToFetchPeerInfo,
		);
		peerPool.on(EVENT_OUTBOUND_SOCKET_ERROR, this._handleOutboundSocketError);
		peerPool.on(EVENT_INBOUND_SOCKET_ERROR, this._handleInboundSocketError);
	}
}
