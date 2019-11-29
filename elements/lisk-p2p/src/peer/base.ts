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
import * as socketClusterClient from 'socketcluster-client';
import { SCServerSocket } from 'socketcluster-server';

import {
	DEFAULT_PRODUCTIVITY,
	DEFAULT_PRODUCTIVITY_RESET_INTERVAL,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	INTENTIONAL_DISCONNECT_CODE,
	INVALID_PEER_INFO_PENALTY,
	INVALID_PEER_LIST_PENALTY,
} from '../constants';
import {
	InvalidPeerInfoError,
	InvalidPeerInfoListError,
	RPCResponseError,
} from '../errors';
import {
	EVENT_BAN_PEER,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_INVALID_MESSAGE_RECEIVED,
	EVENT_INVALID_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_REQUEST_RECEIVED,
	EVENT_UPDATED_PEER_INFO,
	REMOTE_EVENT_POST_NODE_INFO,
	REMOTE_EVENT_RPC_GET_NODE_INFO,
	REMOTE_EVENT_RPC_GET_PEERS_LIST,
	REMOTE_SC_EVENT_MESSAGE,
	REMOTE_SC_EVENT_RPC_REQUEST,
} from '../events';
import { P2PRequest } from '../p2p_request';
import {
	P2PEnhancedPeerInfo,
	P2PInternalState,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	P2PResponsePacket,
} from '../p2p_types';
import {
	assignInternalInfo,
	sanitizeIncomingPeerInfo,
	validatePeerCompatibility,
	validatePeerInfo,
	validatePeerInfoList,
	validateProtocolMessage,
	validateRPCRequest,
} from '../utils';

export const socketErrorStatusCodes = {
	...(socketClusterClient.SCClientSocket as any).errorStatuses,
	1000: 'Intentionally disconnected',
};

// Can be used to convert a rate which is based on the rateCalculationInterval into a per-second rate.
const RATE_NORMALIZATION_FACTOR = 1000;

export type SCClientSocket = socketClusterClient.SCClientSocket;

export type SCServerSocketUpdated = {
	destroy(code?: number, data?: string | object): void;
	on(event: string | unknown, listener: (packet?: unknown) => void): void;
	on(event: string, listener: (packet: any, respond: any) => void): void;
} & SCServerSocket;

export enum ConnectionState {
	CONNECTING = 'connecting',
	OPEN = 'open',
	CLOSED = 'closed',
}
// tslint:disable:readonly-keyword
export interface ConnectedPeerInfo extends P2PPeerInfo {
	internalState: P2PInternalState;
}
// tslint:enable:readonly-keyword
export interface PeerConfig {
	readonly connectTimeout?: number;
	readonly ackTimeout?: number;
	readonly rateCalculationInterval: number;
	readonly wsMaxMessageRate: number;
	readonly wsMaxMessageRatePenalty: number;
	readonly wsMaxPayload?: number;
	readonly maxPeerInfoSize: number;
	readonly maxPeerDiscoveryResponseLength: number;
	readonly secret: number;
	readonly serverNodeInfo?: P2PNodeInfo;
}

export class Peer extends EventEmitter {
	private readonly _counterResetInterval: NodeJS.Timer;
	protected _peerInfo: ConnectedPeerInfo;
	private readonly _productivityResetInterval: NodeJS.Timer;
	protected readonly _peerConfig: PeerConfig;
	protected _nodeInfo: P2PNodeInfo | undefined;
	protected _serverNodeInfo: P2PNodeInfo | undefined;
	protected _rateInterval: number;

	protected readonly _handleRawRPC: (
		packet: unknown,
		respond: (responseError?: Error, responseData?: unknown) => void,
	) => void;
	protected readonly _handleWSMessage: (message: string) => void;
	protected readonly _handleRawMessage: (packet: unknown) => void;
	protected _socket: SCServerSocketUpdated | SCClientSocket | undefined;

