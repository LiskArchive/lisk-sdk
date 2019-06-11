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

import {
	FetchPeerStatusError,
	PeerOutboundConnectionError,
	RPCResponseError,
} from '../errors';

import {
	ClientOptionsUpdated,
	ConnectAndFetchResponse,
	convertNodeInfoToLegacyFormat,
	DEFAULT_ACK_TIMEOUT,
	DEFAULT_CONNECT_TIMEOUT,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	Peer,
	PeerConfig,
	REMOTE_EVENT_MESSAGE,
	REMOTE_EVENT_RPC_REQUEST,
	REMOTE_RPC_GET_NODE_INFO,
} from './base';

import {
	P2PDiscoveredPeerInfo,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	P2PResponsePacket,
} from '../p2p_types';

import * as querystring from 'querystring';
import * as socketClusterClient from 'socketcluster-client';
import { validatePeerInfo } from '../validation';

type SCClientSocket = socketClusterClient.SCClientSocket;

export const EVENT_CONNECT_OUTBOUND = 'connectOutbound';
export const EVENT_CONNECT_ABORT_OUTBOUND = 'connectAbortOutbound';
export const EVENT_CLOSE_OUTBOUND = 'closeOutbound';
export const EVENT_OUTBOUND_SOCKET_ERROR = 'outboundSocketError';

export interface PeerInfoAndOutboundConnection {
	readonly peerInfo: P2PDiscoveredPeerInfo;
	readonly socket: SCClientSocket;
}

export class OutboundPeer extends Peer {
	protected _socket: SCClientSocket | undefined;

	public constructor(
		peerInfo: P2PDiscoveredPeerInfo,
		peerSocket?: SCClientSocket,
		peerConfig?: PeerConfig,
	) {
		super(peerInfo, peerConfig);
		this._socket = peerSocket ? peerSocket : undefined;
		if (this._socket) {
			this._bindHandlersToOutboundSocket(this._socket);
		}
	}

	public set socket(scClientSocket: SCClientSocket) {
		if (this._socket) {
			this._unbindHandlersFromOutboundSocket(this._socket);
		}
		this._socket = scClientSocket;
		this._bindHandlersToOutboundSocket(this._socket);
	}

	public send(packet: P2PMessagePacket): void {
		if (!this._socket) {
			this._socket = this._createOutboundSocket();
		}

		super.send(packet);
	}

	public async request(packet: P2PRequestPacket): Promise<P2PResponsePacket> {
		if (!this._socket) {
			this._socket = this._createOutboundSocket();
		}

		return super.request(packet);
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
		const clientOptions: ClientOptionsUpdated = {
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
			pingTimeoutDisabled: true,
		};

		const outboundSocket = socketClusterClient.create(clientOptions);

		this._bindHandlersToOutboundSocket(outboundSocket);

		return outboundSocket;
	}

	public connect(): void {
		if (!this._socket) {
			this._socket = this._createOutboundSocket();
		}
		this._socket.connect();
	}

	public disconnect(code: number = 1000, reason?: string): void {
		super.disconnect(code, reason);
		if (this._socket) {
			this._unbindHandlersFromOutboundSocket(this._socket);
		}
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

		outboundSocket.on('close', (code: number, reason: string) => {
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
							`${basicPeerInfo.ipAddress}:${basicPeerInfo.wsPort}`,
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
