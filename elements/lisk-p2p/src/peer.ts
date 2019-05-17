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
import * as querystring from 'querystring';
import {
	FetchPeerStatusError,
	PeerOutboundConnectionError,
	RPCResponseError,
} from './errors';

import {
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	P2PResponsePacket,
	ProtocolNodeInfo,
} from './p2p_types';

import { P2PRequest } from './p2p_request';

import * as socketClusterClient from 'socketcluster-client';
import { SCServerSocket } from 'socketcluster-server';
import {
	validatePeerInfo,
	validatePeerInfoList,
	validateProtocolMessage,
	validateRPCRequest,
} from './validation';

// This interface is needed because pingTimeoutDisabled is missing from ClientOptions in socketcluster-client.
export interface ClientOptionsUpdated {
	readonly hostname: string;
	readonly port: number;
	readonly query: string;
	readonly autoConnect: boolean;
	readonly autoReconnect: boolean;
	readonly pingTimeoutDisabled: boolean;
	readonly multiplex: boolean;
	readonly ackTimeout?: number;
	readonly connectTimeout?: number;
}

export type SCServerSocketUpdated = {
	destroy(code?: number, data?: string | object): void;
	on(event: string | unknown, listener: (packet?: unknown) => void): void;
	on(event: string, listener: (packet: any, respond: any) => void): void;
} & SCServerSocket;

type SCClientSocket = socketClusterClient.SCClientSocket;

// Local emitted events.
export const EVENT_UPDATED_PEER_INFO = 'updatedPeerInfo';
export const EVENT_FAILED_PEER_INFO_UPDATE = 'failedPeerInfoUpdate';
export const EVENT_REQUEST_RECEIVED = 'requestReceived';
export const EVENT_INVALID_REQUEST_RECEIVED = 'invalidRequestReceived';
export const EVENT_MESSAGE_RECEIVED = 'messageReceived';
export const EVENT_INVALID_MESSAGE_RECEIVED = 'invalidMessageReceived';
export const EVENT_CONNECT_OUTBOUND = 'connectOutbound';
export const EVENT_CONNECT_ABORT_OUTBOUND = 'connectAbortOutbound';
export const EVENT_CLOSE_OUTBOUND = 'closeOutbound';
export const EVENT_CLOSE_INBOUND = 'closeInbound';
export const EVENT_OUTBOUND_SOCKET_ERROR = 'outboundSocketError';
export const EVENT_INBOUND_SOCKET_ERROR = 'inboundSocketError';

// Remote event or RPC names sent to or received from peers.
export const REMOTE_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_EVENT_MESSAGE = 'remote-message';

export const REMOTE_RPC_UPDATE_PEER_INFO = 'updateMyself';
export const REMOTE_RPC_GET_NODE_INFO = 'status';
export const REMOTE_RPC_GET_ALL_PEERS_LIST = 'list';

export const DEFAULT_CONNECT_TIMEOUT = 2000;
export const DEFAULT_ACK_TIMEOUT = 2000;

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
}

export class Peer extends EventEmitter {
	private readonly _id: string;
	protected readonly _ipAddress: string;
	protected readonly _wsPort: number;
	private readonly _height: number;
	protected _peerInfo: P2PDiscoveredPeerInfo;
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
	protected readonly _handleInboundSocketError: (error: Error) => void;
	protected readonly _handleInboundSocketClose: (
		code: number,
		reason: string,
	) => void;
	protected _socket: SCServerSocketUpdated | SCClientSocket | undefined;

	public constructor(peerInfo: P2PDiscoveredPeerInfo, peerConfig?: PeerConfig) {
		super();
		this._peerInfo = peerInfo;
		this._peerConfig = peerConfig ? peerConfig : {};
		this._ipAddress = peerInfo.ipAddress;
		this._wsPort = peerInfo.wsPort;
		this._id = constructPeerId(this._ipAddress, this._wsPort);
		this._height = peerInfo.height ? peerInfo.height : 0;

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
				this.emit(EVENT_INVALID_REQUEST_RECEIVED, packet);

				return;
			}
			const request = new P2PRequest(
				rawRequest.procedure,
				rawRequest.data,
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
			let protocolMessage;
			try {
				protocolMessage = validateProtocolMessage(packet);
			} catch (err) {
				this.emit(EVENT_INVALID_MESSAGE_RECEIVED, packet);

				return;
			}

			this.emit(EVENT_MESSAGE_RECEIVED, protocolMessage);
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

		this._handleInboundSocketError = (error: Error) => {
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};

		this._handleInboundSocketClose = (code, reason) => {
			this.emit(EVENT_CLOSE_INBOUND, {
				peerInfo: this._peerInfo,
				code,
				reason,
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

	public updatePeerInfo(newPeerInfo: P2PDiscoveredPeerInfo): void {
		// The ipAddress and wsPort properties cannot be updated after the initial discovery.
		this._peerInfo = {
			...newPeerInfo,
			ipAddress: this._ipAddress,
			wsPort: this._wsPort,
		};
	}

	public get peerInfo(): P2PDiscoveredPeerInfo {
		return this._peerInfo;
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
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}
		this._socket.destroy(code, reason);
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
								this.ipAddress,
								this.wsPort,
							),
						);
					},
				);
			},
		);
	}

	public async fetchPeers(): Promise<ReadonlyArray<P2PDiscoveredPeerInfo>> {
		try {
			const response: P2PResponsePacket = await this.request({
				procedure: REMOTE_RPC_GET_ALL_PEERS_LIST,
			});

			return validatePeerInfoList(response.data);
		} catch (error) {
			throw new RPCResponseError(
				'Failed to fetch peer list of peer',
				this.ipAddress,
				this.wsPort,
			);
		}
	}

	public async fetchStatus(): Promise<P2PDiscoveredPeerInfo> {
		try {
			const response: P2PResponsePacket = await this.request({
				procedure: REMOTE_RPC_GET_NODE_INFO,
			});

			this._updateFromProtocolPeerInfo(response.data);
		} catch (error) {
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);

			throw new RPCResponseError(
				'Failed to fetch peer info of peer',
				this.ipAddress,
				this.wsPort,
			);
		}

		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);

		// Return the updated detailed peer info.
		return this._peerInfo;
	}

	private _updateFromProtocolPeerInfo(rawPeerInfo: unknown): void {
		const protocolPeerInfo = { ...rawPeerInfo, ip: this._ipAddress };
		const newPeerInfo = validatePeerInfo(protocolPeerInfo);
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
}

