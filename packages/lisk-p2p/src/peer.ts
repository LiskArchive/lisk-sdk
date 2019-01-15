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
import { RPCResponseError } from './errors';

import {
	P2PMessagePacket,
	P2PNodeInfo,
	P2PRequestPacket,
	P2PResponsePacket,
	ProtocolMessage,
	ProtocolRPCRequest,
} from './p2p_types';

import socketClusterClient, { SCClientSocket } from 'socketcluster-client';
import { SCServerSocket } from 'socketcluster-server';
import { processPeerListFromResponse } from './response_handler_sanitization';

// Local emitted events.
export const EVENT_UPDATED_PEER_INFO = 'updatedPeerInfo';
export const EVENT_INVALID_REQUEST_RECEIVED = 'invalidRequestReceived';
export const EVENT_REQUEST_RECEIVED = 'requestReceived';
export const EVENT_INVALID_MESSAGE_RECEIVED = 'invalidMessageReceived';
export const EVENT_MESSAGE_RECEIVED = 'requestReceived';

// Remote event or RPC names sent to or received from peers.
export const REMOTE_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_EVENT_SEND_NODE_INFO = 'updateMyself';
export const REMOTE_RPC_GET_ALL_PEERS_LIST = 'list';

export interface PeerInfo {
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly clock?: Date;
	readonly height: number;
	readonly os?: string;
	readonly version?: string;
}

export enum ConnectionState {
	CONNECTING = 0,
	CONNECTED = 1,
	DISCONNECTED = 2,
}

export interface PeerConnectionState {
	readonly inbound: ConnectionState;
	readonly outbound: ConnectionState;
}

export class Peer extends EventEmitter {
	private readonly _id: string;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private readonly _height: number;
	private _peerInfo: PeerInfo;
	private _nodeInfo: P2PNodeInfo | undefined;
	private _inboundSocket: SCServerSocket | undefined;
	private _outboundSocket: SCClientSocket | undefined;
	private readonly _handleRPC: (packet: unknown) => void;
	private readonly _handleMessage: (packet: unknown) => void;

	public constructor(peerInfo: PeerInfo, inboundSocket?: SCServerSocket) {
		super();
		this._peerInfo = peerInfo;
		this._ipAddress = peerInfo.ipAddress;
		this._wsPort = peerInfo.wsPort;
		this._id = Peer.constructPeerId(this._ipAddress, this._wsPort);
		this._inboundSocket = inboundSocket;
		if (this._inboundSocket) {
			this._startListeningForRPCs(this._inboundSocket);
			this._startListeningForMessages(this._inboundSocket);
		}
		this._height = peerInfo.height ? peerInfo.height : 0;

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleRPC = (packet: unknown) => {
			// TODO later: Switch to LIP protocol format.
			// TODO ASAP: Move validation/sanitization to response_handler_sanitization with other validation logic.
			const request = packet as ProtocolRPCRequest;
			if (!request || typeof request.procedure !== 'string') {
				this.emit(EVENT_INVALID_REQUEST_RECEIVED, request);

				return;
			}
			if (
				request.procedure === REMOTE_EVENT_SEND_NODE_INFO &&
				typeof request.data === 'object'
			) {
				// Internal handling of request to extract the PeerInfo.
				this._handlePeerInfo(request);
			}
			// Emit request for external use.
			this.emit(EVENT_REQUEST_RECEIVED, request);
		};

		// This needs to be an arrow function so that it can be used as a listener.
		this._handleMessage = (packet: unknown) => {
			// TODO later: Switch to LIP protocol format.
			// TODO ASAP: Move validation/sanitization to response_handler_sanitization with other validation logic.
			const message = packet as ProtocolMessage;
			if (!message || typeof message.event !== 'string') {
				this.emit(EVENT_INVALID_MESSAGE_RECEIVED, message);

				return;
			}
			this.emit(EVENT_MESSAGE_RECEIVED, message);
		};
	}

	public get height(): number {
		return this._height;
	}

	public get id(): string {
		return this._id;
	}

	public set inboundSocket(value: SCServerSocket) {
		if (this._inboundSocket) {
			this._stopListeningForRPCs(this._inboundSocket);
			this._stopListeningForMessages(this._inboundSocket);
		}
		this._inboundSocket = value;
		this._startListeningForRPCs(this._inboundSocket);
		this._startListeningForMessages(this._inboundSocket);
	}

	public get ipAddress(): string {
		return this._ipAddress;
	}

	public set outboundSocket(value: SCClientSocket) {
		this._outboundSocket = value;
	}

	public get peerInfo(): PeerInfo {
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

	public static constructPeerId(ipAddress: string, port: number): string {
		return `${ipAddress}:${port}`;
	}

	/**
	 * This is not a declared as a setter because this method will need
	 * invoke an async RPC on the socket to pass it the new node status.
	 */
	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		this.send<P2PNodeInfo>({
			event: REMOTE_EVENT_SEND_NODE_INFO,
			data: nodeInfo,
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
		if (this._inboundSocket) {
			this._inboundSocket.disconnect(code, reason);
			this._stopListeningForRPCs(this._inboundSocket);
		}
		if (this._outboundSocket) {
			this._outboundSocket.disconnect(code, reason);
		}
	}

	public send<T>(packet: P2PMessagePacket<T>): void {
		if (!this._outboundSocket) {
			this._outboundSocket = this._createOutboundSocket();
		}
		this._outboundSocket.emit(packet.event, {
			data: packet.data,
		});
	}

	public async request<T>(
		packet: P2PRequestPacket<T>,
	): Promise<P2PResponsePacket> {
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
						data: packet.params,
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

	public async fetchPeers(): Promise<ReadonlyArray<PeerInfo>> {
		try {
			const response: P2PResponsePacket = await this.request<void>({
				procedure: REMOTE_RPC_GET_ALL_PEERS_LIST,
			});

			return processPeerListFromResponse(response.data);
		} catch (error) {
			throw new RPCResponseError(
				`Error when fetching peerlist of a peer`,
				error,
				this.ipAddress,
				this.wsPort,
			);
		}
	}

	private _createOutboundSocket(): SCClientSocket {
		return socketClusterClient.create({
			hostname: this._ipAddress,
			port: this._wsPort,
			query: JSON.stringify(this._nodeInfo),
			autoConnect: false,
		});
	}

	private _handlePeerInfo(request: ProtocolRPCRequest): void {
		// Update peerInfo with the latest values from the remote peer.
		// TODO ASAP: Validate and/or sanitize the request.data as a PeerInfo object.
		/* tslint:disable:nex-line: no-object-literal-type-assertion */
		this._peerInfo = {
			...this._peerInfo,
			...request.data,
		} as PeerInfo;
		this.emit(EVENT_UPDATED_PEER_INFO, this._peerInfo);
	}

	private _startListeningForRPCs(
		socket: SCServerSocket | SCClientSocket,
	): void {
		// If an existing listener is bound, remove it.
		socket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRPC);
		socket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRPC);
	}

	private _stopListeningForRPCs(socket: SCServerSocket | SCClientSocket): void {
		socket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRPC);
	}

	private _startListeningForMessages(
		socket: SCServerSocket | SCClientSocket,
	): void {
		// If an existing listener is bound, remove it.
		socket.off(REMOTE_EVENT_RPC_REQUEST, this._handleMessage);
		socket.on(REMOTE_EVENT_RPC_REQUEST, this._handleMessage);
	}

	private _stopListeningForMessages(
		socket: SCServerSocket | SCClientSocket,
	): void {
		socket.off(REMOTE_EVENT_RPC_REQUEST, this._handleMessage);
	}
}
