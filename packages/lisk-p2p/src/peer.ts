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
import { PeerState } from './p2p_types';

// TODO: Use to create outbound socket connection inside peer object.
// TODO: const socketClusterClient = require('socketcluster-client');

export interface IPeerConfig {
	readonly clock?: Date;
	readonly height: number;
	readonly id: string;
	readonly inboundSocket?: any; // TODO: Type SCServerSocket
	readonly ipAddress: string;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: number;
}

export class Peer {
	private _height: number;
	private readonly _id: string;
	private readonly _inboundSocket: any;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;

	public constructor(peerConfig: IPeerConfig) {
		this._id = peerConfig.id;
		this._ipAddress = peerConfig.ipAddress;
		this._wsPort = peerConfig.wsPort;
		this._inboundSocket = peerConfig.inboundSocket;
		this._height = peerConfig.height;
	}

	public get height(): number {
		return this._height;
	}

	public set height(value: number) {
		this._height = value;
	}

	public get id(): string {
		return this._id;
	}

	public get ipAddress(): string {
		return this._ipAddress;
	}

	// TODO: Return BANNED when appropriate.
	public get state(): PeerState {
		if (this._inboundSocket.state === this._inboundSocket.OPEN) {
			return PeerState.CONNECTED;
		}

		return PeerState.DISCONNECTED;
	}

	public get wsPort(): number {
		return this._wsPort;
	}
}
