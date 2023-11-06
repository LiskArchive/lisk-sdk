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
import { codec } from '@liskhq/lisk-codec';

import {
	DEFAULT_PRODUCTIVITY,
	DEFAULT_PRODUCTIVITY_RESET_INTERVAL,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	INTENTIONAL_DISCONNECT_CODE,
	INVALID_PEER_INFO_PENALTY,
	INVALID_PEER_LIST_PENALTY,
	INVALID_PEER_INFO_LIST_REASON,
	DEFAULT_MESSAGE_ENCODING_FORMAT,
} from '../constants';
import {
	InvalidPeerInfoError,
	InvalidPeerInfoListError,
	RPCResponseError,
	InvalidNodeInfoError,
} from '../errors';
import {
	EVENT_BAN_PEER,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_FETCH_PEERS,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_INVALID_MESSAGE_RECEIVED,
	EVENT_INVALID_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
	EVENT_REQUEST_RECEIVED,
	EVENT_UPDATED_PEER_INFO,
	PROTOCOL_EVENTS_TO_RATE_LIMIT,
	REMOTE_EVENT_POST_NODE_INFO,
	REMOTE_EVENT_RPC_GET_NODE_INFO,
	REMOTE_EVENT_RPC_GET_PEERS_LIST,
	REMOTE_SC_EVENT_MESSAGE,
	REMOTE_SC_EVENT_RPC_REQUEST,
} from '../events';
import { P2PRequest } from '../p2p_request';
import {
	P2PInternalState,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	RPCSchemas,
	P2PSharedState,
	P2PMessagePacketBufferData,
	P2PRequestPacketBufferData,
	P2PResponsePacketBufferData,
	P2PRawRequestPacket,
	P2PRawMessagePacket,
	ProtocolPeerInfo,
	BaseRequestResponsePacket,
	PeerConfig,
} from '../types';
import {
	assignInternalInfo,
	sanitizeIncomingPeerInfo,
	validatePeerCompatibility,
	validatePeerInfo,
	validatePeerInfoList,
	validateProtocolMessage,
	validateRPCRequest,
	validatePayloadSize,
} from '../utils';
import { decodeNodeInfo } from '../utils/codec';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const socketErrorStatusCodes: { [key: number]: string | undefined } = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any
	...(socketClusterClient.SCClientSocket as any).errorStatuses,
	1000: 'Intentionally disconnected',
};

// Can be used to convert a rate which is based on the rateCalculationInterval into a per-second rate.
export const RATE_NORMALIZATION_FACTOR = 1000;

// Peer status message rate to be checked in every 10 seconds and reset
const PEER_STATUS_MESSAGE_RATE_INTERVAL = 10000;

export type SCClientSocket = socketClusterClient.SCClientSocket;

export type SCServerSocketUpdated = {
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	destroy(code?: number, data?: string | object): void;
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	on(event: string | unknown, listener: (packet?: unknown) => void): void;
	// eslint-disable-next-line @typescript-eslint/method-signature-style,@typescript-eslint/no-explicit-any
	on(event: string, listener: (packet: any, respond: any) => void): void;
} & SCServerSocket;

export enum ConnectionState {
	CONNECTING = 'connecting',
	OPEN = 'open',
	CLOSED = 'closed',
}
export interface ConnectedPeerInfo extends P2PPeerInfo {
	internalState: P2PInternalState;
}

export class Peer extends EventEmitter {
	// protected variables & handlers
	protected readonly _handleRawRPC: (
		packet: P2PRawRequestPacket,
		respond: (responseError?: Error, responseData?: unknown) => void,
	) => void;
	protected readonly _handleWSMessage: (message: string) => void;
	protected readonly _handleRawMessage: (packet: unknown) => void;
	protected _socket: SCServerSocketUpdated | SCClientSocket | undefined;
	protected _peerInfo: ConnectedPeerInfo;
	protected readonly _peerConfig: PeerConfig;
	protected _serverNodeInfo: P2PNodeInfo | undefined;
	protected _rateInterval: number;

	// private variables
	private readonly _rpcSchemas: RPCSchemas;
	private readonly _discoveryMessageCounter: {
		getPeers: number;
		getNodeInfo: number;
		postNodeInfo: number;
	};
	private readonly _peerStatusMessageRate: number;
	private readonly _peerStatusRateInterval: NodeJS.Timer;
	private readonly _counterResetInterval: NodeJS.Timer;
	private readonly _productivityResetInterval: NodeJS.Timer;