	public constructor(peerInfo: P2PPeerInfo, peerConfig: PeerConfig) {
		super();
		this._peerConfig = peerConfig;
		this._peerInfo = this._initializeInternalState(
			peerInfo,
		) as ConnectedPeerInfo;
		this._rateInterval = this._peerConfig.rateCalculationInterval;
		this._counterResetInterval = setInterval(() => {
			this._resetCounters();
		}, this._rateInterval);
		this._productivityResetInterval = setInterval(() => {
			this._resetProductivity();
		}, DEFAULT_PRODUCTIVITY_RESET_INTERVAL);
		this._serverNodeInfo = peerConfig.serverNodeInfo;

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRawRPC = (
			packet: unknown,
			respond: (responseError?: Error, responseData?: unknown) => void,
		) => {
			// TODO later: Switch to LIP protocol format.
			// tslint:disable-next-line:no-let
			let rawRequest;
			try {
				rawRequest = validateRPCRequest(packet);
			} catch (error) {
				respond(error);
				this.emit(EVENT_INVALID_REQUEST_RECEIVED, {
					packet,
					peerId: this._peerInfo.peerId,
				});

				return;
			}

			this._updateRPCCounter(rawRequest);
			const rate = this._getRPCRate(rawRequest);

			// Each P2PRequest contributes to the Peer's productivity.
			// A P2PRequest can mutate this._productivity from the current Peer instance.
			const request = new P2PRequest(
				{
					procedure: rawRequest.procedure,
					data: rawRequest.data,
					id: this.peerInfo.peerId,
					rate,
					productivity: this.internalState.productivity,
				},
				respond,
			);

			if (rawRequest.procedure === REMOTE_EVENT_RPC_GET_NODE_INFO) {
				request.end(this._nodeInfo);
			}

			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		this._handleWSMessage = () => {
			this._peerInfo.internalState.wsMessageCount += 1;
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRawMessage = (packet: unknown) => {
			// TODO later: Switch to LIP protocol format.
			// tslint:disable-next-line:no-let
			let message;
			try {
				message = validateProtocolMessage(packet);
			} catch (error) {
				this.emit(EVENT_INVALID_MESSAGE_RECEIVED, {
					packet,
					peerId: this._peerInfo.peerId,
				});

				return;
			}

			this._updateMessageCounter(message);
			const rate = this._getMessageRate(message);
			const messageWithRateInfo = {
				...message,
				peerId: this._peerInfo.peerId,
				rate,
			};

			if (message.event === REMOTE_EVENT_POST_NODE_INFO) {
				this._handleUpdatePeerInfo(message);
			}

			this.emit(EVENT_MESSAGE_RECEIVED, messageWithRateInfo);
		};
	}

	public get id(): string {
		return this._peerInfo.peerId;
	}

	public get ipAddress(): string {
		return this._peerInfo.ipAddress;
	}

	public get wsPort(): number {
		return this._peerInfo.wsPort;
	}

	public get internalState(): P2PInternalState {
		return this.peerInfo.internalState;
	}

	public get state(): ConnectionState {
		const state = this._socket
			? this._socket.state === this._socket.OPEN
				? ConnectionState.OPEN
				: ConnectionState.CLOSED
			: ConnectionState.CLOSED;

		return state;
	}

	public updateInternalState(internalState: P2PInternalState): void {
		this._peerInfo = {
			...this._peerInfo,
			internalState,
		};
	}

	public get peerInfo(): ConnectedPeerInfo {
		return this._peerInfo;
	}

	public get nodeInfo(): P2PNodeInfo | undefined {
		return this._nodeInfo;
	}

	private _initializeInternalState(peerInfo: P2PPeerInfo): P2PPeerInfo {
		return peerInfo.internalState
			? peerInfo
			: {
					...peerInfo,
					internalState: assignInternalInfo(peerInfo, this._peerConfig.secret),
			  };
	}

	public updatePeerInfo(newPeerInfo: P2PPeerInfo): void {
		// The ipAddress and wsPort properties cannot be updated after the initial discovery.
		this._peerInfo = {
			sharedState: newPeerInfo.sharedState,
			internalState: this._peerInfo.internalState,
			ipAddress: this.ipAddress,
			wsPort: this.wsPort,
			peerId: this.id,
		};
	}

	/**
	 * Updates the node latest status and sends the same information to all other peers.
	 * @param nodeInfo information about the node latest status
	 */
	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		this.send({
			event: REMOTE_EVENT_POST_NODE_INFO,
			data: nodeInfo,
		});
	}

	public connect(): void {
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}
	}

