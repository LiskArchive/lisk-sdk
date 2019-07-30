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
import {
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
} from '../disconnect_status_codes';
import { RPCResponseError } from '../errors';

import {
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	P2PResponsePacket,
	ProtocolMessagePacket,
	ProtocolNodeInfo,
} from '../p2p_types';

import { P2PRequest } from '../p2p_request';

import * as socketClusterClient from 'socketcluster-client';
import { SCServerSocket } from 'socketcluster-server';
import {
	validateBasicPeersInfoList,
	validatePeerInfo,
	validateProtocolMessage,
	validateRPCRequest,
} from '../validation';

export interface ClientOptionsUpdated {
	readonly hostname: string;
	readonly port: number;
	readonly query: string;
	readonly autoConnect: boolean;
	readonly autoReconnect: boolean;
	readonly multiplex: boolean;
	readonly ackTimeout?: number;
	readonly connectTimeout?: number;
	readonly maxPayload?: number;
}

export interface Productivity {
	readonly requestCounter: number;
	readonly responseCounter: number;
	readonly responseRate: number;
	readonly lastResponded: number;
}

export type SCServerSocketUpdated = {
	destroy(code?: number, data?: string | object): void;
	on(event: string | unknown, listener: (packet?: unknown) => void): void;
	on(event: string, listener: (packet: any, respond: any) => void): void;
} & SCServerSocket;

type SCClientSocket = socketClusterClient.SCClientSocket;

// Local emitted events.
export const EVENT_REQUEST_RECEIVED = 'requestReceived';
export const EVENT_INVALID_REQUEST_RECEIVED = 'invalidRequestReceived';
export const EVENT_MESSAGE_RECEIVED = 'messageReceived';
export const EVENT_INVALID_MESSAGE_RECEIVED = 'invalidMessageReceived';
export const EVENT_BAN_PEER = 'banPeer';
export const EVENT_DISCOVERED_PEER = 'discoveredPeer';
export const EVENT_UNBAN_PEER = 'unbanPeer';
export const EVENT_UPDATED_PEER_INFO = 'updatedPeerInfo';
export const EVENT_FAILED_PEER_INFO_UPDATE = 'failedPeerInfoUpdate';
export const EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT =
	'failedToCollectPeerDetailsOnConnect';
export const EVENT_FAILED_TO_FETCH_PEERS = 'failedToFetchPeers';
export const EVENT_FAILED_TO_FETCH_PEER_INFO = 'failedToFetchPeerInfo';
export const EVENT_FAILED_TO_PUSH_NODE_INFO = 'failedToPushNodeInfo';

// Remote event or RPC names sent to or received from peers.
export const REMOTE_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_EVENT_MESSAGE = 'remote-message';

export const REMOTE_RPC_UPDATE_PEER_INFO = 'updateMyself';
export const REMOTE_RPC_GET_NODE_INFO = 'status';
export const REMOTE_RPC_GET_BASIC_PEERS_LIST = 'basicList';

export const DEFAULT_CONNECT_TIMEOUT = 2000;
export const DEFAULT_ACK_TIMEOUT = 2000;
export const DEFAULT_REPUTATION_SCORE = 100;
export const DEFAULT_RATE_INTERVAL = 1000;
export const DEFAULT_PRODUCTIVITY_RESET_INTERVAL = 20000;
export const DEFAULT_PRODUCTIVITY = {
	requestCounter: 0,
	responseCounter: 0,
	responseRate: 0,
	lastResponded: 0,
};

export enum ConnectionState {
	CONNECTING = 'connecting',
	OPEN = 'open',
	CLOSED = 'closed',
}

export const constructPeerId = (ipAddress: string, wsPort: number): string =>
	`${ipAddress}:${wsPort}`;

export const constructPeerIdFromPeerInfo = (peerInfo: P2PPeerInfo): string =>
	`${peerInfo.ipAddress}:${peerInfo.wsPort}`;

// Format the node info so that it will be valid from the perspective of both new and legacy nodes.
export const convertNodeInfoToLegacyFormat = (
	nodeInfo: P2PNodeInfo,
): ProtocolNodeInfo => {
	const { httpPort, nonce, broadhash } = nodeInfo;

	return {
		...nodeInfo,
		broadhash: broadhash ? (broadhash as string) : '',
		nonce: nonce ? (nonce as string) : '',
		httpPort: httpPort ? (httpPort as number) : 0,
	};
};

export interface PeerConfig {
	readonly connectTimeout?: number;
	readonly ackTimeout?: number;
	readonly wsMaxPayload?: number;
}

