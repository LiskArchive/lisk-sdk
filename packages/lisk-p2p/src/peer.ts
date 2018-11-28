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
/* tslint:disable:interface-name variable-name */
import { PeerState } from './p2p_types';

// TODO: Use to create outbound socket connection inside peer object.
// TODO: const socketClusterClient = require('socketcluster-client');

export interface PeerConfig {
	readonly clock?: Date;
	readonly height: number;
	readonly id: string;
	/* tslint:disable:next-line: no-any */
	readonly inboundSocket?: any; // TODO: Type SCServerSocket
	readonly ipAddress: string;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: number;
}

export class Peer {
	private readonly _height: number;
	private readonly _id: string;
	private readonly _inboundSocket: any;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;

	public constructor(peerConfig: PeerConfig) {
		this._id = peerConfig.id;
		this._ipAddress = peerConfig.ipAddress;
		this._wsPort = peerConfig.wsPort;
		this._inboundSocket = peerConfig.inboundSocket;
		this._height = peerConfig.height;
	}
	// TODO: Return BANNED when appropriate.
	public get state(): PeerState {
		if (this._inboundSocket.state === this._inboundSocket.OPEN) {
			return PeerState.CONNECTED;
		}

		return PeerState.DISCONNECTED;
	}

	public get height(): number {
		return this._height;
	}

	public get id(): string {
		return this._id;
	}

	public get inboundSocket(): any {
		return this._inboundSocket;
	}

	public get ipAddress(): any {
		return this._ipAddress;
	}

	public get wsPort(): any {
		return this._wsPort;
	}
}
