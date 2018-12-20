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
	P2PRequestPacket,
	P2PMessagePacket,
	P2PResponsePacket,
	P2PNodeStatus,
} from './p2p_types';

import socketClusterClient from 'socketcluster-client';

export interface PeerConfig {
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly nodeStatus?: P2PNodeStatus; // TODO DELEEETETETE
	readonly clock?: Date;
	readonly height?: number;
	readonly inboundSocket?: any; // TODO: Type SCServerSocket
	readonly os?: string;
	readonly outboundSocket?: any; // TODO: Type SCServerSocket
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

export class Peer {
	private readonly _id: string;
	private readonly _peerConfig: PeerConfig;
	private readonly _height: number;
	private _inboundSocket: any;
	private _outboundSocket: any;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private _nodeStatus: P2PNodeStatus | undefined;

	public constructor(peerConfig: PeerConfig) {
		this._peerConfig = peerConfig;
		this._ipAddress = peerConfig.ipAddress;
		this._wsPort = peerConfig.wsPort;
		this._id = Peer.constructPeerId(this._ipAddress, this._wsPort);
		this._inboundSocket = peerConfig.inboundSocket;
		this._height = peerConfig.height ? peerConfig.height : 0;
	}

	private _createOutboundSocket(): any {
		if (!this._outboundSocket) {
			this._outboundSocket = socketClusterClient.create({
				hostname: this._ipAddress,
				port: this._wsPort,
				query: this._nodeStatus,
				autoConnect: false,
			});
		}
	}

	public connect(): void {
		this._createOutboundSocket();
		this._outboundSocket.connect();
	}

	public disconnect(code: number = 1000, reason?: string): void {
		if (this._inboundSocket) {
			this._inboundSocket.disconnect(code, reason);
		}
		if (this._outboundSocket) {
			this._outboundSocket.disconnect(code, reason);
		}
	}

	public async request<T>(
		packet: P2PRequestPacket<T>,
	): Promise<P2PResponsePacket> {
		return new Promise<P2PResponsePacket>(
			(
				resolve: (result: P2PResponsePacket) => void,
				reject: (result: Error) => void,
			): void => {
				this._createOutboundSocket();
				this._outboundSocket.emit(
					'rpc-request',
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

	public send<T>(packet: P2PMessagePacket<T>): void {
		this._createOutboundSocket();
		this._outboundSocket.emit(packet.event, {
			data: packet.data,
		});
	}

	public get peerConfig(): PeerConfig {
		return this._peerConfig;
	}

	public get id(): string {
		return this._id;
	}

	/**
	 * This is not a declared as a setter because this method will need
	 * invoke an async RPC on the socket to pass it the new node status.
	 */
	public applyNodeStatus(value: P2PNodeStatus | undefined): void {
		this._nodeStatus = value;
	}

	public get nodeStatus(): P2PNodeStatus | undefined {
		return this._nodeStatus;
	}

	public set inboundSocket(value: any) {
		this._inboundSocket = value;
	}

	public get inboundSocket(): any {
		return this._inboundSocket;
	}

	public set outboundSocket(value: any) {
		this._outboundSocket = value;
	}

	public get outboundSocket(): any {
		return this._outboundSocket;
	}

	public get height(): number {
		return this._height;
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

	public get ipAddress(): string {
		return this._ipAddress;
	}

	public get wsPort(): number {
		return this._wsPort;
	}

	public static constructPeerId(ipAddress: string, port: number): string {
		return `${ipAddress}:${port}`;
	}
}