export class Peer extends EventEmitter {
	private readonly _id: string;
	protected readonly _ipAddress: string;
	protected readonly _wsPort: number;
	private readonly _height: number;
	protected _reputation: number;
	protected _latency: number;
	protected _connectTime: number;
	protected _productivity: {
		requestCounter: number;
		responseCounter: number;
		responseRate: number;
		lastResponded: number;
	};
	private _callCounter: Map<string, number>;
	private readonly _counterResetInterval: NodeJS.Timer;
	protected _peerInfo: P2PPeerInfo;
	private readonly _productivityResetInterval: NodeJS.Timer;
	protected readonly _peerConfig: PeerConfig;
	protected _nodeInfo: P2PNodeInfo | undefined;
	protected readonly _handleRawRPC: (
		packet: unknown,
		respond: (responseError?: Error, responseData?: unknown) => void,
	) => void;
	protected readonly _handleRawMessage: (packet: unknown) => void;
	protected readonly _handleRawLegacyMessagePostBlock: (
		packet: unknown,
	) => void;
	protected readonly _handleRawLegacyMessagePostTransactions: (
		packet: unknown,
	) => void;
	protected readonly _handleRawLegacyMessagePostSignatures: (
		packet: unknown,
	) => void;
	protected _socket: SCServerSocketUpdated | SCClientSocket | undefined;

	public constructor(peerInfo: P2PPeerInfo, peerConfig?: PeerConfig) {
		super();
		this._peerInfo = peerInfo;
		this._peerConfig = peerConfig ? peerConfig : {};
		this._ipAddress = peerInfo.ipAddress;
		this._wsPort = peerInfo.wsPort;
		this._id = constructPeerId(this._ipAddress, this._wsPort);
		this._height = peerInfo.height ? (peerInfo.height as number) : 0;
		this._reputation = DEFAULT_REPUTATION_SCORE;
		this._latency = 0;
		this._connectTime = Date.now();
		this._callCounter = new Map();
		this._counterResetInterval = setInterval(() => {
			this._callCounter = new Map();
		}, DEFAULT_RATE_INTERVAL);
		this._productivityResetInterval = setInterval(() => {
			// If peer has not recently responded, reset productivity to 0
			if (
				this._productivity.lastResponded <
				Date.now() - DEFAULT_PRODUCTIVITY_RESET_INTERVAL
			) {
				this._productivity = { ...DEFAULT_PRODUCTIVITY };
			}
		}, DEFAULT_PRODUCTIVITY_RESET_INTERVAL);
		this._productivity = { ...DEFAULT_PRODUCTIVITY };

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
			} catch (err) {
				this.emit(EVENT_INVALID_REQUEST_RECEIVED, {
					packet,
					peerId: this._id,
				});

				return;
			}

			const rate = this._getPeerRate(packet as P2PRequestPacket);

			const request = new P2PRequest(
				{
					procedure: rawRequest.procedure,
					data: rawRequest.data,
					id: this._id,
					rate,
					productivity: this._productivity,
				},
				respond,
			);

			if (rawRequest.procedure === REMOTE_RPC_UPDATE_PEER_INFO) {
				this._handleUpdatePeerInfo(request);
			} else if (rawRequest.procedure === REMOTE_RPC_GET_NODE_INFO) {
				this._handleGetNodeInfo(request);
			}

			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRawMessage = (packet: unknown) => {
			// TODO later: Switch to LIP protocol format.
			// tslint:disable-next-line:no-let
			let message;
			try {
				message = validateProtocolMessage(packet);
			} catch (err) {
				this.emit(EVENT_INVALID_MESSAGE_RECEIVED, {
					packet,
					peerId: this._id,
				});

				return;
			}

			const rate = this._getPeerRate(packet as P2PRequestPacket);
			const messageWithRateInfo = {
				...message,
				peerId: this._id,
				rate,
			};

			this.emit(EVENT_MESSAGE_RECEIVED, messageWithRateInfo);
		};

		// TODO later: Delete the following legacy message handlers.
		// For the next LIP version, the send method will always emit a 'remote-message' event on the socket.
		this._handleRawLegacyMessagePostBlock = (data: unknown) => {
			this._handleRawMessage({
				event: 'postBlock',
				data,
			});
		};

		this._handleRawLegacyMessagePostTransactions = (data: unknown) => {
			this._handleRawMessage({
				event: 'postTransactions',
				data,
			});
		};