	public constructor(peerInfo: P2PPeerInfo, peerConfig: PeerConfig) {
		super();
		this._peerConfig = peerConfig;
		this._rpcSchemas = peerConfig.rpcSchemas;

		this._peerInfo = this._initializeInternalState(peerInfo) as ConnectedPeerInfo;
		this._rateInterval = this._peerConfig.rateCalculationInterval;
		this._counterResetInterval = setInterval(() => {
			this._resetCounters();
		}, this._rateInterval);
		this._productivityResetInterval = setInterval(() => {
			this._resetProductivity();
		}, DEFAULT_PRODUCTIVITY_RESET_INTERVAL);
		this._serverNodeInfo = peerConfig.serverNodeInfo;
		this._discoveryMessageCounter = {
			getPeers: 0,
			getNodeInfo: 0,
			postNodeInfo: 0,
		};
		this._peerStatusMessageRate = peerConfig.peerStatusMessageRate;
		this._peerStatusRateInterval = setInterval(() => {
			this._resetStatusMessageRate();
		}, PEER_STATUS_MESSAGE_RATE_INTERVAL);

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRawRPC = (
			packet: unknown,
			respond: (responseError?: Error, responseData?: unknown) => void,
		): void => {
			try {
				validateRPCRequest(packet);
			} catch (error) {
				respond(error as Error);
				this.emit(EVENT_INVALID_REQUEST_RECEIVED, {
					packet,
					peerId: this._peerInfo.peerId,
				});

				return;
			}
			const rawRequestPacket = packet as P2PRawRequestPacket;

			// Apply penalty when you receive getNodeInfo RPC more than once
			if (rawRequestPacket.procedure === REMOTE_EVENT_RPC_GET_NODE_INFO) {
				this._discoveryMessageCounter.getNodeInfo += 1;
				if (this._discoveryMessageCounter.getNodeInfo > 1) {
					this.applyPenalty(10);
				}
			}

			// Apply penalty when you receive getPeers RPC more than once
			if (rawRequestPacket.procedure === REMOTE_EVENT_RPC_GET_PEERS_LIST) {
				this._discoveryMessageCounter.getPeers += 1;
				if (this._discoveryMessageCounter.getPeers > 1) {
					this.applyPenalty(10);
				}
			}

			// Discovery requests are only allowed once per second. If it exceeds that, we prevent the request from propagating.
			if (
				PROTOCOL_EVENTS_TO_RATE_LIMIT.has(rawRequestPacket.procedure) &&
				this._peerInfo.internalState.rpcCounter.has(rawRequestPacket.procedure)
			) {
				this._updateRPCCounter(rawRequestPacket);

				return;
			}

			// Protocol RCP request limiter LIP-0004
			this._updateRPCCounter(rawRequestPacket);
			const rate = this._getRPCRate(rawRequestPacket);

			// Each P2PRequest contributes to the Peer's productivity.
			// A P2PRequest can mutate this._productivity from the current Peer instance.
			const request = new P2PRequest(
				{
					procedure: rawRequestPacket.procedure,
					data: rawRequestPacket.data,
					id: this.peerInfo.peerId,
					rate,
					productivity: this.internalState.productivity,
				},
				respond,
			);

			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		this._handleWSMessage = (): void => {
			this._peerInfo.internalState.wsMessageCount += 1;
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRawMessage = (packet: unknown): void => {
			try {
				validateProtocolMessage(packet);
			} catch (error) {
				this.emit(EVENT_INVALID_MESSAGE_RECEIVED, {
					packet,
					peerId: this._peerInfo.peerId,
				});

				return;
			}
			const message = packet as P2PRawMessagePacket;

			this._updateMessageCounter(message);
			const rate = this._getMessageRate(message);
			const messageBufferData = this._getBufferData(message.data);

			if (message.event === REMOTE_EVENT_POST_NODE_INFO) {
				this._discoveryMessageCounter.postNodeInfo += 1;
				if (this._discoveryMessageCounter.postNodeInfo > this._peerStatusMessageRate) {
					this.applyPenalty(10);
				}
				this._handleUpdateNodeInfo({ ...message, data: messageBufferData });
			}
			const messageWithRateInfo = {
				...message,
				data: messageBufferData,
				peerId: this._peerInfo.peerId,
				rate,
			};

			this.emit(EVENT_MESSAGE_RECEIVED, messageWithRateInfo);
		};
	}

	// Getters
	public get id(): string {
		return this._peerInfo.peerId;
	}

	public get ipAddress(): string {
		return this._peerInfo.ipAddress;
	}

	public get port(): number {
		return this._peerInfo.port;
	}

	public get internalState(): P2PInternalState {
		return this.peerInfo.internalState;
	}

	public get peerInfo(): ConnectedPeerInfo {
		return this._peerInfo;
	}

	public get state(): ConnectionState {
		// eslint-disable-next-line no-nested-ternary
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

	public updatePeerInfo(newPeerInfo: P2PPeerInfo): void {
		// The ipAddress and port properties cannot be updated after the initial discovery.
		this._peerInfo = {
			sharedState: newPeerInfo.sharedState,
			internalState: this._peerInfo.internalState,
			ipAddress: this.ipAddress,
			port: this.port,
			peerId: this.id,
		};
	}

	public connect(): void {
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}
	}

	public disconnect(code: number = INTENTIONAL_DISCONNECT_CODE, reason?: string): void {
		clearInterval(this._counterResetInterval);
		clearInterval(this._productivityResetInterval);
		clearInterval(this._peerStatusRateInterval);

		if (this._socket) {
			this._socket.destroy(code, reason);
		}
	}

	public send(packet: P2PMessagePacketBufferData): void {
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}

		const data = this._getBase64Data(packet.data);
		this._socket.emit(REMOTE_SC_EVENT_MESSAGE, {
			event: packet.event,
			data,
		});
	}

	public async request(packet: P2PRequestPacketBufferData): Promise<P2PResponsePacketBufferData> {
		return new Promise<P2PResponsePacketBufferData>(
			(
				resolve: (result: P2PResponsePacketBufferData) => void,
				reject: (result: Error) => void,
			): void => {
				if (!this._socket) {
					throw new Error('Peer socket does not exist');
				}

				const data = this._getBase64Data(packet.data);
				this._socket.emit(
					REMOTE_SC_EVENT_RPC_REQUEST,
					{
						procedure: packet.procedure,
						data,
					},
					(error: Error | undefined, responseData: unknown) => {
						if (error) {
							reject(error);

							return;
						}

						const response = responseData as BaseRequestResponsePacket | undefined;
						if (response) {
							const responseBufferData = {
								peerId: response.peerId,
								data: this._getBufferData(response.data),
							};
							resolve(responseBufferData);

							return;
						}

						reject(
							new RPCResponseError(
								`Failed to handle response for procedure ${packet.procedure}`,
								`${this.ipAddress}:${this.port}`,
							),
						);
					},
				);
			},
		);
	}

	public async fetchPeers(): Promise<ReadonlyArray<P2PPeerInfo>> {
		try {
			const response = await this.request({
				procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
			});

			if (!response.data) {
				throw new InvalidPeerInfoListError(INVALID_PEER_INFO_LIST_REASON);
			}

			const { peers } = codec.decode<{ peers: Buffer[] }>(
				this._rpcSchemas.peerRequestResponse,
				response.data,
			);
			const sanitizedPeersList = peers.map<P2PPeerInfo>((peerInfoBuffer: Buffer) => {
				const peerInfo = codec.decode<ProtocolPeerInfo>(this._rpcSchemas.peerInfo, peerInfoBuffer);
				return sanitizeIncomingPeerInfo(peerInfo);
			});

			validatePeerInfoList(
				sanitizedPeersList,
				this._peerConfig.maxPeerDiscoveryResponseLength,
				this._peerConfig.maxPeerInfoSize,
			);

			return sanitizedPeersList.map(peerInfo => ({
				...peerInfo,
				sourceAddress: this.ipAddress,
			}));
		} catch (error) {
			if (error instanceof InvalidPeerInfoError || error instanceof InvalidPeerInfoListError) {
				this.applyPenalty(INVALID_PEER_LIST_PENALTY);
			}

			this.emit(EVENT_FAILED_TO_FETCH_PEERS, error);

			throw new RPCResponseError('Failed to fetch peer list of peer', this.ipAddress);
		}
	}

	public async discoverPeers(): Promise<ReadonlyArray<P2PPeerInfo>> {
		const discoveredPeerInfoList = await this.fetchPeers();

		discoveredPeerInfoList.forEach(peerInfo => {
			this.emit(EVENT_DISCOVERED_PEER, peerInfo);
		});

		return discoveredPeerInfoList;
	}

	public async fetchAndUpdateStatus(): Promise<P2PPeerInfo> {
		let response: P2PResponsePacketBufferData;
		try {
			response = await this.request({
				procedure: REMOTE_EVENT_RPC_GET_NODE_INFO,
			});
		} catch (error) {
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);

			throw new RPCResponseError(
				'Failed to fetch peer info of peer',
				`${this.ipAddress}:${this.port}`,
			);
		}
		try {
			const receivedNodeInfo = decodeNodeInfo(this._rpcSchemas.nodeInfo, response.data);
			this._updateFromProtocolPeerInfo(receivedNodeInfo);
		} catch (error) {
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);

			// Apply penalty for malformed PeerInfo
			if (error instanceof InvalidNodeInfoError) {
				this.applyPenalty(INVALID_PEER_INFO_PENALTY);
			}

			throw new RPCResponseError(
				'Failed to update peer info of peer due to validation of peer compatibility',
				`${this.ipAddress}:${this.port}`,
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
			(this.peerInfo.internalState.wsMessageCount * RATE_NORMALIZATION_FACTOR) / this._rateInterval;

		this._peerInfo.internalState.wsMessageCount = 0;

		if (this.peerInfo.internalState.wsMessageRate > this._peerConfig.wsMaxMessageRate) {
			// Allow to increase penalty based on message rate limit exceeded
			const messageRateExceedCoefficient = Math.floor(
				this.peerInfo.internalState.wsMessageRate / this._peerConfig.wsMaxMessageRate,
			);

			const penaltyRateMultiplier =
				messageRateExceedCoefficient > 1 ? messageRateExceedCoefficient : 1;

			this.applyPenalty(this._peerConfig.wsMaxMessageRatePenalty * penaltyRateMultiplier);
		}

		this._peerInfo.internalState.rpcRates = new Map(
			[...this.internalState.rpcCounter.entries()].map(([key, value]) => {
				const rate = value / this._rateInterval;

				// Protocol RCP request limiter LIP-0004
				if (PROTOCOL_EVENTS_TO_RATE_LIMIT.has(key) && value > 1) {
					this.applyPenalty(this._peerConfig.wsMaxMessageRatePenalty);
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-explicit-any
				return [key, rate] as any;
			}),
		);

		this._peerInfo.internalState.rpcCounter = new Map<string, number>();

		this._peerInfo.internalState.messageRates = new Map(
			[...this.internalState.messageCounter.entries()].map(([key, value]) => {
				const rate = value / this._rateInterval;

				// eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-explicit-any
				return [key, rate] as any;
			}),
		);

		this._peerInfo.internalState.messageCounter = new Map<string, number>();
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

	private _resetStatusMessageRate(): void {
		// Reset only postNodeInfo counter to zero after every 10 seconds
		this._discoveryMessageCounter.postNodeInfo = 0;
		// Reset getPeers RPC request count to zero
		this._discoveryMessageCounter.getPeers = 0;
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
				port: this.port,
			}),
			this._peerConfig.maxPeerInfoSize,
		);

		const result = validatePeerCompatibility(peerInfo, this._serverNodeInfo);

		if (!result.success && result.error) {
			throw new Error(`${result.error} : ${peerInfo.ipAddress}:${peerInfo.port}`);
		}

		this.updatePeerInfo(peerInfo);
	}