	public disconnect(
		code: number = INTENTIONAL_DISCONNECT_CODE,
		reason?: string,
	): void {
		clearInterval(this._counterResetInterval);
		clearInterval(this._productivityResetInterval);
		if (this._socket) {
			this._socket.destroy(code, reason);
		}
	}

	public send(packet: P2PMessagePacket): void {
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}

		this._socket.emit(REMOTE_SC_EVENT_MESSAGE, {
			event: packet.event,
			data: packet.data,
		});
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		return new Promise<P2PResponsePacket>(
			(
				resolve: (result: P2PResponsePacket) => void,
				reject: (result: Error) => void,
			): void => {
				if (!this._socket) {
					throw new Error('Peer socket does not exist');
				}
				this._socket.emit(
					REMOTE_SC_EVENT_RPC_REQUEST,
					{
						type: '/RPCRequest',
						procedure: packet.procedure,
						data: packet.data,
					},
					(error: Error | undefined, responseData: unknown) => {
						if (error) {
							reject(error);

							return;
						}

						if (responseData) {
							resolve(responseData as P2PResponsePacket);

							return;
						}

						reject(
							new RPCResponseError(
								`Failed to handle response for procedure ${packet.procedure}`,
								`${this.ipAddress}:${this.wsPort}`,
							),
						);
					},
				);
			},
		);
	}

	public async fetchPeers(): Promise<ReadonlyArray<P2PEnhancedPeerInfo>> {
		try {
			const response: P2PResponsePacket = await this.request({
				procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
			});

			const validatedPeers = validatePeerInfoList(
				response.data,
				this._peerConfig.maxPeerDiscoveryResponseLength,
				this._peerConfig.maxPeerInfoSize,
			);

			return validatedPeers.map(peerInfo => ({
				...peerInfo,
				sourceAddress: this.ipAddress,
			}));
		} catch (error) {
			if (
				error instanceof InvalidPeerInfoError ||
				error instanceof InvalidPeerInfoListError
			) {
				this.applyPenalty(INVALID_PEER_LIST_PENALTY);
			}

			this.emit(EVENT_FAILED_TO_FETCH_PEERS, error);

			throw new RPCResponseError(
				'Failed to fetch peer list of peer',
				this.ipAddress,
			);
		}
	}

	public async discoverPeers(): Promise<ReadonlyArray<P2PEnhancedPeerInfo>> {
		const discoveredPeerInfoList = await this.fetchPeers();
		discoveredPeerInfoList.forEach(peerInfo => {
			this.emit(EVENT_DISCOVERED_PEER, peerInfo);
		});

		return discoveredPeerInfoList;
	}

	public async fetchAndUpdateStatus(): Promise<P2PPeerInfo> {
		// tslint:disable-next-line:no-let
		let response: P2PResponsePacket;
		try {
			response = await this.request({
				procedure: REMOTE_EVENT_RPC_GET_NODE_INFO,
			});
		} catch (error) {
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);

			throw new RPCResponseError(
				'Failed to fetch peer info of peer',
				`${this.ipAddress}:${this.wsPort}`,
			);
		}
		try {
			this._updateFromProtocolPeerInfo(response.data);
		} catch (error) {
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);

			// Apply penalty for malformed PeerInfo
			if (error instanceof InvalidPeerInfoError) {
				this.applyPenalty(INVALID_PEER_INFO_PENALTY);
			}

			throw new RPCResponseError(
				'Failed to update peer info of peer due to validation of peer compatibility',
				`${this.ipAddress}:${this.wsPort}`,
			);
		}

		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);

		// Return the updated detailed peer info.
		return this._peerInfo;
	}

	public applyPenalty(penalty: number): void {
		this.peerInfo.internalState.reputation -= penalty;
		if (this.internalState.reputation <= 0) {
			this._banPeer();
		}
	}

	private _resetCounters(): void {
		this._peerInfo.internalState.wsMessageRate =
			(this.peerInfo.internalState.wsMessageCount * RATE_NORMALIZATION_FACTOR) /
			this._rateInterval;
		this._peerInfo.internalState.wsMessageCount = 0;

		if (
			this.peerInfo.internalState.wsMessageRate >
			this._peerConfig.wsMaxMessageRate
		) {
			this.applyPenalty(this._peerConfig.wsMaxMessageRatePenalty);

			return;
		}

		this._peerInfo.internalState.rpcRates = new Map(
			[...this.internalState.rpcCounter.entries()].map(([key, value]) => {
				const rate = value / this._rateInterval;

				return [key, rate] as any;
			}),
		);
		this._peerInfo.internalState.rpcCounter = new Map();

		this._peerInfo.internalState.messageRates = new Map(
			[...this.internalState.messageCounter.entries()].map(([key, value]) => {
				const rate = value / this._rateInterval;

				return [key, rate] as any;
			}),
		);
		this._peerInfo.internalState.messageCounter = new Map();
	}

	private _resetProductivity(): void {
		// If peer has not recently responded, reset productivity to 0
		if (
			this.peerInfo.internalState.productivity.lastResponded <
			Date.now() - DEFAULT_PRODUCTIVITY_RESET_INTERVAL
		) {
			this._peerInfo.internalState.productivity = { ...DEFAULT_PRODUCTIVITY };
		}
	}
	private _updateFromProtocolPeerInfo(rawPeerInfo: unknown): void {
		if (!this._serverNodeInfo) {
			throw new Error('Missing server node info.');
		}

		// Sanitize and validate PeerInfo
		const peerInfo = validatePeerInfo(
			sanitizeIncomingPeerInfo({
				...(rawPeerInfo as object),
				ipAddress: this.ipAddress,
				wsPort: this.wsPort,
			}),
			this._peerConfig.maxPeerInfoSize,
		);

		const result = validatePeerCompatibility(peerInfo, this._serverNodeInfo);

		if (!result.success && result.error) {
			throw new Error(
				`${result.error} : ${peerInfo.ipAddress}:${peerInfo.wsPort}`,
			);
		}

		this.updatePeerInfo(peerInfo);
	}

	private _handleUpdatePeerInfo(message: P2PMessagePacket): void {
		// Update peerInfo with the latest values from the remote peer.
		try {
			this._updateFromProtocolPeerInfo(message.data);
		} catch (error) {
			// Apply penalty for malformed PeerInfo update
			if (error instanceof InvalidPeerInfoError) {
				this.applyPenalty(INVALID_PEER_INFO_PENALTY);
			}

			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);

			return;
		}
		this.emit(EVENT_UPDATED_PEER_INFO, this.peerInfo);
	}

	private _banPeer(): void {
		this.emit(EVENT_BAN_PEER, this.id);
		this.disconnect(FORBIDDEN_CONNECTION, FORBIDDEN_CONNECTION_REASON);
	}

	private _updateRPCCounter(packet: P2PRequestPacket): void {
		const key = packet.procedure;
		const count = (this.internalState.rpcCounter.get(key) || 0) + 1;
		this.peerInfo.internalState.rpcCounter.set(key, count);
	}

	private _getRPCRate(packet: P2PRequestPacket): number {
		const rate =
			this.peerInfo.internalState.rpcRates.get(packet.procedure) || 0;

		return rate * RATE_NORMALIZATION_FACTOR;
	}

	private _updateMessageCounter(packet: P2PMessagePacket): void {
		const key = packet.event;
		const count = (this.internalState.messageCounter.get(key) || 0) + 1;
		this.peerInfo.internalState.messageCounter.set(key, count);
	}

	private _getMessageRate(packet: P2PMessagePacket): number {
		const rate = this.internalState.messageRates.get(packet.event) || 0;

		return rate * RATE_NORMALIZATION_FACTOR;
	}
}