export interface ConnectAndFetchResponse {
	readonly responsePacket: P2PResponsePacket;
	readonly socket: SCClientSocket;
}

export interface PeerInfoAndOutboundConnection {
	readonly peerInfo: P2PDiscoveredPeerInfo;
	readonly socket: SCClientSocket;
}

export const connectAndRequest = async (
	basicPeerInfo: P2PPeerInfo,
	procedure: string,
	nodeInfo?: P2PNodeInfo,
	peerConfig?: PeerConfig,
): Promise<ConnectAndFetchResponse> =>
	new Promise<ConnectAndFetchResponse>(
		(resolve, reject): void => {
			const legacyNodeInfo = nodeInfo
				? convertNodeInfoToLegacyFormat(nodeInfo)
				: undefined;
			// Add a new field discovery to tell the receiving side that the connection will be short lived
			const requestPacket = {
				procedure,
			};
			// Ideally, we should JSON-serialize the whole NodeInfo object but this cannot be done for compatibility reasons, so instead we put it inside an options property.
			const clientOptions: ClientOptionsUpdated = {
				hostname: basicPeerInfo.ipAddress,
				port: basicPeerInfo.wsPort,
				query: querystring.stringify({
					...legacyNodeInfo,
					options: JSON.stringify(legacyNodeInfo),
				}),
				connectTimeout: peerConfig
					? peerConfig.connectTimeout
						? peerConfig.connectTimeout
						: DEFAULT_CONNECT_TIMEOUT
					: DEFAULT_CONNECT_TIMEOUT,
				ackTimeout: peerConfig
					? peerConfig.connectTimeout
						? peerConfig.connectTimeout
						: DEFAULT_CONNECT_TIMEOUT
					: DEFAULT_ACK_TIMEOUT,
				multiplex: false,
				autoConnect: false,
				autoReconnect: false,
				pingTimeoutDisabled: true,
			};

			const outboundSocket = socketClusterClient.create(clientOptions);
			// Bind an error handler immediately after creating the socket; otherwise errors may crash the process
			// tslint:disable-next-line no-empty
			outboundSocket.on('error', () => {});

			// tslint:disable-next-line no-let
			let disconnectStatusCode: number;
			// tslint:disable-next-line no-let
			let disconnectReason: string;
			const closeHandler = (statusCode: number, reason: string) => {
				disconnectStatusCode = statusCode;
				disconnectReason = reason;
			};
			outboundSocket.once('close', closeHandler);

			// Attaching handlers for various events that could be used future for logging or any other application
			outboundSocket.emit(
				REMOTE_EVENT_RPC_REQUEST,
				{
					type: '/RPCRequest',
					procedure: requestPacket.procedure,
				},
				(err: Error | undefined, responseData: unknown) => {
					outboundSocket.off('close', closeHandler);
					if (err) {
						const isFailedConnection =
							disconnectReason &&
							(err.name === 'TimeoutError' ||
								err.name === 'BadConnectionError');
						const connectionError = new PeerOutboundConnectionError(
							isFailedConnection ? disconnectReason : err.message,
							disconnectStatusCode,
						);
						reject(connectionError);

						return;
					}
					if (responseData) {
						const responsePacket = responseData as P2PResponsePacket;
						resolve({
							responsePacket,
							socket: outboundSocket,
						});

						return;
					}

					reject(
						new RPCResponseError(
							`Failed to handle response for procedure ${
								requestPacket.procedure
							}`,
							basicPeerInfo.ipAddress,
							basicPeerInfo.wsPort,
						),
					);
				},
			);
		},
	);

export const connectAndFetchPeerInfo = async (
	basicPeerInfo: P2PPeerInfo,
	nodeInfo?: P2PNodeInfo,
	peerConfig?: PeerConfig,
): Promise<PeerInfoAndOutboundConnection> => {
	try {
		const { responsePacket, socket } = await connectAndRequest(
			basicPeerInfo,
			REMOTE_RPC_GET_NODE_INFO,
			nodeInfo,
			peerConfig,
		);

		const protocolPeerInfo = responsePacket.data;
		const rawPeerInfo = {
			...protocolPeerInfo,
			ip: basicPeerInfo.ipAddress,
			wsPort: basicPeerInfo.wsPort,
		};
		const peerInfo = validatePeerInfo(rawPeerInfo);

		return { peerInfo, socket };
	} catch (error) {
		throw new FetchPeerStatusError(
			`Error occurred while fetching information from ${
				basicPeerInfo.ipAddress
			}:${basicPeerInfo.wsPort}`,
		);
	}
};
