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
/* tslint:disable: no-empty-interface */
export interface P2PMessagePacket {}

export interface P2PRequestPacket {}

export interface P2PResponsePacket {}

export interface P2PNodeStatus {}

export interface P2PConfig {
	readonly blacklistedPeers: ReadonlyArray<string>;
	readonly connectTimeout: number;
	readonly ipAddress?: string;
	readonly seedPeers: ReadonlyArray<string>;
	readonly wsEngine?: string;
	readonly wsPort: number;
}

export enum PeerState {
	BANNED = 0,
	DISCONNECTED = 1,
	CONNECTED = 2,
}
export interface NetworkStatus {}
