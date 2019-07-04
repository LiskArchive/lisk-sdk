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
	RequestFailError,
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

type ClientOptions = socketClusterClient.SCClientSocket.ClientOptions;
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
export const EVENT_OUTBOUND_SOCKET_ERROR = 'outboundSocketError';
export const EVENT_INBOUND_SOCKET_ERROR = 'inboundSocketError';
export const EVENT_DISCOVERED_PEER = 'discoveredPeer';
export const EVENT_FAILED_TO_FETCH_PEER_INFO = 'failedToFetchPeerInfo';
export const EVENT_FAILED_TO_PUSH_NODE_INFO = 'failedToPushNodeInfo';
// Remote event or RPC names sent to or received from peers.
export const REMOTE_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_EVENT_MESSAGE = 'remote-message';

export const REMOTE_RPC_UPDATE_PEER_INFO = 'updateMyself';
export const REMOTE_RPC_GET_NODE_INFO = 'status';
export const REMOTE_RPC_GET_ALL_PEERS_LIST = 'list';

export const DEFAULT_CONNECT_TIMEOUT = 2000;
export const DEFAULT_ACK_TIMEOUT = 2000;

type SCServerSocketUpdated = {
	destroy(code?: number, data?: string | object): void;
	on(event: string | unknown, listener: (packet?: unknown) => void): void;
	on(event: string, listener: (packet: any, respond: any) => void): void;
} & SCServerSocket;

export enum ConnectionState {
	CONNECTING = 0,
	CONNECTED = 1,
	DISCONNECTED = 2,
}

export interface PeerConnectionState {
	readonly inbound: ConnectionState;
	readonly outbound: ConnectionState;
}

export const constructPeerId = (ipAddress: string, wsPort: number): string =>
	`${ipAddress}:${wsPort}`;

export const constructPeerIdFromPeerInfo = (peerInfo: P2PPeerInfo): string =>
	`${peerInfo.ipAddress}:${peerInfo.wsPort}`;

