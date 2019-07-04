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

export interface P2PPacket {
	readonly data?: unknown;
}

export interface P2PRequestPacket extends P2PPacket {
	readonly data?: unknown;
	readonly procedure: string;
}

export interface P2PResponsePacket extends P2PPacket {
	readonly data: unknown;
}

export interface P2PMessagePacket extends P2PPacket {
	readonly data?: unknown;
	readonly event: string;
}

export interface P2PPenalty {}

export interface P2PPeerInfo {
	readonly ipAddress: string;
	readonly wsPort: number;
}

export interface P2PDiscoveredPeerInfo extends P2PPeerInfo {
	readonly height: number;
	readonly updatedAt?: Date;
	readonly os?: string;
	readonly version: string;
	readonly protocolVersion: string;
	// tslint:disable-next-line: no-mixed-interface
	readonly [key: string]: unknown;
}

// P2PPeerInfo and P2PNodeInfo are related.
// P2PNodeInfo is the outbound info from our node.
export interface P2PNodeInfo {
	readonly os: string;
	readonly version: string;
	readonly protocolVersion: string;
	readonly nethash: string;
	readonly wsPort: number;
	readonly height: number;
	// tslint:disable-next-line: no-mixed-interface
	readonly [key: string]: unknown;
}

export interface P2PClosePacket {
	readonly peerInfo: P2PDiscoveredPeerInfo;
	readonly code: number;
	readonly reason?: string;
}

export interface P2PConfig {
	readonly blacklistedPeers?: ReadonlyArray<P2PPeerInfo>;
	readonly connectTimeout?: number;
	readonly ackTimeout?: number;
	readonly hostAddress?: string;
	readonly seedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly triedPeers?: ReadonlyArray<P2PDiscoveredPeerInfo>;
	readonly nodeInfo: P2PNodeInfo;
	readonly wsEngine?: string;
	readonly discoveryInterval?: number;
	readonly peerSelectionForSend?: P2PPeerSelectionForSendFunction;
	readonly peerSelectionForRequest?: P2PPeerSelectionForRequestFunction;
	readonly peerSelectionForConnection?: P2PPeerSelectionForConnectionFunction;
	readonly peerHandshakeCheck?: P2PCheckPeerCompatibility;
	readonly sendPeerLimit?: number;
}

// Network info exposed by the P2P library.
export interface P2PNetworkStatus {
	readonly newPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;
	readonly triedPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;
	readonly connectedPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;
}

// TODO later: Switch to LIP protocol format.
// This is a representation of the outbound peer object according to the current protocol.
export interface ProtocolNodeInfo {
	readonly broadhash: string;
	readonly nethash: string;
	readonly height: number;
	readonly nonce: string;
	readonly os?: string;
	readonly version: string;
	readonly wsPort: number;
	readonly httpPort: number;
	// tslint:disable-next-line:no-mixed-interface
	readonly [key: string]: unknown;
}

export interface P2PPeerSelectionForSendInput {
	readonly peers: ReadonlyArray<P2PDiscoveredPeerInfo>;
	readonly nodeInfo?: P2PNodeInfo;
	readonly peerLimit?: number;
	readonly messagePacket?: P2PMessagePacket;
}

export type P2PPeerSelectionForSendFunction = (
	input: P2PPeerSelectionForSendInput,
) => ReadonlyArray<P2PDiscoveredPeerInfo>;

export interface P2PPeerSelectionForRequestInput {
	readonly peers: ReadonlyArray<P2PDiscoveredPeerInfo>;
	readonly nodeInfo?: P2PNodeInfo;
	readonly peerLimit?: number;
	readonly requestPacket?: P2PRequestPacket;
}

export type P2PPeerSelectionForRequestFunction = (
	input: P2PPeerSelectionForRequestInput,
) => ReadonlyArray<P2PDiscoveredPeerInfo>;

export interface P2PPeerSelectionForConnectionInput {
	readonly peers: ReadonlyArray<P2PDiscoveredPeerInfo>;
	readonly nodeInfo?: P2PNodeInfo;
}

export type P2PPeerSelectionForConnectionFunction = (
	input: P2PPeerSelectionForConnectionInput,
) => ReadonlyArray<P2PDiscoveredPeerInfo>;

export interface P2PCompatibilityCheckReturnType {
	readonly success: boolean;
	readonly errors?: string[];
}

export type P2PCheckPeerCompatibility = (
	headers: P2PDiscoveredPeerInfo,
	nodeInfo: P2PNodeInfo,
) => P2PCompatibilityCheckReturnType;

// This is a representation of the inbound peer object according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerInfo {
	readonly ip: string;
	readonly broadhash: string;
	readonly height: number;
	readonly nonce: string;
	readonly os?: string;
	readonly version: string;
	readonly protocolVersion: string;
	readonly wsPort: number;
	readonly httpPort?: number;
	// tslint:disable-next-line: no-mixed-interface
	readonly [key: string]: unknown;
}

// This is a representation of the peer list according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerInfoList {
	readonly peers: ReadonlyArray<ProtocolPeerInfo>;
	readonly success: boolean;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolRPCRequestPacket {
	readonly data: unknown;
	readonly procedure: string;
	readonly type: string;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolMessagePacket {
	readonly data: unknown;
	readonly event: string;
}
