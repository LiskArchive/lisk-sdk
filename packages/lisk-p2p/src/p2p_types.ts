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

import { PeerInfo } from './peer';

export interface P2PRequestPacket<T> {
	readonly params?: T;
	readonly procedure: string;
}

export interface P2PResponsePacket {
	readonly data: unknown;
}

export interface P2PMessagePacket<T> {
	readonly data: T;
	readonly event: string;
}

export interface P2PNodeInfo {
	readonly height: number;
	readonly os: string;
	readonly version: string;
	readonly wsPort: number;
}

export interface P2PPenalty {}

export interface P2PConfig {
	readonly blacklistedPeers: ReadonlyArray<PeerInfo>;
	readonly connectTimeout: number;
	readonly hostAddress?: string;
	readonly seedPeers: ReadonlyArray<PeerInfo>;
	readonly version: string;
	readonly wsEngine?: string;
	readonly wsPort: number;
}

// Network info exposed by the P2P library.
export interface P2PNetworkStatus {
	readonly newPeers: ReadonlyArray<PeerInfo>;
	readonly triedPeers: ReadonlyArray<PeerInfo>;
	readonly connectedPeers: ReadonlyArray<PeerInfo>;
}

// This is a representation of the peer object according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerInfo {
	readonly broadhash: string;
	readonly height: number;
	readonly ip: string;
	readonly nonce: string;
	readonly os: string;
	readonly version: string;
	readonly wsPort: number;
}

// This is a representation of the peer list according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerList {
	readonly peers: ReadonlyArray<ProtocolPeerInfo>;
	readonly success: boolean;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolRPCRequest {
	readonly data: unknown;
	readonly procedure: string;
	readonly type: string;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolMessage {
	readonly data: unknown;
	readonly event: string;
}
