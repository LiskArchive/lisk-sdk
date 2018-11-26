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

export interface P2PConfig {
	readonly blacklistedPeers: ReadonlyArray<string>;
	readonly connectTimeout: number;
	readonly seedPeers: ReadonlyArray<string>;
	readonly wsEngine: string;
}

export interface IP2PPenalty {}

export interface INetworkStatus {}

export enum PeerState {
	BANNED = 0,
	DISCONNECTED = 1,
	CONNECTED = 2,
}
