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

export interface PeerConfig {
	readonly clock?: Date;
	readonly height: number;
	readonly httpPort?: number;
	readonly ip: string;
	readonly os?: string;
	readonly state?: number;
	readonly version?: string;
	readonly wsPort: number;
}

export class Peer {
	private height: number;
	private readonly ip: string;
	private wsPort: number;

	public constructor(peerConfig: PeerConfig) {
		this.height = peerConfig.height;
		this.ip = peerConfig.ip;
		this.wsPort = peerConfig.wsPort;
	}

	public get Height(): number {
		return this.height;
	}
	public set Height(height: number) {
		this.height = height;
	}
	public get Ip(): string {
		return this.ip;
	}
	public get WsPort(): number {
		return this.wsPort;
	}
	public set WsPort(wsPort: number) {
		this.wsPort = wsPort;
	}
}
