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

interface SCServerUpdated extends SCServer {
	readonly isReady: boolean;
}

import {
	constructPeerId,
	constructPeerIdFromPeerInfo,
	REMOTE_RPC_GET_ALL_PEERS_LIST,
} from './peer';

import {
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
} from './disconnect_status_codes';

import { PeerInboundHandshakeError } from './errors';

import {
	P2PCheckPeerCompatibility,
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
	ProtocolPeerInfo,
	ProtocolPeerInfoList,
} from './p2p_types';

import { P2PRequest } from './p2p_request';
export { P2PRequest };
import {
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
} from './peer_selection';

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
	MAX_PEER_LIST_BATCH_SIZE,
	PeerPool,
} from './peer_pool';
import { checkPeerCompatibility } from './validation';

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
export const DEFAULT_SEND_PEER_LIMIT = 25;
export const DEFAULT_WS_MAX_PAYLOAD = 1048576; // Payload in bytes

const BASE_10_RADIX = 10;

const selectRandomPeerSample = (
	peerList: ReadonlyArray<P2PDiscoveredPeerInfo>,
	count: number,
): ReadonlyArray<P2PDiscoveredPeerInfo> => shuffle(peerList).slice(0, count);

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
	private readonly _peerHandshakeCheck: P2PCheckPeerCompatibility;

	public constructor(config: P2PConfig) {
		super();

		this._config = config;
		this._isActive = false;
		this._newPeers = new Map();
		this._triedPeers = new Map();

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
			if (request.procedure === REMOTE_RPC_GET_ALL_PEERS_LIST) {
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

		this._handlePeerConnect = (peerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const foundTriedPeer = this._triedPeers.get(peerId);
			// On successful connection remove it from newPeers list
			this._newPeers.delete(peerId);

			if (foundTriedPeer) {
				const updatedPeerInfo = {
					...peerInfo,
					ipAddress: foundTriedPeer.ipAddress,
					wsPort: foundTriedPeer.wsPort,
				};
				this._triedPeers.set(peerId, updatedPeerInfo);
			} else {
				this._triedPeers.set(peerId, peerInfo);
			}

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_OUTBOUND, peerInfo);
		};

		this._handlePeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (this._triedPeers.has(peerId)) {
				this._triedPeers.delete(peerId);
			}

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, peerInfo);
		};

		this._handlePeerClose = (closePacket: P2PClosePacket) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_CLOSE_OUTBOUND, closePacket);
		};

		this._handlePeerInfoUpdate = (peerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const foundTriedPeer = this._triedPeers.get(peerId);
			const foundNewPeer = this._newPeers.get(peerId);

			if (foundTriedPeer) {
				const updatedPeerInfo = {
					...peerInfo,
					ipAddress: foundTriedPeer.ipAddress,
					wsPort: foundTriedPeer.wsPort,
				};
				this._triedPeers.set(peerId, updatedPeerInfo);
			}

			if (foundNewPeer) {
				const updatedPeerInfo = {
					...peerInfo,
					ipAddress: foundNewPeer.ipAddress,
					wsPort: foundNewPeer.wsPort,
				};
				this._newPeers.set(peerId, updatedPeerInfo);
			}

			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_UPDATED_PEER_INFO, peerInfo);
		};

		this._handleFailedPeerInfoUpdate = (error: Error) => {
			// Re-emit the message to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
		};
		// When peer is fetched for status after connection then update the peerinfo in triedPeer list
		this._handleDiscoveredPeer = (detailedPeerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(detailedPeerInfo);
			const foundTriedPeer = this._triedPeers.get(peerId);
			// Remove the discovered peer from newPeer list on successful connect and discovery
			if (this._newPeers.has(peerId)) {
				this._newPeers.delete(peerId);
			}

			if (!foundTriedPeer) {
				this._triedPeers.set(peerId, detailedPeerInfo);
			} else {
				const updatedPeerInfo = {
					...detailedPeerInfo,
					ipAddress: foundTriedPeer.ipAddress,
					wsPort: foundTriedPeer.wsPort,
				};
				this._triedPeers.set(peerId, updatedPeerInfo);
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
		});

		this._bindHandlersToPeerPool(this._peerPool);
		// Add peers to tried peers if want to re-use previously tried peers
		if (config.triedPeers) {
			config.triedPeers.forEach(peerInfo => {
				const peerId = constructPeerIdFromPeerInfo(peerInfo);
				if (!this._triedPeers.has(peerId)) {
					this._triedPeers.set(peerId, peerInfo);
				}
			});
		}

		this._nodeInfo = config.nodeInfo;
		this.applyNodeInfo(this._nodeInfo);

		this._discoveryInterval = config.discoveryInterval
			? config.discoveryInterval
			: DEFAULT_DISCOVERY_INTERVAL;

		this._peerHandshakeCheck = config.peerHandshakeCheck
			? config.peerHandshakeCheck
			: checkPeerCompatibility;
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

	/* tslint:disable:next-line: prefer-function-over-method */
	public applyPenalty(penalty: P2PPenalty): void {
		penalty;
	}

	public getNetworkStatus(): P2PNetworkStatus {
		return {
			newPeers: [...this._newPeers.values()],
			triedPeers: [...this._triedPeers.values()],
			connectedPeers: this._peerPool.getAllConnectedPeerInfos(),
		};
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		const response = await this._peerPool.requestFromPeer(packet);

		return response;
	}

	public send(message: P2PMessagePacket): void {
		this._peerPool.sendToPeers(message);
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
				if (this._config.blacklistedPeers) {
					const blacklist = this._config.blacklistedPeers.map(
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

					const selfPeerId = constructPeerId(socket.remoteAddress, selfWSPort);
					// Delete you peerinfo from both the lists
					this._newPeers.delete(selfPeerId);
					this._triedPeers.delete(selfPeerId);

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

				const wsPort: number = parseInt(queryObject.wsPort, BASE_10_RADIX);
				const peerId = constructPeerId(socket.remoteAddress, wsPort);

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

				const incomingPeerInfo: P2PDiscoveredPeerInfo = {
					...queryObject,
					...queryOptions,
					ipAddress: socket.remoteAddress,
					wsPort,
					height: queryObject.height ? +queryObject.height : 0,
					version: queryObject.version,
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
			this._config.blacklistedPeers || [],
		);

		// Stop discovery if node is no longer active. That way we don't try to connect to peers.
		// We need to check again because of the previous asynchronous await statement.
		if (!this._isActive) {
			return;
		}

		discoveredPeers.forEach((peerInfo: P2PDiscoveredPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			// Check for value of nonce, if its same then its our own info
			if (
				!this._triedPeers.has(peerId) &&
				!this._newPeers.has(peerId) &&
				peerInfo.nonce !== this._nodeInfo.nonce
			) {
				this._newPeers.set(peerId, peerInfo);
			}
		});

		this._peerPool.selectPeersAndConnect([...this._newPeers.values()]);
	}

	private async _startDiscovery(): Promise<void> {
		if (this._discoveryIntervalId) {
			throw new Error('Discovery is already running');
		}
		this._discoveryIntervalId = setInterval(async () => {
			await this._discoverPeers([...this._triedPeers.values()]);
		}, this._discoveryInterval);

		await this._discoverPeers([...this._triedPeers.values()]);
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
		const seedPeerUpdatedInfos = await this._peerPool.fetchStatusAndCreatePeers(
			seedPeers,
			this._nodeInfo,
			peerConfig,
		);

		return seedPeerUpdatedInfos;
	}

	private _pickRandomDiscoveredPeers(
		count: number,
	): ReadonlyArray<P2PDiscoveredPeerInfo> {
		const discoveredPeerList: ReadonlyArray<P2PDiscoveredPeerInfo> = [
			...this._triedPeers.values(),
		]; // Peers whose values has been updated atleast once.

		return selectRandomPeerSample(discoveredPeerList, count);
	}

	private _handleGetPeersRequest(request: P2PRequest): void {
		// TODO later: Remove fields that are specific to the current Lisk protocol.
		const peers = this._pickRandomDiscoveredPeers(MAX_PEER_LIST_BATCH_SIZE).map(
			(peerInfo: P2PDiscoveredPeerInfo): ProtocolPeerInfo => {
				const { ipAddress, ...peerInfoWithoutIp } = peerInfo;

				// The options property is not read by the current legacy protocol but it should be added anyway for future compatibility.
				return {
					...peerInfoWithoutIp,
					ip: ipAddress,
					broadhash: peerInfoWithoutIp.broadhash
						? (peerInfoWithoutIp.broadhash as string)
						: '',
					nonce: peerInfoWithoutIp.nonce
						? (peerInfoWithoutIp.nonce as string)
						: '',
				};
			},
		);
		const protocolPeerInfoList: ProtocolPeerInfoList = {
			success: true,
			peers,
		};

		request.end(protocolPeerInfoList);
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

		await this._startDiscovery();
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
