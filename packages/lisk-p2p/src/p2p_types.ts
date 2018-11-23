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

export interface ILogger {
	readonly error: (message: string) => void;
	readonly info: (message: string) => void;
	readonly log: (message: string) => void;
	readonly trace: (message: string) => void;
	readonly warn: (message: string) => void;
}

// ---- Start IP2PConfig interfaces ----

export interface IP2PConfigPeersAccess {
	readonly blacklist: ReadonlyArray<string>;
}

export interface IP2PConfigPeersOptions {
	readonly broadhashConsensusCalculationInterval: number;
	readonly timeout: number;
	readonly wsEngine: string;
}

export interface IP2PConfigPeers {
	readonly access: IP2PConfigPeersAccess;
	readonly enabled: boolean;
	readonly list: ReadonlyArray<string>;
	readonly options: IP2PConfigPeersOptions;
}

export interface IP2PConfig {
	readonly logger?: ILogger;
	readonly peers: IP2PConfigPeers;
}

// ---- End IP2PConfig interfaces ----

export interface IP2PPenalty {}

export interface INetworkStatus {}

export enum PeerState {
	BANNED = 0,
	DISCONNECTED = 1,
	CONNECTED = 2,
}
