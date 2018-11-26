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
/* tslint:disable: variable-name */
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
	private _height: number;
	private readonly _ip: string;
	private _wsPort: number;

	public constructor(peerConfig: PeerConfig) {
		this._height = peerConfig.height;
		this._ip = peerConfig.ip;
		this._wsPort = peerConfig.wsPort;
	}

	public get Height(): number {
		return this._height;
	}
	public set Height(height: number) {
		this._height = height;
	}
	public get Ip(): string {
		return this._ip;
	}
	public get WsPort(): number {
		return this._wsPort;
	}
	public set WsPort(wsPort: number) {
		this._wsPort = wsPort;
	}
}
