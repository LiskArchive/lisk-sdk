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

import { RPCResponseError } from './errors';
import {
	P2PMessagePacket,
	P2PNodeStatus,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';

import { create, SCClientSocket } from 'socketcluster-client';
import { SCServerSocket } from 'socketcluster-server';
import { processPeerListFromResponse } from './response_handler_sanitization';

export interface PeerInfo {
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly nodeStatus?: P2PNodeStatus; // TODO DELEEETETETE
	readonly clock?: Date;
	readonly height: number;
	readonly os: string;
	readonly version: string;
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

const GET_ALL_PEERS_LIST_RPC = 'list';

export class Peer {
	private readonly _id: string;
	private readonly _peerInfo: PeerInfo;
	private readonly _height: number;
	private _inboundSocket: SCServerSocket | undefined;
	private _outboundSocket: SCClientSocket | undefined;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private _nodeStatus: P2PNodeStatus | undefined;

	public constructor(peerInfo: PeerInfo, inboundSocket?: SCServerSocket) {
		this._peerInfo = peerInfo;
		this._ipAddress = peerInfo.ipAddress;
		this._wsPort = peerInfo.wsPort;
		this._id = Peer.constructPeerId(this._ipAddress, this._wsPort);
		this._inboundSocket = inboundSocket;
		this._height = peerInfo.height ? peerInfo.height : 0;
	}

	private _createOutboundSocket(): SCClientSocket {
		const query = JSON.stringify(this._nodeStatus);

		return create({
			hostname: this._ipAddress,
			port: this._wsPort,
			query,
			autoConnect: false,
		});
	}

	public connect(): void {
		if (!this.outboundSocket) {
			this.outboundSocket = this._createOutboundSocket();
		}

		this.outboundSocket.connect();
	}

	public disconnect(code: number = 1000, reason?: string): void {
		if (this.inboundSocket) {
			this.inboundSocket.disconnect(code, reason);
		}
		if (this.outboundSocket) {
			this.outboundSocket.disconnect(code, reason);
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
				if (!this.outboundSocket) {
					this.outboundSocket = this._createOutboundSocket();
				}
				this.outboundSocket.emit(
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

	public async fetchPeers(): Promise<ReadonlyArray<PeerInfo>> {
		try {
			const response: P2PResponsePacket = await this.request<void>({
				procedure: GET_ALL_PEERS_LIST_RPC,
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

	public send<T>(packet: P2PMessagePacket<T>): void {
		if (this.outboundSocket) {
			this.outboundSocket.emit(packet.event, {
				data: packet.data,
			});
		} else {
			this.outboundSocket = this._createOutboundSocket();
			this.outboundSocket.emit(packet.event, {
				data: packet.data,
			});
		}
	}

	public get peerInfo(): PeerInfo {
		return this._peerInfo;
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

	public set inboundSocket(value: SCServerSocket | undefined) {
		this._inboundSocket = value;
	}

	public get inboundSocket(): SCServerSocket | undefined {
		return this._inboundSocket;
	}

	public set outboundSocket(value: SCClientSocket | undefined) {
		this._outboundSocket = value;
	}

	public get outboundSocket(): SCClientSocket | undefined {
		return this._outboundSocket;
	}

	public get height(): number {
		return this._height;
	}

	public get state(): PeerConnectionState {
		const inbound = this.inboundSocket
			? this.inboundSocket.state === this.inboundSocket.OPEN
				? ConnectionState.CONNECTED
				: ConnectionState.DISCONNECTED
			: ConnectionState.DISCONNECTED;
		const outbound = this.outboundSocket
			? this.outboundSocket.state === this.outboundSocket.OPEN
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
