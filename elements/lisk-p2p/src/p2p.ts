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
// tslint:disable-next-line no-require-imports
import { shuffle } from 'lodash';
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
	MAX_PEER_LIST_BATCH_SIZE,
	PeerPool,
} from './peer_pool';
import {
	checkPeerCompatibility,
	handlePeerListsConflicts,
	PeerLists,
} from './validation';

export {
	EVENT_CLOSE_INBOUND,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_BAN_PEER,
	EVENT_UNBAN_PEER,
};

export const EVENT_NEW_INBOUND_PEER = 'newInboundPeer';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'failedToAddInboundPeer';
export const EVENT_NEW_PEER = 'newPeer';

export const DEFAULT_NODE_HOST_IP = '0.0.0.0';
export const DEFAULT_DISCOVERY_INTERVAL = 30000;
export const DEFAULT_BAN_TIME = 86400;
export const DEFAULT_POPULATOR_INTERVAL = 10000;
export const DEFAULT_SEND_PEER_LIMIT = 25;

const BASE_10_RADIX = 10;
const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
const DEFAULT_OUTBOUND_SHUFFLE_INTERVAL = 300000;

const selectRandomPeerSample = (
	peerList: ReadonlyArray<P2PPeerInfo>,
	count: number,
): ReadonlyArray<P2PPeerInfo> => shuffle(peerList).slice(0, count);

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _peerListsWithoutConflicts: PeerLists;
	private readonly _httpServer: http.Server;
	private _isActive: boolean;
	private readonly _newPeers: Map<string, P2PPeerInfo>;
	private readonly _triedPeers: Map<string, P2PDiscoveredPeerInfo>;
	private readonly _bannedPeers: Set<string>;
	private readonly _populatorInterval: number;
	private _populatorIntervalId: NodeJS.Timer | undefined;

	private _nodeInfo: P2PNodeInfo;
	private readonly _peerPool: PeerPool;
	private readonly _scServer: SCServerUpdated;

	private readonly _handlePeerPoolRPC: (request: P2PRequest) => void;
	private readonly _handlePeerPoolMessage: (message: P2PMessagePacket) => void;
	private readonly _handleDiscoveredPeer: (
		discoveredPeerInfo: P2PDiscoveredPeerInfo,
	) => void;
	private readonly _handleFailedToPushNodeInfo: (error: Error) => void;
	private readonly _handleOutboundPeerConnect: (
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
	private readonly _handlePeerInfoUpdate: (
		peerInfo: P2PDiscoveredPeerInfo,
	) => void;
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
		this._peerListsWithoutConflicts = handlePeerListsConflicts({
			seedPeers: config.seedPeers,
			blacklistedPeers: config.blacklistedPeers,
			fixedPeers: config.fixedPeers,
			whitelisted: config.whitelistedPeers,
			previousPeers: config.previousPeers,
		});
		this._config = config;
		this._isActive = false;
		this._newPeers = new Map();
		this._triedPeers = new Map();
		this._bannedPeers = new Set();
		this._httpServer = http.createServer();
		this._scServer = attach(this._httpServer) as SCServerUpdated;

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

		this._handleOutboundPeerConnect = (peerInfo: P2PDiscoveredPeerInfo) => {
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

		this._handleOutboundPeerConnectAbort = (peerInfo: P2PPeerInfo) => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			const isWhiteListed = this._peerListsWithoutConflicts.whitelisted.find(
				peer => constructPeerIdFromPeerInfo(peer) === peerId,
			);
			if (this._triedPeers.has(peerId) && !isWhiteListed) {
				this._triedPeers.delete(peerId);
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
			const isWhiteListed = this._peerListsWithoutConflicts.whitelisted.find(
				peer => constructPeerIdFromPeerInfo(peer) === peerId,
			);
			if (this._triedPeers.has(peerId) && !isWhiteListed) {
				this._triedPeers.delete(peerId);
			}
			if (this._newPeers.has(peerId)) {
				this._newPeers.delete(peerId);
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
			if (this._peerListsWithoutConflicts.blacklistedPeers) {
				const blacklist = this._peerListsWithoutConflicts.blacklistedPeers.map(
					peer => peer.ipAddress,
				);
				if (blacklist.includes(detailedPeerInfo.ipAddress)) {
					return;
				}
			}			 
			const peerId = constructPeerIdFromPeerInfo(detailedPeerInfo);

			if (!this._triedPeers.has(peerId) && !this._newPeers.has(peerId)) {
				this._newPeers.set(peerId, detailedPeerInfo);

				// Re-emit the message to allow it to bubble up the class hierarchy.
				this.emit(EVENT_DISCOVERED_PEER, detailedPeerInfo);
			}
		};

		this._handleFailedToPushNodeInfo = (error: Error) => {
			// Re-emit the error to allow it to bubble up the class hierarchy.
			this.emit(EVENT_FAILED_TO_PUSH_NODE_INFO, error);
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
			outboundShuffleInterval: config.outboundShuffleInterval
				? config.outboundShuffleInterval
				: DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
		});

		this._bindHandlersToPeerPool(this._peerPool);
		// Add peers to tried peers if want to re-use previously tried peers
		if (this._peerListsWithoutConflicts.previousPeers) {
			this._peerListsWithoutConflicts.previousPeers.forEach(peerInfo => {
				const peerId = constructPeerIdFromPeerInfo(peerInfo);
				if (!this._triedPeers.has(peerId)) {
					this._triedPeers.set(peerId, peerInfo);
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

	public applyPenalty(peerPenalty: P2PPenalty): void {
		if (!this._isTrustedPeer(peerPenalty.peerId)) {
			this._peerPool.applyPenalty(peerPenalty);
		}
	}

	public getNetworkStatus(): P2PNetworkStatus {
		return {
			newPeers: [...this._newPeers.values()],
			triedPeers: [...this._triedPeers.values()],
			connectedPeers: this._peerPool.getAllConnectedPeerInfos(),
		};
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
				if (this._peerListsWithoutConflicts.blacklistedPeers) {
					const blacklist = this._peerListsWithoutConflicts.blacklistedPeers.map(
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

				if (this._bannedPeers.has(socket.remoteAddress)) {
					this._disconnectSocketDueToFailedHandshake(
						socket,
						FORBIDDEN_CONNECTION,
						FORBIDDEN_CONNECTION_REASON,
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

				const existingPeer = this._peerPool.getPeer(peerId);

				if (!existingPeer) {
					this._peerPool.addInboundPeer(incomingPeerInfo, socket);
					this.emit(EVENT_NEW_INBOUND_PEER, incomingPeerInfo);
					this.emit(EVENT_NEW_PEER, incomingPeerInfo);
				}

				const isWhiteListed = this._peerListsWithoutConflicts.whitelisted.find(
					peer => constructPeerIdFromPeerInfo(peer) === peerId,
				);
				if (this._triedPeers.has(peerId) && !isWhiteListed) {
					this._triedPeers.delete(peerId);
				}
				if (!this._newPeers.has(peerId)) {
					this._newPeers.set(peerId, incomingPeerInfo);
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
				[...this._newPeers.values(), ...this._triedPeers.values()],
				this._peerListsWithoutConflicts.fixedPeers || [],
			);
		}, this._populatorInterval);
		this._peerPool.triggerNewConnections(
			[...this._newPeers.values(), ...this._triedPeers.values()],
			this._peerListsWithoutConflicts.fixedPeers || [],
		);
	}

	private _stopPopulator(): void {
		if (this._populatorIntervalId) {
			clearInterval(this._populatorIntervalId);
		}
	}

	private _pickRandomPeers(count: number): ReadonlyArray<P2PPeerInfo> {
		const peerList: ReadonlyArray<P2PPeerInfo> = [
			...this._newPeers.values(),
			...this._triedPeers.values(),
		]; // Peers whose values has been updated at least once.

		return selectRandomPeerSample(peerList, count);
	}

	private _handleGetPeersRequest(request: P2PRequest): void {
		// TODO later: Remove fields that are specific to the current Lisk protocol.
		const peers = this._pickRandomPeers(MAX_PEER_LIST_BATCH_SIZE).map(
			(peerInfo: P2PPeerInfo): ProtocolPeerInfo => {
				const { ipAddress, ...peerInfoWithoutIp } = peerInfo;

				// The options property is not read by the current legacy protocol but it should be added anyway for future compatibility.
				return {
					...peerInfoWithoutIp,
					ip: ipAddress,
				};
			},
		);
		const protocolPeerInfoList: ProtocolPeerInfoList = {
			success: true,
			peers,
		};

		request.end(protocolPeerInfoList);
	}

	private _isTrustedPeer(peerId: string): boolean {
		const isSeed = this._peerListsWithoutConflicts.seedPeers.find(
			seedPeer =>
				peerId === constructPeerId(seedPeer.ipAddress, seedPeer.wsPort),
		);

		const isWhiteListed = this._peerListsWithoutConflicts.whitelisted.find(
			peer => constructPeerIdFromPeerInfo(peer) === peerId,
		);

		const isFixed = this._peerListsWithoutConflicts.fixedPeers.find(
			peer => constructPeerIdFromPeerInfo(peer) === peerId,
		);

		return !!isSeed || !!isWhiteListed || !!isFixed;
	}

	public async start(): Promise<void> {
		if (this._isActive) {
			throw new Error('Cannot start the node because it is already active');
		}

		const newPeersToAdd = this._peerListsWithoutConflicts.seedPeers.concat(this._peerListsWithoutConflicts.whitelisted);
		newPeersToAdd.forEach(newPeerInfo => {
			const peerId = constructPeerIdFromPeerInfo(newPeerInfo);
			if (!this._newPeers.has(peerId)) {
				this._newPeers.set(peerId, newPeerInfo);
			}
		});

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
		peerPool.on(EVENT_OUTBOUND_SOCKET_ERROR, this._handleOutboundSocketError);
		peerPool.on(EVENT_INBOUND_SOCKET_ERROR, this._handleInboundSocketError);
		peerPool.on(EVENT_BAN_PEER, this._handleBanPeer);
		peerPool.on(EVENT_UNBAN_PEER, this._handleUnbanPeer);
	}
}