	private _handleUpdateNodeInfo(message: P2PMessagePacketBufferData): void {
		// Update peerInfo with the latest values from the remote peer.
		try {
			// Check incoming nodeInfo size before decoding
			validatePayloadSize(message.data, this._peerConfig.maxPeerInfoSize);

			const decodedNodeInfo = decodeNodeInfo(this._rpcSchemas.nodeInfo, message.data);
			// Only update options object
			const { options } = decodedNodeInfo;
			// Only update options property
			this._peerInfo = {
				...this._peerInfo,
				sharedState: {
					...this._peerInfo.sharedState,
					options: { ...this._peerInfo.sharedState?.options, ...options },
				} as P2PSharedState,
			};
		} catch (error) {
			// Apply penalty for malformed nodeInfo update
			if (error instanceof InvalidNodeInfoError) {
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
		const count = (this.internalState.rpcCounter.get(key) ?? 0) + 1;
		this.peerInfo.internalState.rpcCounter.set(key, count);
	}

	private _getRPCRate(packet: P2PRequestPacket): number {
		const rate = this.peerInfo.internalState.rpcRates.get(packet.procedure) ?? 0;

		return rate * RATE_NORMALIZATION_FACTOR;
	}

	private _updateMessageCounter(packet: P2PMessagePacket): void {
		const key = packet.event;
		const count = (this.internalState.messageCounter.get(key) ?? 0) + 1;
		this.peerInfo.internalState.messageCounter.set(key, count);
	}

	private _getMessageRate(packet: P2PMessagePacket): number {
		const rate = this.internalState.messageRates.get(packet.event) ?? 0;

		return rate * RATE_NORMALIZATION_FACTOR;
	}

	private _initializeInternalState(peerInfo: P2PPeerInfo): P2PPeerInfo {
		return peerInfo.internalState
			? peerInfo
			: {
					...peerInfo,
					internalState: assignInternalInfo(peerInfo, this._peerConfig.secret),
			  };
	}

	// All the inbound and outbound messages communication to socket
	// Should be converted to base64 string
	// eslint-disable-next-line class-methods-use-this
	private _getBase64Data(data?: Buffer): string | undefined {
		if (data === undefined) {
			return undefined;
		}

		if (Buffer.isBuffer(data)) {
			return data.toString(DEFAULT_MESSAGE_ENCODING_FORMAT);
		}

		return data;
	}

	// eslint-disable-next-line class-methods-use-this
	private _getBufferData(data?: string): Buffer | undefined {
		if (data === undefined) {
			return undefined;
		}

		return Buffer.from(data, DEFAULT_MESSAGE_ENCODING_FORMAT);
	}
}
