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
import { RPCResponseError } from './errors';

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
export const EVENT_DISCONNECT_OUTBOUND = 'disconnectOutbound';
export const EVENT_FAILED_TO_PUSH_NODE_INFO = 'failedToPushNodeInfo';

// Remote event or RPC names sent to or received from peers.
export const REMOTE_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_EVENT_MESSAGE = 'remote-message';

export const REMOTE_RPC_NODE_INFO = 'updateMyself';
export const REMOTE_RPC_GET_ALL_PEERS_LIST = 'list';

type SCServerSocketUpdated = {
	destroy(code?: number, data?: string | object): void;
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
	`${ipAddress}:${wsPort}`

export const constructPeerIdFromPeerInfo = (peerInfo: P2PPeerInfo): string =>
	`${peerInfo.ipAddress}:${peerInfo.wsPort}`

export class Peer extends EventEmitter {
	private readonly _id: string;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private readonly _height: number;
	private _peerInfo: P2PPeerInfo;
	private _peerDetailedInfo: P2PDiscoveredPeerInfo | undefined;
	private _nodeInfo: P2PNodeInfo | undefined;
	private _inboundSocket: SCServerSocketUpdated | undefined;
	private _outboundSocket: SCClientSocket | undefined;
	private readonly _handleRawRPC: (
		packet: unknown,
		respond: (responseError?: Error, responseData?: unknown) => void,
	) => void;
	private readonly _handleRawMessage: (packet: unknown) => void;

	public constructor(peerInfo: P2PPeerInfo, inboundSocket?: SCServerSocket) {
		super();
		this._peerInfo = peerInfo;
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

			if (rawRequest.procedure === REMOTE_RPC_NODE_INFO) {
				this._handlePeerInfo(request);
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

		this._inboundSocket = inboundSocket as SCServerSocketUpdated;
		if (this._inboundSocket) {
			this._bindHandlersToInboundSocket(this._inboundSocket);
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
		this._outboundSocket = scClientSocket;
	}

	public updatePeerInfo(newPeerInfo: P2PDiscoveredPeerInfo): void {
		this._peerInfo = {
			height: newPeerInfo.height,
			ipAddress: this._peerInfo.ipAddress,
			wsPort: this._peerInfo.wsPort,
			isDiscoveredPeer: true,
		};

		this._peerDetailedInfo = newPeerInfo;
	}

	public get peerInfo(): P2PPeerInfo {
		return this._peerInfo;
	}

	public get detailedPeerInfo(): P2PDiscoveredPeerInfo | undefined {
		return this._peerDetailedInfo;
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
	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		// TODO later: This conversion step will not be needed after switching to the new LIP protocol version.
		const legacyNodeInfo = this._convertNodeInfoToLegacyFormat(this._nodeInfo);
		// TODO later: Consider using send instead of request for updateMyself for the next LIP protocol version.
		try {
			this.request({
				procedure: REMOTE_RPC_NODE_INFO,
				data: legacyNodeInfo,
			});
		} catch (error) {
			this.emit(EVENT_FAILED_TO_PUSH_NODE_INFO, error);
		}
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
		this._outboundSocket.emit(REMOTE_EVENT_MESSAGE, {
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
							reject(err);

							return;
						}

						if (responseData) {
							resolve(responseData as P2PResponsePacket);

							return;
						}

						// TODO ASAP: Create new Error type in errors/ directory.
						const error = new Error('RPC response format was invalid');
						error.name = 'InvalidPeerResponseError';
						reject(error);
					},
				);
			},
		);
	}

	public async fetchPeers(): Promise<ReadonlyArray<P2PPeerInfo>> {
		try {
			const response: P2PResponsePacket = await this.request({
				procedure: REMOTE_RPC_GET_ALL_PEERS_LIST,
			});

			return validatePeerInfoList(response.data);
		} catch (error) {
			throw new RPCResponseError(
				`Error when fetching peerlist of a peer`,
				error,
				this.ipAddress,
				this.wsPort,
			);
		}
	}

	// Format the node info so that it will be valid from the perspective of both new and legacy nodes.
	private _convertNodeInfoToLegacyFormat(nodeInfo: P2PNodeInfo): ProtocolNodeInfo {
		return {
			...nodeInfo,
			wsPort: nodeInfo.wsPort,
			broadhash: nodeInfo.options ? nodeInfo.options.broadhash as string : '',
			nonce: nodeInfo.options ? nodeInfo.options.nonce as string : '',
		};
	};

	private _createOutboundSocket(): SCClientSocket {
		const legacyNodeInfo = this._nodeInfo ? this._convertNodeInfoToLegacyFormat(this._nodeInfo) : undefined;

		const outboundSocket = socketClusterClient.create({
			hostname: this._ipAddress,
			port: this._wsPort,
			query: querystring.stringify(legacyNodeInfo),
			autoConnect: false,
		});

		this._bindHandlersToOutboundSocket(outboundSocket);

		return outboundSocket;
	}

	// All event handlers for the outbound socket should be bound in this method.
	private _bindHandlersToOutboundSocket(outboundSocket: SCClientSocket): void {
		outboundSocket.on('connect', () => {
			this.emit(EVENT_CONNECT_OUTBOUND, this._peerInfo);
		});

		outboundSocket.on('connectAbort', () => {
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, this._peerInfo);
		});

		outboundSocket.on('close', (code, reason) => {
			this.emit(EVENT_DISCONNECT_OUTBOUND, {
				code,
				reason,
			});
		});
	}

	// All event handlers for the outbound socket should be unbound in this method.
	/* tslint:disable-next-line:prefer-function-over-method*/
	private _unbindHandlersFromOutboundSocket(
		outboundSocket: SCClientSocket,
	): void {
		outboundSocket.off();
	}

	// All event handlers for the inbound socket should be bound in this method.
	private _bindHandlersToInboundSocket(inboundSocket: SCServerSocket): void {
		inboundSocket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.on(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
	}

	// All event handlers for the inbound socket should be unbound in this method.
	private _unbindHandlersFromInboundSocket(
		inboundSocket: SCServerSocket,
	): void {
		inboundSocket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.off(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
	}

	public static constructPeerIdFromPeerInfo(peerInfo: P2PPeerInfo): string {
		return `${peerInfo.ipAddress}:${peerInfo.wsPort}`;
	}

	private _handlePeerInfo(request: P2PRequest): void {
		// Update peerInfo with the latest values from the remote peer.
		try {
			const protocolPeerInfo = {...request.data, ip: this._ipAddress};
			const newPeerInfo = validatePeerInfo(protocolPeerInfo);
			this.updatePeerInfo(newPeerInfo);
		} catch (error) {
			this.emit(EVENT_FAILED_PEER_INFO_UPDATE, error);
			request.error(error);

			return;
		}

		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);
		request.end();
	}
}