		this._handleRawLegacyMessagePostSignatures = (data: unknown) => {
			this._handleRawMessage({
				event: 'postSignatures',
				data,
			});
		};
	}

	public get height(): number {
		return this._height;
	}

	public get id(): string {
		return this._id;
	}

	public get ipAddress(): string {
		return this._ipAddress;
	}

	public get reputation(): number {
		return this._reputation;
	}

	public get latency(): number {
		return this._latency;
	}

	public get connectTime(): number {
		return this._connectTime;
	}

	public get responseRate(): number {
		return this._productivity.responseRate;
	}

	public get productivity(): Productivity {
		return { ...this._productivity };
	}

	public updatePeerInfo(newPeerInfo: P2PDiscoveredPeerInfo): void {
		// The ipAddress and wsPort properties cannot be updated after the initial discovery.
		this._peerInfo = {
			...newPeerInfo,
			ipAddress: this._ipAddress,
			wsPort: this._wsPort,
		};
	}

	public get peerInfo(): P2PPeerInfo {
		return this._peerInfo;
	}

	public applyPenalty(penalty: number): void {
		this._reputation -= penalty;
		if (this._reputation <= 0) {
			this._banPeer();
		}
	}

	public get wsPort(): number {
		return this._wsPort;
	}

	public get state(): ConnectionState {
		const state = this._socket
			? this._socket.state === this._socket.OPEN
				? ConnectionState.OPEN
				: ConnectionState.CLOSED
			: ConnectionState.CLOSED;

		return state;
	}

	/**
	 * This is not a declared as a setter because this method will need
	 * invoke an async RPC on the socket to pass it the new node status.
	 */
	public async applyNodeInfo(nodeInfo: P2PNodeInfo): Promise<void> {
		this._nodeInfo = nodeInfo;
		// TODO later: This conversion step will not be needed after switching to the new LIP protocol version.
		const legacyNodeInfo = convertNodeInfoToLegacyFormat(this._nodeInfo);
		// TODO later: Consider using send instead of request for updateMyself for the next LIP protocol version.
		await this.request({
			procedure: REMOTE_RPC_UPDATE_PEER_INFO,
			data: legacyNodeInfo,
		});
	}

	public get nodeInfo(): P2PNodeInfo | undefined {
		return this._nodeInfo;
	}

	public connect(): void {
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}
	}

	public disconnect(code: number = 1000, reason?: string): void {
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

		const legacyEvents = ['postBlock', 'postTransactions', 'postSignatures'];
		// TODO later: Legacy events will no longer be required after migrating to the LIP protocol version.
		if (legacyEvents.includes(packet.event)) {
			// Emit legacy remote events.
			this._socket.emit(packet.event, packet.data);
		} else {
			this._socket.emit(REMOTE_EVENT_MESSAGE, {
				event: packet.event,
				data: packet.data,
			});
		}
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
					REMOTE_EVENT_RPC_REQUEST,
					{
						type: '/RPCRequest',
						procedure: packet.procedure,
						data: packet.data,
					},
					(err: Error | undefined, responseData: unknown) => {
						if (err) {
							reject(err);

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

	public async fetchPeers(): Promise<ReadonlyArray<P2PPeerInfo>> {
		try {
			const response: P2PResponsePacket = await this.request({
				procedure: REMOTE_RPC_GET_BASIC_PEERS_LIST,
			});

			return validateBasicPeersInfoList(response.data);
		} catch (error) {
			this.emit(EVENT_FAILED_TO_FETCH_PEERS, error);

			throw new RPCResponseError(
				'Failed to fetch peer list of peer',
				this.ipAddress,
			);
		}
	}

	public async discoverPeers(): Promise<ReadonlyArray<P2PPeerInfo>> {
		const discoveredPeerInfoList = await this.fetchPeers();
		discoveredPeerInfoList.forEach(peerInfo => {
			this.emit(EVENT_DISCOVERED_PEER, peerInfo);
		});

		return discoveredPeerInfoList;
	}

	public async fetchStatus(): Promise<P2PPeerInfo> {
		// tslint:disable-next-line:no-let
		let response: P2PResponsePacket;
		try {
			response = await this.request({
				procedure: REMOTE_RPC_GET_NODE_INFO,
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

			throw new RPCResponseError(
				'Failed to update peer info of peer as part of fetch operation',
				`${this.ipAddress}:${this.wsPort}`,
			);
		}

		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);

		// Return the updated detailed peer info.
		return this._peerInfo;
	}

	private _updateFromProtocolPeerInfo(rawPeerInfo: unknown): void {
		const protocolPeerInfo = { ...rawPeerInfo, ip: this._ipAddress };
		const newPeerInfo = validatePeerInfo(
			protocolPeerInfo,
		) as P2PDiscoveredPeerInfo;
		this.updatePeerInfo(newPeerInfo);
	}

	private _handleUpdatePeerInfo(request: P2PRequest): void {
		// Update peerInfo with the latest values from the remote peer.
		try {
			this._updateFromProtocolPeerInfo(request.data);
		} catch (error) {
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
			request.error(error);

			return;
		}

		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);
		request.end();
	}

	private _handleGetNodeInfo(request: P2PRequest): void {
		const legacyNodeInfo = this._nodeInfo
			? convertNodeInfoToLegacyFormat(this._nodeInfo)
			: {};
		request.end(legacyNodeInfo);
	}

	private _banPeer(): void {
		this.emit(EVENT_BAN_PEER, this._id);
		this.disconnect(FORBIDDEN_CONNECTION, FORBIDDEN_CONNECTION_REASON);
	}

	private _getPeerRate(packet: unknown): number {
		const key = (packet as P2PRequestPacket).procedure
			? (packet as P2PRequestPacket).procedure
			: (packet as ProtocolMessagePacket).event;
		if (!this._callCounter.has(key)) {
			this._callCounter.set(key, 0);
		}
		const callCount = (this._callCounter.get(key) as number) + 1;

		return callCount / DEFAULT_RATE_INTERVAL;
	}
}
