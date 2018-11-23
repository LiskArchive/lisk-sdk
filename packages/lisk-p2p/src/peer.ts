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
import { ILogger, PeerState } from './p2p_types';

// TODO: Use to create outbound socket connection inside peer object.
// TODO: const socketClusterClient = require('socketcluster-client');

export interface IPeerConfig {
	readonly clock?: Date;
	readonly height: number;
	readonly httpPort?: number;
	readonly id: string;
	readonly inboundSocket?: any; // TODO: Type SCServerSocket
	readonly ip: string;
	readonly logger: ILogger;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: number;
}

export class Peer {
	private height: number;
	private readonly id: string;
	private readonly inboundSocket: any;
	private readonly ip: string;
	private readonly wsPort: number;

	public constructor(peerConfig: IPeerConfig) {
		this.id = peerConfig.id;
		this.ip = peerConfig.ip;
		this.wsPort = peerConfig.wsPort;
		this.inboundSocket = peerConfig.inboundSocket;
		this.height = peerConfig.height;
	}

	public getHeight(): number {
		return this.height;
	}

	public getId(): string {
		return this.id;
	}

	public getIp(): string {
		return this.ip;
	}

	// TODO: Return BANNED when appropriate.
	public getState(): PeerState {
		if (this.inboundSocket.state === this.inboundSocket.OPEN) {
			return PeerState.CONNECTED;
		}

		return PeerState.DISCONNECTED;
	}

	public getWsPort(): number {
		return this.wsPort;
	}

	public setHeight(height: number): void {
		this.height = height;
	}
}
