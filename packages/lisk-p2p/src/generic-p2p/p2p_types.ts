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
/* tslint:disable:interface-name no-empty-interface */
export interface IP2PMessagePacket {}

export interface IP2PRequestPacket {}

export interface IP2PResponsePacket {}

export interface IP2PNodeStatus {}

export interface IP2PPenalty {}

export interface INetworkStatus {}

export interface IPeer {
	readonly getClock?: () => Date;
	readonly getHttpPort?: () => number;
	readonly getIp: () => string;
	readonly getNonce?: () => string;
	readonly getOS?: () => string;
	readonly getState?: () => number;
	readonly getVersion?: () => string;
	readonly getWsPort: () => number;
	readonly setClock?: (clock: Date) => void;
	readonly setHttpPort?: (httpPort: number) => void;
	readonly setIp: (ip: string) => void;
	readonly setNonce?: (nonce: string) => void;
	readonly setOS?: (os: string) => void;
	readonly setState?: (state: number) => void;
	readonly setVersion?: (version: string) => void;
	readonly setWsPort: (port: number) => void;
}

export interface IP2P {
	readonly applyPenalty: (penalty: IP2PPenalty) => void;
	readonly getNetworkStatus: () => INetworkStatus;
	readonly getNodeStatus: () => IP2PNodeStatus;
	readonly request: (packet: IP2PRequestPacket) => Promise<IP2PResponsePacket>;
	readonly send: (message: IP2PMessagePacket) => void;
	readonly setNodeStatus: (nodeStatus: IP2PNodeStatus) => void;
	readonly start: () => PromiseConstructorLike;
	readonly stop: () => PromiseConstructorLike;
}