// Format the node info so that it will be valid from the perspective of both new and legacy nodes.
const convertNodeInfoToLegacyFormat = (
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
export interface PeerSockets {
	readonly outbound?: SCClientSocket;
	readonly inbound?: SCServerSocket;
}

export class Peer extends EventEmitter {
	private readonly _id: string;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private readonly _height: number;
	private _peerInfo: P2PDiscoveredPeerInfo;
	private readonly _peerConfig: PeerConfig;
	private _nodeInfo: P2PNodeInfo | undefined;
	private _inboundSocket: SCServerSocketUpdated | undefined;
	private _outboundSocket: SCClientSocket | undefined;
	private readonly _handleRawRPC: (
		packet: unknown,
		respond: (responseError?: Error, responseData?: unknown) => void,
	) => void;
	private readonly _handleRawMessage: (packet: unknown) => void;
	private readonly _handleRawLegacyMessagePostBlock: (packet: unknown) => void;
	private readonly _handleRawLegacyMessagePostTransactions: (
		packet: unknown,
	) => void;
	private readonly _handleRawLegacyMessagePostSignatures: (
		packet: unknown,
	) => void;
	private readonly _handleInboundSocketError: (error: Error) => void;

	public constructor(
		peerInfo: P2PDiscoveredPeerInfo,
		peerConfig?: PeerConfig,
		peerSockets?: PeerSockets,
	) {
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

		this._inboundSocket = peerSockets ? peerSockets.inbound : undefined;
		if (this._inboundSocket) {
			this._bindHandlersToInboundSocket(this._inboundSocket);
		}
		this._outboundSocket = peerSockets ? peerSockets.outbound : undefined;
		if (this._outboundSocket) {
			this._bindHandlersToOutboundSocket(this._outboundSocket);
		}
	}

	public get height(): number {
		return this._height;
	}

	public get id(): string {
		return this._id;
	}

	public set inboundSocket(scServerSocket: SCServerSocket) {
		if (this._inboundSocket) {
			this._unbindHandlersFromInboundSocket(this._inboundSocket);
		}
		this._inboundSocket = scServerSocket as SCServerSocketUpdated;
		this._bindHandlersToInboundSocket(this._inboundSocket);
	}

	public get ipAddress(): string {
		return this._ipAddress;
	}

	public set outboundSocket(scClientSocket: SCClientSocket) {
		if (this._outboundSocket) {
			this._unbindHandlersFromOutboundSocket(this._outboundSocket);
		}
		this._outboundSocket = scClientSocket;
		this._bindHandlersToOutboundSocket(this._outboundSocket);
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

	public get state(): PeerConnectionState {
		const inbound = this._inboundSocket
			? this._inboundSocket.state === this._inboundSocket.OPEN
				? ConnectionState.CONNECTED
				: ConnectionState.DISCONNECTED
			: ConnectionState.DISCONNECTED;
		const outbound = this._outboundSocket
			? this._outboundSocket.state === this._outboundSocket.OPEN
				? ConnectionState.CONNECTED
				: ConnectionState.DISCONNECTED
			: ConnectionState.DISCONNECTED;

		return {
			inbound,
			outbound,
		};
	}

	public get wsPort(): number {
		return this._wsPort;
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
		if (!this._outboundSocket) {
			this._outboundSocket = this._createOutboundSocket();
		}
		this._outboundSocket.connect();
	}

	public disconnect(code: number = 1000, reason?: string): void {
		this.dropInboundConnection(code, reason);
		this.dropOutboundConnection(code, reason);
	}

	public dropInboundConnection(code: number = 1000, reason?: string): void {
		if (this._inboundSocket) {
			this._inboundSocket.destroy(code, reason);
			this._unbindHandlersFromInboundSocket(this._inboundSocket);
		}
	}

	public dropOutboundConnection(code: number = 1000, reason?: string): void {
		if (this._outboundSocket) {
			this._outboundSocket.destroy(code, reason);
			this._unbindHandlersFromOutboundSocket(this._outboundSocket);
		}
	}

	public send(packet: P2PMessagePacket): void {
		if (!this._outboundSocket) {
			this._outboundSocket = this._createOutboundSocket();
		}

		const legacyEvents = ['postBlock', 'postTransactions', 'postSignatures'];
		// TODO later: Legacy events will no longer be required after migrating to the LIP protocol version.
		if (legacyEvents.includes(packet.event)) {
			// Emit legacy remote events.
			this._outboundSocket.emit(packet.event, packet.data);
		} else {
			this._outboundSocket.emit(REMOTE_EVENT_MESSAGE, {
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
				if (!this._outboundSocket) {
					this._outboundSocket = this._createOutboundSocket();
				}
				this._outboundSocket.emit(
					REMOTE_EVENT_RPC_REQUEST,
					{
						type: '/RPCRequest',
						procedure: packet.procedure,
						data: packet.data,
					},
					(err: Error | undefined, responseData: unknown) => {
						if (err) {
							// Wrap response error within the a new custom error and add peer id and version info
							reject(
								new RequestFailError(
									err instanceof Error ? err.message : err,
									err,
									constructPeerIdFromPeerInfo(this._peerInfo),
									this._peerInfo.version,
								),
							);

							return;
						}

						if (responseData) {
							resolve(responseData as P2PResponsePacket);

							return;
						}

						reject(
							new RPCResponseError(
								`Failed to handle response for procedure ${packet.procedure}`,
								constructPeerIdFromPeerInfo(this._peerInfo),
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
				constructPeerIdFromPeerInfo(this._peerInfo),
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
				constructPeerIdFromPeerInfo(this._peerInfo),
			);
		}

		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);

		// Return the updated detailed peer info.
		return this._peerInfo;
	}

	private _createOutboundSocket(): SCClientSocket {
		const legacyNodeInfo = this._nodeInfo
			? convertNodeInfoToLegacyFormat(this._nodeInfo)
			: undefined;

		const connectTimeout = this._peerConfig.connectTimeout
			? this._peerConfig.connectTimeout
			: DEFAULT_CONNECT_TIMEOUT;
		const ackTimeout = this._peerConfig.ackTimeout
			? this._peerConfig.ackTimeout
			: DEFAULT_ACK_TIMEOUT;

		// Ideally, we should JSON-serialize the whole NodeInfo object but this cannot be done for compatibility reasons, so instead we put it inside an options property.
		const clientOptions: ClientOptions = {
			hostname: this._ipAddress,
			port: this._wsPort,
			query: querystring.stringify({
				...legacyNodeInfo,
				options: JSON.stringify(legacyNodeInfo),
			}),
			connectTimeout,
			ackTimeout,
			multiplex: false,
			autoConnect: false,
			autoReconnect: false,
		};

		const outboundSocket = socketClusterClient.create(clientOptions);

		this._bindHandlersToOutboundSocket(outboundSocket);

		return outboundSocket;
	}

	private async _updatePeerOnConnect(): Promise<void> {
		// tslint:disable-next-line no-let
		let detailedPeerInfo;
		try {
			detailedPeerInfo = await this.fetchStatus();
		} catch (error) {
			this.emit(EVENT_FAILED_TO_FETCH_PEER_INFO, error);

			return;
		}
		this.emit(EVENT_DISCOVERED_PEER, detailedPeerInfo);
	}

	// All event handlers for the outbound socket should be bound in this method.
	private _bindHandlersToOutboundSocket(outboundSocket: SCClientSocket): void {
		outboundSocket.on('error', (error: Error) => {
			this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
		});

		outboundSocket.on('connect', async () => {
			this.emit(EVENT_CONNECT_OUTBOUND, this._peerInfo);

			await this._updatePeerOnConnect();
		});

		outboundSocket.on('connectAbort', () => {
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, this._peerInfo);
		});

		outboundSocket.on('close', (code, reason) => {
			this.emit(EVENT_CLOSE_OUTBOUND, {
				peerInfo: this._peerInfo,
				code,
				reason,
			});
		});

		// Bind RPC and remote event handlers
		outboundSocket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		outboundSocket.on(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		outboundSocket.on('postBlock', this._handleRawLegacyMessagePostBlock);
		outboundSocket.on(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		outboundSocket.on(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}

	// All event handlers for the outbound socket should be unbound in this method.
	/* tslint:disable-next-line:prefer-function-over-method*/
	private _unbindHandlersFromOutboundSocket(
		outboundSocket: SCClientSocket,
	): void {
		// Do not unbind the error handler because error could still throw after disconnect.
		// We don't want to have uncaught errors.
		outboundSocket.off('connect');
		outboundSocket.off('connectAbort');
		outboundSocket.off('close');

		// Unbind RPC and remote event handlers
		outboundSocket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		outboundSocket.off(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		outboundSocket.off('postBlock', this._handleRawLegacyMessagePostBlock);
		outboundSocket.off(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		outboundSocket.off(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}

	// All event handlers for the inbound socket should be bound in this method.
	private _bindHandlersToInboundSocket(
		inboundSocket: SCServerSocketUpdated,
	): void {
		inboundSocket.on('error', this._handleInboundSocketError);

		// Bind RPC and remote event handlers
		inboundSocket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.on(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		inboundSocket.on('postBlock', this._handleRawLegacyMessagePostBlock);
		inboundSocket.on(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		inboundSocket.on(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}

	// All event handlers for the inbound socket should be unbound in this method.
	private _unbindHandlersFromInboundSocket(
		inboundSocket: SCServerSocket,
	): void {
		// Unbind RPC and remote event handlers
		inboundSocket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.off(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		inboundSocket.off('postBlock', this._handleRawLegacyMessagePostBlock);
		inboundSocket.off(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		inboundSocket.off(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}

	private _updateFromProtocolPeerInfo(rawPeerInfo: unknown): void {
		const protocolPeerInfo = {
			...rawPeerInfo,
			ip: this._ipAddress,
			wsPort: this._wsPort,
		};
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
			const clientOptions: ClientOptions = {
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
							constructPeerIdFromPeerInfo(basicPeerInfo),
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
