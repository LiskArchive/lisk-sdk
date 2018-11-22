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

export interface IPeerConfig {
	readonly clock?: Date;
	readonly httpPort?: number;
	readonly ip: string;
	readonly os?: string;
	readonly state?: number;
	readonly version?: string;
	readonly wsPort: number;
}

export class Peer {
	private ip: string;
	private wsPort: number;

	public constructor(peerConfig: IPeerConfig) {
		this.ip = peerConfig.ip;
		this.wsPort = peerConfig.wsPort;
	}

	public getIp(): string {
		return this.ip;
	}
	public getWsPort(): number {
		return this.wsPort;
	}
	public setIp(ip: string): void {
		this.ip = ip;
	}
	public setWsPort(wsPort: number): void {
		this.wsPort = wsPort;
	}
}
