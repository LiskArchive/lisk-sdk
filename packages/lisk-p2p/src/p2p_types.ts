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
/* tslint:disable:no-empty-interface*/

export interface P2PRequestPacket<T> {
	readonly procedure: string;
	readonly params?: T;
}

export interface P2PResponsePacket {
	readonly data: unknown;
}

export interface P2PMessagePacket<T> {
	readonly event: string;
	readonly data: T;
}

export interface PeerInfo {
	readonly ipAddress: string;
	readonly wsPort: number;
}

export interface NodeInfo {
	readonly wsPort: number;
	readonly os: string;
	readonly version: string;
}

export interface P2PPenality {}

export interface P2PConfig {
	readonly blacklistedPeers: ReadonlyArray<PeerInfo>;
	readonly connectTimeout: number;
	readonly ipAddress?: string;
	readonly seedPeers: ReadonlyArray<PeerInfo>;
	readonly wsEngine?: string;
	readonly wsPort: number;
	readonly version: string;
}

export interface RPCResponsePeerInfo {
	readonly ip: string;
	readonly wsPort: number;
	readonly os: string;
	readonly version: string;
	readonly broadhash: string;
	readonly height: number;
	readonly nonce: string;
}

export interface RPCResponsePeerList {
	readonly success: boolean;
	readonly peers: ReadonlyArray<RPCResponsePeerInfo>;
}
export interface NetworkStatus {}
