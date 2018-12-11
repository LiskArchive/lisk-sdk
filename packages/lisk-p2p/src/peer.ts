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
/* tslint:disable:interface-name */
import {
	P2PRequestPacket,
	P2PMessagePacket,
	P2PResponsePacket,
	NodeInfo,
} from './p2p_types';

import socketClusterClient from 'socketcluster-client';

export interface PeerConfig {
	readonly clock?: Date;
	readonly height?: number;
	readonly id: string;
	/* tslint:disable:next-line: no-any */
	readonly inboundSocket?: any; // TODO: Type SCServerSocket
	readonly ipAddress: string;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: number;
	readonly nodeInfo: NodeInfo;
}

export enum ConnectionState {
	CONNECTING = 0,
	CONNECTED = 1,
	DISCONNECTED = 2,
}

export interface PeerState {
	readonly inbound: ConnectionState;
	readonly outbound: ConnectionState;
}

interface RawResponseBody {
	readonly data: unknown;
}

export class Peer {
	private readonly _height: number;
	private readonly _id: string;
	private _inboundSocket: any;
	private _outboundSocket: any;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private readonly _nodeInfo: NodeInfo;

	public constructor(peerConfig: PeerConfig) {
		this._id = peerConfig.id;
		this._ipAddress = peerConfig.ipAddress;
		this._wsPort = peerConfig.wsPort;
		this._inboundSocket = peerConfig.inboundSocket;
		this._nodeInfo = peerConfig.nodeInfo;
		this._height = peerConfig.height === undefined ? 0 : peerConfig.height;
	}

	public connect(): void {
		const nodeInfo = this._nodeInfo;
		this._outboundSocket = socketClusterClient.create({
			hostname: this._ipAddress,
			port: this._wsPort,
			query: {
				wsPort: nodeInfo.wsPort,
				os: nodeInfo.os,
				version: nodeInfo.version, // TODO LATER: Provide nonce for compatibility with current protocol.
			},
		});
	}

	public disconnect(): void {
		return;
	}

	public async request<T>(
		packet: P2PRequestPacket<T>,
	): Promise<P2PResponsePacket> {
		return new Promise<P2PResponsePacket>(
			(resolve: (result: any) => void, reject: (result: any) => void): void => {
				// TODO LATER: Change to LIP protocol format.
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
							const rawResponse = responseData as RawResponseBody;
							resolve({
								data: rawResponse.data,
							});

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
		// TODO LATER: Change to LIP protocol format.
		this._outboundSocket.emit(packet.event, {
			data: packet.data,
		});
	}

	public get id(): string {
		return this._id;
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

	public get state(): PeerState {
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
}
